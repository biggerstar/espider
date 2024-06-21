import {BaseESpiderInterfaceOptions} from "@/typings";
import PQueue from "p-queue";
import {RequestDupeFilter} from "@/interface/RequestDupeFilter";
import {sleep} from "@/utils/methods";
import {isNumber} from "lodash-es";
import {MiddlewareManager} from "@/middleware/MiddlewareManager";
import {BaseESpiderInterfaceMiddleware, ESpiderUrlMatchMiddleware} from "@/middleware/SpiderMiddleware";

export abstract class BaseESpiderInterface<
  Options extends BaseESpiderInterfaceOptions,
  Middleware extends BaseESpiderInterfaceMiddleware
> extends BaseESpiderInterfaceMiddleware
  implements BaseESpiderInterfaceMiddleware {

  [key: `@${string}`]: () => ESpiderUrlMatchMiddleware

  public declare name: string
  public readonly options: Options & Record<any, any>
  protected abstract _running: boolean
  protected abstract _closed: boolean
  protected abstract _initialized: boolean
  public readonly requestQueue: PQueue
  public readonly dbQueue: PQueue
  public readonly middlewareManager: MiddlewareManager<Middleware, ESpiderUrlMatchMiddleware>
  public readonly fingerprint: RequestDupeFilter

  protected constructor() {
    super();
    const _this = this
    this.requestQueue = new PQueue({
      interval: 0
    })
    this.dbQueue = new PQueue()
    this.middlewareManager = new MiddlewareManager(this)
    this.options = {} as any
    Object.assign(this.options, <BaseESpiderInterfaceOptions>{
      name: '',
      cacheDirPath: `./.cache`,
      queueCheckInterval: 500,
      dbQueueTimeout: 12000,
      requestQueueTimeout: 12000,
      dbQueueConcurrency: 1,
      requestConcurrency: 1,
      requestInterval: 0,
    })
    this.fingerprint = new RequestDupeFilter()
    const oldAdd = this.requestQueue.add
    this.requestQueue.add = async function () {  // 重写add 函数进行支持请求间隔
      const res = oldAdd.apply(this, arguments)
      await sleep(_this.options.requestInterval)
      return res
    }
    /*---------------------提取主爬虫事件钩子------------------------*/
    const descriptors = Object.getOwnPropertyDescriptors(this.constructor.prototype)
    Object.keys(descriptors)
      .filter(keyName => keyName.startsWith('@'))
      .forEach(name => this.middlewareManager.addMiddleware(name.slice(1), this[name]()))
    this.middlewareManager.addRootMiddleware(<any>this)
  }

  public setOptions(opt: Partial<BaseESpiderInterfaceOptions>) {
    Object.assign(this.options, opt)
    if (isNumber(opt.dbQueueConcurrency)) this.dbQueue.concurrency = opt.dbQueueConcurrency
    if (isNumber(opt.requestConcurrency)) this.requestQueue.concurrency = opt.requestConcurrency
    if (isNumber(opt.dbQueueTimeout)) this.dbQueue.timeout = opt.dbQueueTimeout
    if (isNumber(opt.requestQueueTimeout)) this.requestQueue.timeout = opt.requestQueueTimeout
  }

  /**
   * 关闭爬虫
   * */
  public async close(): Promise<void> {
    this.fingerprint.closeAutoPersistence()
    this.requestQueue.clear()
    this.dbQueue.clear()
    await this.middlewareManager.callRoot('onClose')
  }

  /**
   * 暂停爬虫
   * */
  public async pause(): Promise<void> {
    this.fingerprint.closeAutoPersistence()
    this.requestQueue.pause()
    this.dbQueue.pause()
    await this.middlewareManager.callRoot('onPause')
  }

  /**
   * 开始爬虫, 爬虫入口
   * */
  public async start(): Promise<void> {
    if (!this.name) {
      throw new Error('请指定爬虫名称 name')
    }
    this.options.name = this.name
    this.setOptions(this.options)
    this.fingerprint.setOptions({
      name: this.options.name || this.name,
      cacheDirPath: this.options.cacheDirPath,
      ...this.options.dupeFilterOptions,
    })
    this.fingerprint.start()
    this.requestQueue.start()
    this.dbQueue.start()
    await this.middlewareManager.callRoot('onStart')
  }

  /**
   * 添加到数据库操作队列
   * */
  public addToDatabaseQueue(callback: Function): void {
    if (typeof callback !== 'function') {
      throw new Error(`[addToDatabaseQueue] 入参应该是一个函数`)
    }
    this.dbQueue.add(() => callback.call(this)).then()
  }
}

