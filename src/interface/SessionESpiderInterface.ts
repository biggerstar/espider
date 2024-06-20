import {AxiosSessionInstance, AxiosSessionRequestConfig, createAxiosSession} from "@biggerstar/axios-session";
import {interceptorsSpider} from "@/functions/interceptorsSpider";
import {getRandomItemForArray} from "@/utils/methods";
import {SessionESpiderInterfaceOptions, SessionItem} from "@/typings";
import {BaseESpiderInterface} from "@/interface/BaseESpiderInterface";
import {SessionESpiderInterfaceMiddleware} from "@/middleware/SpiderMiddleware";

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
  private getAllAvailableSessions() {
    return this.sessionList.filter(session => !session.pending)
  }

  /**
   * 随机获取当前可用并且没在队列中等待的 session
   * queueVacancy 是获取个数， 默认是并发队列中相对并发总数所空余的个数
   * 获取时如果 queueVacancy 要求个数超过当前 session 个数， 此时可以认为返回的是所有的 session， 并且数量少于 queueVacancy 所指定的值
   * */
  private getRandomAvailableSessions(queueVacancy?: number): AxiosSessionInstance[] {
    queueVacancy = queueVacancy || this.requestQueue.concurrency - this.requestQueue.pending - this.requestQueue.size
    const availableSessionList = this.getAllAvailableSessions()
    let patchTaskSessionNum = Math.min(queueVacancy, availableSessionList.length)
    const patchSessionList = []
    while (true) {
      if (patchSessionList.length === patchTaskSessionNum) {
        break
      }
      const session = getRandomItemForArray(availableSessionList)
      if (!patchSessionList.includes(session)) {
        patchSessionList.push(session)
      }
    }
    return patchSessionList
  }

  private async _createNewSession() {
    if (this.sessionList.length >= this.requestQueue.concurrency) {
      throw new Error('当前的 session 列表超出并发数量，请检查是否在适当的地方使用 this.removeSession 移除没用的 session')
    }
    const session = createAxiosSession()
    this.sessionList.push({
      pending: false,
      session,
      lastUsageTime: Date.now()
    })
    interceptorsSpider(this, session)
    await this.middlewareManager.callAll('onCreateSession', null, async (cb) => await cb.call(this, session))
    return session
  }

  /**
   * 开始轮询监听各项数据，自动管理调度
   * */
  private _startListening(): void {
    if (this._running) return
    const removeExpirationSession = () => {
      this.sessionList = this.sessionList
        .filter(item => {
          if (this.options.expirationSessionTime === null) return true
          return (Date.now() - item.lastUsageTime) < this.options.expirationSessionTime
        })
    }

    const addNewRequest = () => {
      const sessionVacancy = this.requestQueue.concurrency - this.sessionList.length
      this.addRequest(sessionVacancy)
        .then((requestList) => {
          return this.requestQueue.add(() => {
            const availableSessions = this.getRandomAvailableSessions(sessionVacancy)
            requestList.forEach(async (request, index) => {
              let session = availableSessions[index]
              if (!session) session = await this._createNewSession()
              const sessionInfo = this.getSession(session.sessionId)
              sessionInfo.lastUsageTime = Date.now()
              sessionInfo.pending = true
              session.request(request).then()
            })
          })
        })
    }

    const listening = () => {
      clearInterval(this._listeningTimer)
      removeExpirationSession()
      addNewRequest()
    }
    this._listeningTimer = setInterval(() => listening(), Math.min(500, this.options.queueCheckInterval))
  }

  /**
   * 根据自动调度在子类实现新任务的添加
   * len 为当前可添加的任务个数
   * */
  protected async addRequest(_: number): Promise<AxiosSessionRequestConfig[]> {
    throw new Error('请实现 addRequest 函数')
  }
}
