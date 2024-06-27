import {
  AxiosSessionInstance,
  AxiosSessionRequestConfig,
  AxiosSessionResponse,
  createAxiosSession
} from "@biggerstar/axios-session";
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

  public constructor() {
    super();
    Object.assign(this.options, <SessionESpiderInterfaceOptions>{
      expirationSessionTime: null
    })
  }

  public async pause(): Promise<boolean> {
    return await super.pause().then(isSuccess => {
      clearInterval(this._listeningTimer)
      return isSuccess
    })
  }

  public async close(): Promise<boolean> {
    return await super.close().then(isSuccess => {
      clearInterval(this._listeningTimer)
      return isSuccess
    })
  }

  public async start(): Promise<boolean> {
    return await super.start().then(isSuccess => {
      this._startListening()
      return isSuccess
    })
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
  public removeSession(session: string | AxiosSessionInstance): void {
    const sessionId = typeof session === 'string' ? session : session.sessionId
    const foundIndex = this.sessionList
      .findIndex(item => item.session.sessionId === sessionId)
    if (foundIndex) this.sessionList.splice(foundIndex, 1)
  }

  /**
   *  获取所有可用并且没在队列中等待的 session
   * */
  public getAllAvailableSessions(): SessionItem[] {
    return this.sessionList.filter(session => !session.pending)
  }

  /**
   * 随机获取一个可用并且没在队列中等待的 session
   * */
  public async getAvailableSession(): Promise<SessionItem> {
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
    const sessionInfo = {
      pending: false,
      session,
      createTime: Date.now()
    }
    this.sessionList.push()
    interceptorsSpider(<any>this, session)
    await this.middlewareManager.callRoot('onCreateSession', async (cb) => await cb.call(this, session))
    return sessionInfo
  }

  /**
   * 开始轮询监听各项数据，自动管理调度
   * */
  private _startListening(): void {
    const removeExpirationSession = () => {
      this.sessionList = this.sessionList
        .filter(item => {
          if ([null, void 0].includes(this.options.expirationSessionTime)) return true
          return (Date.now() - item.createTime) < this.options.expirationSessionTime
        })
    }

    const addNewRequest = () => {
      const sessionVacancy = this.requestQueue.concurrency - this.sessionList.length
      if (sessionVacancy <= 0) return
      this.autoLoadRequest(sessionVacancy).then()
    }

    const listening = () => {
      if (!this._initialized) return
      removeExpirationSession()
      addNewRequest()
    }
    if (this._listeningTimer) clearInterval(this._listeningTimer)
    this._listeningTimer = setInterval(() => listening(), Math.min(500, this.options.queueCheckInterval))
  }

  /**
   * 进行请求，该操作不进入队列
   * */
  public async doRequest(req: Partial<AxiosSessionRequestConfig>): Promise<AxiosSessionResponse> {
    const sessionInfo = await this.getAvailableSession()
    sessionInfo.pending = true
    const pendingRequest = sessionInfo.session.request(req)
    pendingRequest.finally(() => {
      sessionInfo.pending = false
    })
    return pendingRequest
  }
}
