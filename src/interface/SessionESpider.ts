import {BaseESpider} from "./BaseESpider";
import {SessionItem, SessionSpiderOptions} from "../typings";
import {AxiosSessionInstance, AxiosSessionRequestConfig, createAxiosSession} from "@biggerstar/axios-session";
import {interceptorsSpider} from "../functions/interceptorsSpider";
import {getRandomItemForArray} from "../utils/methods";

export abstract class SessionESpider<Options extends SessionSpiderOptions> extends BaseESpider<Options> {
  private sessionList: Array<SessionItem> = []
  private _listeningTimer: NodeJS.Timeout   // 轮询队列的时间周期

  protected constructor() {
    super();
    Object.assign(this.options, <SessionSpiderOptions>{
      expirationSessionTime: 5 * 60 * 1000,
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
  public removeSession(session: string | AxiosSessionInstance) {
    const sessionId = typeof session === 'string' ? session : session.sessionId
    const foundIndex = this.sessionList
      .findIndex(item => item.session.sessionId === sessionId)
    if (foundIndex) this.sessionList.splice(foundIndex, 1)
  }

  /** 开始监听各项数据，自动管理添加各种东西 */
  private _startListening(): void {
    if (this._running) return
    const removeExpirationSession = () => {
      this.sessionList = this.sessionList
        .filter(item => (Date.now() - item.lastUsageTime) < this.options.expirationSessionTime)
    }
    const createNewSession = () => {
      const sessionVacancy = this.requestQueue.concurrency - this.sessionList.length
      for (let i = 0; i < sessionVacancy; i++) {
        const session = createAxiosSession()
        this.sessionList.push({
          pending: false,
          session,
          lastUsageTime: Date.now()
        })
        interceptorsSpider(this, session)
        this._callMiddleware('onCreateSession', this, null, async (cb) => await cb.call(this, session)).then()
      }
      if (this.sessionList.length > this.requestQueue.concurrency) {
        throw new Error('当前的 session 列表超出并发数量，请检查是否在适当的地方使用 this.removeSession 移除没用的 session')
      }
    }
    const addNewTask = () => {
      const queueVacancy = this.requestQueue.concurrency - this.requestQueue.pending - this.requestQueue.size
      const availableSessionList = this.sessionList.filter(session => !session.pending)
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
      patchSessionList.forEach((session) => this.doRequest(session))
    }
    const listening = () => {
      removeExpirationSession()
      createNewSession()
      addNewTask()
    }
    this._listeningTimer = setInterval(() => listening(), Math.min(500, this.options.queueCheckInterval))
  }

  public async pause(): Promise<void> {
    await super.pause();
    clearInterval(this._listeningTimer)
  }

  public async close(): Promise<void> {
    await super.close();
    clearInterval(this._listeningTimer)
  }

  public async start(): Promise<void> {
    await super.start();
    this._startListening()
  }

  public async doRequest<T extends AxiosSessionRequestConfig>(session: AxiosSessionInstance, req: Partial<T> | string | void) {
    throw new Error('请实现 doRequest 函数')
  }
}
