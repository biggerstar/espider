import {BaseESpiderInterfaceOptions} from "@/typings";
import PQueue from "p-queue";
import {RequestDupeFilter} from "@/interface/RequestDupeFilter";
import {MiddlewareManager} from "@/middleware/MiddlewareManager";
import {BaseESpiderInterfaceMiddleware, ESpiderRequestMiddleware} from "@/middleware";
import {clearPromiseInterval, isFunction, isNumber, setPromiseInterval, sleep} from "@biggerstar/tools";
import {TaskManager} from "@/task/TaskManager";
import {AxiosSessionRequestConfig, AxiosSessionResponse} from "@biggerstar/axios-session";
import {resolve} from "node:path";


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
  protected readonly _taskQueue: PQueue
  public readonly middlewareManager: MiddlewareManager<Middleware, ESpiderRequestMiddleware>
  public readonly fingerprint: RequestDupeFilter
  public readonly taskManager: TaskManager
  protected _runStatus: 'pause' | 'ready' | 'closed' | 'running'
  /** 用于保持爬虫实例的运行，只有当程序关闭的时候才会释放 */
  private _keepProcessTimer: number
  protected _initialized: boolean;
  private _onIdleBlock: boolean

  public abstract doRequest(req: any): Promise<any>

  protected constructor() {
    super();
    const _this = this
    this.requestQueue = new PQueue({
      interval: 0
    })
    this._initialized = false
    this._onIdleBlock = false
    this._runStatus = 'ready'
    this.dbQueue = new PQueue({concurrency: 1})
    this._taskQueue = new PQueue({concurrency: 1})
    this.middlewareManager = new MiddlewareManager(this)
    this.options = {} as any
    Object.assign(this.options, <BaseESpiderInterfaceOptions>{
      name: '',
      cacheDirPath: `./.cache`,
      queueCheckInterval: 500,
      dbQueueTimeout: 12000,
      requestQueueTimeout: 12000,
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

  public setOptions(opt: Partial<BaseESpiderInterfaceOptions>): this {
    Object.assign(this.options, opt)
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
    return this
  }

  /**
   * 关闭爬虫
   * */
  public async close(): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      return this._taskQueue.add(async () => {
        if (!this._initialized) {
          throw new Error('[pause] 您的爬虫还未启动.')
        }
        if (!['running', 'pause'].includes(this._runStatus)) return resolve(false)
        await this.middlewareManager.callRoot('onClose')
        clearPromiseInterval(this._keepProcessTimer)
        this.fingerprint.closeAutoPersistence()
        this.requestQueue.clear()
        this.dbQueue.clear()
        this.dbQueue
          .onIdle()
          .then(() => {
            // 等待 DB 任务都完成才结束，防止入库中途出现数据丢失
            let timer = setInterval(() => {
              const inTaskCont = this.dbQueue.pending + this.dbQueue.size
              if (inTaskCont <= 0) {
                this.taskManager.sequelize
                  .close()
                  .then(async () => {
                    this._runStatus = 'closed'
                    await this.middlewareManager.callRoot('onClosed')
                    resolve(true)
                  })
                  .catch(reject)
                clearInterval(timer)
              }
            }, 50)
          })
          .catch(reject)
          .finally(() => {
            resolve(true)
          })
      })
    })
  }

  /**
   * 暂停爬虫
   * */
  public async pause(): Promise<boolean> {
    return new Promise(async (resolve) => {
      return this._taskQueue.add(async () => {
        if (!this._initialized) {
          throw new Error('[pause] 您的爬虫还未启动, 有可能还在初始化，请等待 start 函数的 Promise 完成')
        }
        if (!['running', 'ready'].includes(this._runStatus)) return resolve(false)
        await this.middlewareManager.callRoot('onPause')
        this.fingerprint.closeAutoPersistence()
        this.requestQueue.pause()
        this.dbQueue.pause()
        this._runStatus = 'pause'
        await this.middlewareManager.callRoot('onPaused')
        resolve(true)
      })
    })
  }

  /**
   * 开始爬虫, 爬虫入口
   * */
  public async start(): Promise<boolean> {
    return new Promise(resolve => {
      return this._taskQueue.add(async () => {
        if (!this.name) {
          throw new Error('请指定爬虫名称 name')
        }
        if (this._runStatus === 'closed') {
          throw new Error('[start] 您的爬虫已经关闭， 不能再次运行')
        }
        if (!['pause', 'ready'].includes(this._runStatus)) return resolve(false)
        await this.middlewareManager.callRoot('onStart')
        if (!this._keepProcessTimer) {
          this._keepProcessTimer = setPromiseInterval(async () => {
            if (this._runStatus === 'closed') {
              clearPromiseInterval(this._keepProcessTimer)
            }
          }, 3000)
        }
        const _initialized = this._initialized
        if (!_initialized) {
          this.options.name = this.name
          this.setOptions(this.options)
          this.fingerprint.start()
          this.requestQueue.start()
          this.dbQueue.start()
          await this.taskManager.init()
        }
        this._runStatus = 'running'
        this._initialized = true
        await this.middlewareManager.callRoot('onStarted')
        if (!_initialized) {
          await this.middlewareManager.callRoot('onReady')
        }
        resolve(true)
      })
    })
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
    if (taskList.length === 0 && !this._onIdleBlock) {
      this._onIdleBlock = true
      this._taskQueue.add(async () => {
        await this.middlewareManager.callRoot('onIdle')
        this._onIdleBlock = false
      }).then()
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

