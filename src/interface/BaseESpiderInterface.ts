import {BaseESpiderInterfaceOptions} from "@/typings";
import PQueue from "p-queue";
import {RequestDupeFilter} from "@/interface/RequestDupeFilter";
import {MiddlewareManager} from "@/middleware/MiddlewareManager";
import {BaseESpiderInterfaceMiddleware, ESpiderRequestMiddleware} from "@/middleware";
import {clearPromiseInterval, isFunction, isNumber, setPromiseInterval, sleep} from "@biggerstar/tools";
import {TaskManager} from "@/task/TaskManager";
import {AxiosSessionRequestConfig, AxiosSessionResponse} from "@biggerstar/axios-session";


export abstract class BaseESpiderInterface<
  Options extends BaseESpiderInterfaceOptions,
  Middleware extends BaseESpiderInterfaceMiddleware
> extends BaseESpiderInterfaceMiddleware
  implements BaseESpiderInterfaceMiddleware {

  [matchUrl: `@${string}`]: () => ESpiderRequestMiddleware

  public declare name: string
  public readonly options: Options & Record<any, any>
  public readonly requestQueue: PQueue
  public readonly dbQueue: PQueue
  public readonly middlewareManager: MiddlewareManager<Middleware, ESpiderRequestMiddleware>
  public readonly fingerprint: RequestDupeFilter
  public readonly taskManager: TaskManager
  protected _runStatus: 'pause' | 'ready' | 'closed' | 'running'
  /** 用于保持爬虫实例的运行，只有当程序关闭的时候才会释放 */
  private _keepProcessTimer: number
  protected _initialized: boolean;

  public abstract doRequest(req: any): Promise<any>

  protected constructor() {
    super();
    const _this = this
    this.requestQueue = new PQueue({
      interval: 0
    })
    this._initialized = false
    this._runStatus = 'ready'
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
    this.taskManager = new TaskManager()
    this.fingerprint = new RequestDupeFilter()
    const oldAdd = this.requestQueue.add
    this.requestQueue.add = async function () {  // 重写add 函数进行支持请求间隔
      const res = oldAdd.apply(this, arguments)
      await sleep(_this.options.requestInterval)
      return res
    }
    /*---------------------提取主爬虫事件钩子------------------------*/
    const descriptors = Object.getOwnPropertyDescriptors(this.constructor.prototype)
    /* 主蜘蛛中间件 */
    this.middlewareManager.addRootMiddleware(<any>this)
    Promise.resolve().then(() => {
      // 这里是可以直接使用 Promise 的，因为启动也是 Promise， 不会影响正常运行
      /* 定义到原型的地址匹配中间件 */
      Object.keys(descriptors)
        .filter(keyName => keyName.startsWith('@') && isFunction(this[keyName]))
        .forEach(name => this.middlewareManager.addMiddleware(name.slice(1), this[name]()))
      /* 直接复制到实例的地址的请求中间件 */
      for (const name in this) {
        if (!name.startsWith('@') || !isFunction(this[name])) continue
        this.middlewareManager.addMiddleware(name.slice(1), this[name as any]())
      }
    })
  }

  public setOptions(opt: Partial<BaseESpiderInterfaceOptions>) {
    Object.assign(this.options, opt)
    if (isNumber(opt.dbQueueConcurrency)) this.dbQueue.concurrency = opt.dbQueueConcurrency
    if (isNumber(opt.requestConcurrency)) this.requestQueue.concurrency = opt.requestConcurrency
    if (isNumber(opt.dbQueueTimeout)) this.dbQueue.timeout = opt.dbQueueTimeout
    if (isNumber(opt.requestQueueTimeout)) this.requestQueue.timeout = opt.requestQueueTimeout
    this.fingerprint.setOptions({
      ...opt,
      ...opt.dupeFilterOptions
    })
    this.taskManager.setOptions({
      ...opt,
      ...opt.taskOptions
    })
  }

  /**
   * 关闭爬虫
   * */
  public async close(): Promise<void> {
    clearPromiseInterval(this._keepProcessTimer)
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
    if (!this._keepProcessTimer) {
      this._keepProcessTimer = setPromiseInterval(async () => {
        if (this._runStatus === 'closed') {
          clearPromiseInterval(this._keepProcessTimer)
        }
      }, 3000)
    }
    if (!this._initialized) {
      this.options.name = this.name
      this.setOptions(this.options)
      this.fingerprint.start()
      this.requestQueue.start()
      this.dbQueue.start()
      await this.taskManager.init()
      await this.middlewareManager.callRoot('onReady')
    }
    await this.middlewareManager.callRoot('onStart')
    this._initialized = true
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

  /**
   * 根据调度实现从数据库中取出所需个数的请求进行实现
   * len 为当前可添加的任务个数
   * 该函数需要从数据库中取出一个或者多个任务，并添加到请求任务队列
   * */
  protected async autoLoadRequest(len: number) {
    // console.log('当前所需请求数量', len)
    const taskList = await this.taskManager.getTask(len)
    if (taskList.length === 0) {
      await this.middlewareManager.callRoot('onIdle')
      return
    }
    taskList.forEach((task) => {
      this.requestQueue.add(async () => {
        await this.middlewareManager.call(
          'onRequestTask',
          task.request.url,
          async (cb) => {
            await cb.call(this, task)
          })
        await this.doRequest(task.request)
          .then((_) => {
            this.fingerprint.add(task.request)
            this.taskManager.removePendingTask(task.taskId)
          })
      })
    })
  }
}

