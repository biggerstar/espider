import {Op, Sequelize} from "sequelize";
import {Model, ModelStatic} from "sequelize/types/model";
import {SessionESpiderOptions} from "@/typings";
import {AxiosSessionRequestConfig, AxiosSessionResponse} from "@biggerstar/axios-session";
import {RequestStatusEnum} from "@/constant";
import path from "node:path";
import {createRequestDBCache} from "@/db/sequelize";
import {everyHasKeys} from "@/utils/methods";
import {SessionESpiderInterface} from "@/interface/SessionESpiderInterface";
import {SessionESpiderMiddleware} from "@/middleware/SpiderMiddleware";

export class SessionESpider
  extends SessionESpiderInterface<SessionESpiderOptions, SessionESpiderMiddleware>
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
    this._running = false
    this._closed = true
    await super.close()
    return new Promise((resolve, reject) => {
      this.dbQueue
        .onIdle()
        .then(() => {
          // 等待 DB 任务都完成才结束，防止入库中途出现数据丢失
          setTimeout(async () => {
            this.sequelize
              .close()
              .then(async () => {
                await this.middlewareManager.callAll('onClosed')
                resolve(void 0)
              })
              .catch(reject)
          }, 1000)
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
    await super.start();
  }

  /**
   * 添加任务到本地数据库队列中，支持断点续爬
   * */
  public addRequestTask<T extends Partial<AxiosSessionRequestConfig>, R extends any>(req: T | string): R | void {
    let finallyReq: Partial<AxiosSessionRequestConfig> = typeof req === 'string' ? {url: req} : req
    if (this.fingerprint.has(finallyReq)) {
      // console.log('请求指纹重复')
      return
    }
    this.dbQueue.add(() => {
      return this.requestQueueModel.create({
        status: RequestStatusEnum.READY,
        data: JSON.stringify(req),
        timestamp: Date.now()
      })
    }).then()
  }

  /**
   * 根据调度实现
   * */
  public async addRequest(len: number) {
    console.log('当前所需请求数量', len)
    let finallyReq: AxiosSessionRequestConfig
    let dbResRef: Model
    this.requestQueueModel.findOne({
      where: {
        status: {
          [Op.or]: [RequestStatusEnum.READY]
        }
      }
    }).then(dbRes => {
      if (dbRes) {
        dbResRef = dbRes
        this.middlewareManager.callAll('onRequestTask', null, async (cb) => {
          const resultReq = await cb.call(this, dbRes.dataValues)
          finallyReq = resultReq || finallyReq
        }).then()
        dbRes.set('status', RequestStatusEnum.PENDING)
        this.dbQueue.add(() => dbRes.save()).then()
      }
    })
    if (dbResRef) {
      let response: AxiosSessionResponse
      // return session.request(finallyReq as any)
      //   .finally(async () => {
      //     const reqUrl = response?.request?.['res']?.['responseUrl'] || response?.config?.url
      //     await this._callMiddleware('onCompleted', reqUrl, async (cb) => cb.call(this, response.request, response))
      //     dbResRef.set('status', RequestStatusEnum.DONE)
      //     this.dbQueue.add(() => dbResRef.save()).then()
      //   })
    }
    return []
  }

}
