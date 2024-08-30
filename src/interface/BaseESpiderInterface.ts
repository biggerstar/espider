import {BaseESpiderInterfaceOptions} from "@/typings";
import PQueue from "p-queue";
import {RequestDupeFilter} from "@/interface/RequestDupeFilter";
import {clearPromiseInterval, isNumber, setPromiseInterval, sleep} from "@biggerstar/tools";
import {BaseESpiderDefaultOptions} from "@/constant";
import {callDecoratorEvent} from "@/decorators/common/callDecoratorEvent";
import {SpiderEventEnum} from "@/enum/SpiderEventEnum";
import {TaskManager} from "@/interface/TaskManager";

/**
 * 需要 ts 开启支持装饰器
 * tsconfig.json:
 *   "experimentalDecorators": true,
 *   "emitDecoratorMetadata": true,
 * */
export class BaseESpiderInterface<
  Options extends BaseESpiderInterfaceOptions = BaseESpiderInterfaceOptions,
> {
  public declare name: string
  protected readonly options: Options & Record<any, any>
  protected readonly requestQueue: PQueue
  private readonly dbQueue: PQueue
  /**
   * 控制任务流， 比如暂停 开始 结束
   * */
  protected readonly _taskQueue: PQueue
  public readonly fingerprint: RequestDupeFilter
  public readonly taskManager: TaskManager
  protected _runStatus: 'pause' | 'ready' | 'closed' | 'running'
  /** 用于保持爬虫实例的运行，只有当程序关闭的时候才会释放 */
  private _keepProcessTimer: number
  protected _initialized: boolean;
  private _onIdleBlock: boolean

  protected constructor() {
    const _this = this
    this.requestQueue = new PQueue({
      interval: 0,
    })
    this._initialized = false
    this._onIdleBlock = false
    this._runStatus = 'ready'
    this.dbQueue = new PQueue({concurrency: 1})
    this._taskQueue = new PQueue({concurrency: 1})
    this.options = {...BaseESpiderDefaultOptions} as any
    this.taskManager = new TaskManager()
    this.fingerprint = new RequestDupeFilter()
    const oldAdd = this.requestQueue.add
    this.requestQueue.add = async function (callback: Function) {  // 重写add 函数进行支持请求间隔
      const newCall = async () => {
        await callback()
        await sleep(_this.options.requestInterval)
      }
      return await oldAdd.call(this, newCall)
    }
  }
  /**
   * 配置爬虫
   * */
  public setOptions(opt: Partial<BaseESpiderInterfaceOptions>): this {
    Object.assign(this.options, opt)
    if (isNumber(opt.requestConcurrency)) this.requestQueue.concurrency = opt.requestConcurrency
    if (isNumber(opt.dbQueueTimeout)) this.dbQueue.timeout = opt.dbQueueTimeout
    if (isNumber(opt.requestQueueTimeout)) this.requestQueue.timeout = opt.requestQueueTimeout
    this.fingerprint.setOptions({
      name: this.options.name,
      cacheDirPath: this.options.cacheDirPath,
      ...opt.dupeFilterOptions
    })
    this.taskManager.setOptions({
      name: this.options.name,
      cacheDirPath: this.options.cacheDirPath,
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
        await callDecoratorEvent(this, SpiderEventEnum.SpiderClose)
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
                    await callDecoratorEvent(this, SpiderEventEnum.SpiderClosed)
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
        await callDecoratorEvent(this, SpiderEventEnum.SpiderPause)
        this.fingerprint.closeAutoPersistence()
        this.requestQueue.pause()
        this.dbQueue.pause()
        this._runStatus = 'pause'
        await callDecoratorEvent(this, SpiderEventEnum.SpiderPaused)
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
        try {
          await callDecoratorEvent(this, SpiderEventEnum.SpiderStart)

        } catch (e) {
          if (e.message && e.message.startsWith('TypeError: undefined')) {
            e.message = e.message + 'onStart 事件运行时爬虫主体功能还未启动.'
            throw e
          }
        }
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
        await callDecoratorEvent(this, SpiderEventEnum.SpiderStarted)
        if (!_initialized) {
          await callDecoratorEvent(this, SpiderEventEnum.SpiderReady)
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
    if (len > taskList.length && !this._onIdleBlock) {  // 表示剩余任务少于要求任务数
      this._onIdleBlock = true
      this._taskQueue.add(async () => {
        await callDecoratorEvent(this, SpiderEventEnum.SpiderIdle)
        setTimeout(() => {
          this._onIdleBlock = false  // 如果 taskList 一直为空 则会每3秒左右提醒一次 onIdle
        }, 3000)
      }).then()
      return
    }
    taskList.forEach((task) => {
      this.requestQueue.add(async () => {
        await callDecoratorEvent(
          this,
          SpiderEventEnum.SpiderRequestTask,
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

  /**
   * 进行请求， 不需要考虑错误处理， 因为在 interceptorsSpider 函数中已经处理了错误
   * */
  public doRequest(_: any): Promise<any> {
    throw new Error('请在子类中实现 doRequest 函数')
  }
}

