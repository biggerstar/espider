import {SpiderMiddleware} from "../typings/SpiderMiddleware";
import PQueue from "p-queue";
import {BaseESpiderOptions, ESpiderEventNames} from "../typings";
import {isNumber} from "lodash-es";
import {RequestDupeFilter} from "./RequestFilter";
import {sleep} from "../utils/methods";


export abstract class BaseESpider<Options extends BaseESpiderOptions> extends SpiderMiddleware {
  [key: `@${string}`]: () => SpiderMiddleware

  public declare name: string
  public readonly requestQueue: PQueue
  public readonly dbQueue: PQueue
  public readonly middleware: Record<string, SpiderMiddleware>
  public readonly options: Options
  public readonly fingerprint: RequestDupeFilter
  protected abstract _running: boolean
  protected abstract _closed: boolean
  protected abstract _initialized: boolean

  protected constructor() {
    super();
    const _this = this
    this.requestQueue = new PQueue({
      interval: 0
    })
    this.dbQueue = new PQueue()
    this.middleware = {}
    this.options = {} as any
    this.fingerprint = new RequestDupeFilter()
    const descriptors = Object.getOwnPropertyDescriptors(this.constructor.prototype)
    Object.keys(descriptors)
      .filter(keyName => keyName.startsWith('@'))
      .forEach(name => this.middleware[name.slice(1)] = this[name]())
    const oldAdd = this.requestQueue.add
    this.requestQueue.add = async function () {  // 重写add 函数进行支持请求间隔
      const res = oldAdd.apply(this, arguments)
      await sleep(_this.options.requestInterval)
      return res
    }
  }

  /**
   * 回调的中间件和主蜘蛛实例事件
   * */
  async _callMiddleware(type: ESpiderEventNames, spider: BaseESpider<BaseESpiderOptions>, matchUrl: string | null, callback: (cb: Function) => Promise<any>) {
    let middlewares = []
    if (matchUrl) {
      middlewares = Object.keys(spider.middleware)
        .filter((name) => (new RegExp(name)).test(matchUrl))
        .map(matchUrl => spider.middleware[matchUrl])
        .filter(middleware => typeof middleware[type] === 'function')
    }
    if (typeof spider[type] === 'function') {  // 主蜘蛛回调
      await callback(spider[type].bind(spider))
    }
    for (const middleware of middlewares) {  // 中间件回调, 支持回调的函数名比主蜘蛛少
      await callback(middleware[type].bind(middleware))
    }
  }

  public setOptions(opt: Partial<BaseESpiderOptions>) {
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
  }

  /**
   * 暂停爬虫
   * */
  public async pause(): Promise<void> {
    this.fingerprint.closeAutoPersistence()
    this.requestQueue.pause()
    this.dbQueue.pause()
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
      ...this.options,
      ...this.options.dupeFilterOptions,
    })
    this.fingerprint.start()
    this.requestQueue.start()
    this.dbQueue.start()
  }

  /**
   * 添加到数据库操作队列
   * */
  public addToDatabaseQueue(callback: Function): void {
    if (typeof callback !== 'function') {
      throw new Error(`[addToDatabaseQueue] 入参应该是一个函数`)
    }
    this.dbQueue.add(() => callback()).then()
  }
}

