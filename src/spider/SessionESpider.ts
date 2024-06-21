import {Op, Sequelize} from "sequelize";
import {Model, ModelStatic} from "sequelize/types/model";
import {
  AddRequestTaskOptions,
  AddRequestTaskOtherOptions,
  SessionESpiderOptions
} from "@/typings";
import path from "node:path";
import {createRequestDBCache} from "@/db/sequelize";
import {everyHasKeys} from "@/utils/methods";
import {SessionESpiderInterface} from "@/interface/SessionESpiderInterface";
import {SessionESpiderMiddleware} from "@/middleware/SpiderMiddleware";
import {isObject, pick} from "lodash-es";
import {AxiosSessionRequestConfig} from "@biggerstar/axios-session";

export class SessionESpider
  extends SessionESpiderInterface<
    SessionESpiderOptions,
    SessionESpiderMiddleware
  >
  implements SessionESpiderMiddleware {

  protected _running: boolean;
  protected _closed: boolean;
  protected _initialized: boolean;
  public sequelize: Sequelize
  private requestQueueModel: ModelStatic<Model>

  public constructor() {
    super()
    this._initialized = false
    this._running = false
    this._closed = false
  }

  /**
   * 配置爬虫
   * */
  public setOptions(opt: Partial<SessionESpiderOptions> = {}): this {
    super.setOptions(opt)
    const whiteList = ['requestQueueModel', 'sequelize']
    whiteList.forEach(name => everyHasKeys(this, opt, [name]) && (this[name] = opt[name]))
    return this
  }

  public async close(): Promise<void> {
    if (!this._running) return
    this._running = false
    this._closed = true
    await super.close()
    return new Promise((resolve, reject) => {
      this.dbQueue
        .onIdle()
        .then(() => {
          // 等待 DB 任务都完成才结束，防止入库中途出现数据丢失
          let timer = setInterval(() => {
            const inTaskCont = this.dbQueue.pending + this.dbQueue.size
            if (inTaskCont <= 0) {
              this.sequelize
                .close()
                .then(async () => {
                  await this.middlewareManager.callRoot('onClosed')
                  resolve(void 0)
                })
                .catch(reject)
              clearInterval(timer)
            }
          }, 50)
        })
    })
  }

  public async pause(): Promise<void> {
    if (!this._running) return
    this._running = false
    await super.pause()
  }

  public async start() {
    if (this._running) return
    if (this._closed) {
      throw new Error('[start] 您的爬虫已经关闭， 不能再次运行')
    }
    if (!this._initialized) {
      if (!this.sequelize) {  // 如果没有手动定义 sequelize 连接，则使用内部默认
        this.sequelize = new Sequelize({
          dialect: 'sqlite',
          storage: path.resolve(this.options.cacheDirPath, `${this.name}.request.sqlite3`),
          logging: false
        })
      }
      if (!this.requestQueueModel) {
        this.requestQueueModel = await createRequestDBCache(this.sequelize, this.name)
      }
    }
    this._initialized = true
    this._running = true
    await super.start()
  }

  /**
   * 添加任务到本地数据库队列中，支持断点续爬
   * meta字段应该是个可序列化为字符串的普通对象
   * */
  public addRequestTask<T extends Partial<AxiosSessionRequestConfig>, R extends any>(
    req: T | string,
    options: Partial<AddRequestTaskOtherOptions> = {}
  ): R | void {
    let finallyReq: Partial<AddRequestTaskOptions> = typeof req === 'string' ? {url: req} : req
    if (!finallyReq.url) {
      throw new Error('[addRequestTask] 您添加的请求任务应该包含 url')
    }
    if (!finallyReq.meta || !isObject(finallyReq.meta)) {
      throw new Error('[addRequestTask] meta 应该是一个对象')
    }
    const fp = this.fingerprint.get(finallyReq)
    if (this.fingerprint.hasFP(fp)) {
      // console.log('请求指纹重复')
      return
    }
    this.dbQueue.add(async () => {
      const taskData = {
        taskId: fp,
        data: JSON.stringify(req),
        priority: options.priority || 0,
        timestamp: Date.now(),
      }
      const [_, created] = await this.requestQueueModel
        .findOrCreate({
          where: {taskId: fp},
          defaults: taskData
        })
      if (!created) {
        await this.requestQueueModel.update(taskData, {
          where: {taskId: fp}
        })
      }
    }).then()
  }

  /**
   * 根据调度实现从数据库中取出所需个数的请求进行实现
   * */
  public async autoLoadRequest(len: number) {
    console.log('当前所需请求数量', len)
    const foundTaskList = await this.requestQueueModel
      .findAll({
        limit: len,
        order: [['priority', 'ASC']]
      })
    foundTaskList.forEach(dbRes => {
      const task = dbRes.dataValues
      if (!task.meta) task.meta = {}
      let requestConfig = JSON.parse(task.data)
      this.requestQueue.add(async () => {
        await this.middlewareManager.call(
          'onRequestTask',
          requestConfig.url,
          async (cb) => {
            await cb.call(this, task)
          })
        await this.doRequest(requestConfig).finally(async () => {
        })
      })
    })
  }
}
