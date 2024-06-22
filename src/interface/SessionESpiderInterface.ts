import {AxiosSessionInstance, AxiosSessionRequestConfig, createAxiosSession} from "@biggerstar/axios-session";
import {interceptorsSpider} from "@/functions/interceptorsSpider";
import {SessionESpiderInterfaceOptions, SessionItem} from "@/typings";
import {BaseESpiderInterface} from "@/interface/BaseESpiderInterface";
import {SessionESpiderInterfaceMiddleware} from "@/middleware/SpiderMiddleware";
import {choice} from "@biggerstar/tools";

export abstract class SessionESpiderInterface<
  Options extends SessionESpiderInterfaceOptions = SessionESpiderInterfaceOptions,
  Middleware extends SessionESpiderInterfaceMiddleware = SessionESpiderInterfaceMiddleware
> extends BaseESpiderInterface<Options, Middleware>
  implements SessionESpiderInterfaceMiddleware {

  protected sessionList: Array<SessionItem> = []
  private _listeningTimer: NodeJS.Timeout   // 轮询队列的时间周期
  declare public readonly options: Options & Record<any, any>

  protected constructor() {
    super();
    Object.assign(this.options, <SessionESpiderInterfaceOptions>{
      expirationSessionTime: null
    })
  }

  public async pause(): Promise<void> {
    clearInterval(this._listeningTimer)
    await super.pause();
  }

  public async close(): Promise<void> {
    clearInterval(this._listeningTimer)
    await super.close();
  }

  public async start(): Promise<void> {
    this._startListening()
    await super.start();
  }

  /**
   * 获取当前管理调度中的 session
   * */
  public getSession(id: string): SessionItem | null {
    return this.sessionList.find(item => item.session.sessionId === id) || null
  }

  /**
   * 移除当前的 session
   * */
  public removeSession(session: string | AxiosSessionInstance) {
    const sessionId = typeof session === 'string' ? session : session.sessionId
    const foundIndex = this.sessionList
      .findIndex(item => item.session.sessionId === sessionId)
    if (foundIndex) this.sessionList.splice(foundIndex, 1)
  }

  /**
   *  获取所有可用并且没在队列中等待的 session
   * */
  public getAllAvailableSessions() {
    return this.sessionList.filter(session => !session.pending)
  }

  /**
   * 随机获取一个可用并且没在队列中等待的 session
   * */
  public async getAvailableSession() {
    const availableSessionList = this.getAllAvailableSessions()
    if (!availableSessionList.length) {
      return this._createNewSession()
    }
    return choice(availableSessionList)
  }

  private async _createNewSession() {
    if (this.sessionList.length >= this.requestQueue.concurrency) {
      throw new Error('当前的 session 列表超出并发数量，请检查是否在适当的地方使用 this.removeSession 移除没用的 session')
    }
    const session = createAxiosSession()
    this.sessionList.push({
      pending: false,
      session,
      createTime: Date.now()
    })
    interceptorsSpider(<any>this, session)
    await this.middlewareManager.callRoot('onCreateSession', async (cb) => await cb.call(this, session))
    return session
  }

  /**
   * 开始轮询监听各项数据，自动管理调度
   * */
  private _startListening(): void {
    const removeExpirationSession = () => {
      this.sessionList = this.sessionList
        .filter(item => {
          if (this.options.expirationSessionTime === null) return true
          return (Date.now() - item.createTime) < this.options.expirationSessionTime
        })
    }

    const addNewRequest = () => {
      const sessionVacancy = this.requestQueue.concurrency - this.sessionList.length
      if (sessionVacancy <= 0) return
      this.autoLoadRequest(sessionVacancy).then()
    }

    const listening = () => {
      clearInterval(this._listeningTimer)
      removeExpirationSession()
      addNewRequest()
    }
    this._listeningTimer = setInterval(() => listening(), Math.min(500, this.options.queueCheckInterval))
  }

  /**
   * 进行请求，该操作不进入队列
   * */
  async doRequest(req: AxiosSessionRequestConfig) {
    const session = await this.getAvailableSession()
    const sessionInfo = this.getSession(session.sessionId)
    sessionInfo.pending = true
    const pendingRequest = session.request(req)
    pendingRequest.finally(() => {
      sessionInfo.pending = false
    })
    return pendingRequest
  }

  /**
   * 根据调度在子类实现新任务的自动添加
   * len 为当前可添加的任务个数
   * 该函数需要从数据库中取出一个或者多个任务，并添加到请求任务队列
   * */
  protected async autoLoadRequest(_: number) {
    throw new Error('请实现 autoLoadRequest 函数')
  }
}
