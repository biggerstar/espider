import PQueue from "p-queue";
import {AxiosError} from "axios";
import {
  createAxiosSession,
  AxiosSessionRequestConfig,
  AxiosSessionResponse,
  AxiosSessionInstance
} from "@biggerstar/axios-session";
import {sleep} from "./utils/methods";
import {Op, Sequelize} from "sequelize";
import {Model, ModelStatic} from "sequelize/types/model";
import {ESpiderOptions} from "./typings";
import path from "node:path";
import {createRequestDBCache} from "./db/sequelize";
import {SessionESpider} from "./interface/SessionESpider";

export class ESpider extends SessionESpider<ESpiderOptions> {
  protected _running: boolean;
  protected _closed: boolean;
  protected _initialized: boolean;
  public sequelize: Sequelize
  private requestQueueModel: ModelStatic<Model>

  constructor() {
    super()
    this._initialized = false
    this._running = false
    this._closed = false
    Object.assign(this.options, <ESpiderOptions>{
      name: '',
      cacheDirPath: `./.cache`,
      queueCheckInterval: 500,
      dbQueueTimeout: 12000,
      requestQueueTimeout: 12000,
      dbQueueConcurrency: 1,
      requestConcurrency: 1,
      requestInterval: 0,
    })
  }

  /**
   * 配置爬虫
   * */
  public setOptions(opt: Partial<ESpiderOptions> = {}): this {
    super.setOptions(opt)
    if (opt.requestQueueModel) this.requestQueueModel = opt.requestQueueModel
    if (opt.sequelize) this.sequelize = opt.sequelize
    return this
  }

  /**
   * 添加任务到本地数据库队列中，支持断点续爬
   * */
  public addRequestTask<T extends Partial<AxiosSessionRequestConfig>, R extends any>(req: T | string): R | void {
    let finallyReq: Partial<AxiosSessionRequestConfig> = typeof req === 'string' ? {url: req} : req
    // console.log(seed)
    if (this.fingerprint.has(finallyReq)) {
      // console.log('请求指纹重复')
      return
    }
    this.dbQueue.add(() => {
      return this.requestQueueModel.create({
        status: 'ready',
        data: JSON.stringify(req),
        timestamp: Date.now()
      })
    }).then()
  }

  /**
   * 将请求添加到本地任务队列中
   * @param {AxiosSessionInstance} session 指定某个 session 去请求
   * @param {AxiosSessionRequestConfig} req axios 请求参数
   * */
  public async doRequest<T extends AxiosSessionRequestConfig>(session: AxiosSessionInstance, req: Partial<T> | string | void) {
    let finallyReq = typeof req === 'string' ? {url: req} : req
    await this.requestQueue.add(async () => {
      if (this._closed) return
      let dbResRef: Model
      if (!req) {
        this.requestQueueModel.findOne({
          where: {
            status: {
              [Op.or]: ['ready']
            }
          }
        }).then(dbRes => {
          if (dbRes) {
            dbResRef = dbRes
            this._callMiddleware('onRequestTask', this, null, async (cb) => {
              const resultReq = await cb.call(this, dbRes.dataValues)
              finallyReq = resultReq || finallyReq
            }).then()
            dbRes.set('status', 'pending')
            this.dbQueue.add(() => dbRes.save()).then()
          }
        })
      }
      if (dbResRef) {
        let response: AxiosSessionResponse
        return session.request(finallyReq as any)
          .then(r => (response = r))
          .catch(e => (response = e.response || {}))
          .finally(async () => {
            const reqUrl = response?.request?.['res']?.['responseUrl'] || response?.config?.url
            await this._callMiddleware('onCompleted', this, reqUrl, async (cb) => cb.call(this, response.request, response))
            dbResRef.set('status', 'done')
            this.dbQueue.add(() => dbResRef.save()).then()
          })
      }
    })
  }

  public async close(): Promise<void> {
    await super.close()
    this._running = false
    this._closed = true
    return new Promise((resolve, reject) => {
      this.dbQueue
        .onIdle()
        .then(() => {
          // 等待 DB 任务都完成才结束，防止入库中途出现数据丢失
          setTimeout(async () => {
            await this._callMiddleware('onClose', this, null, async (cb) => await cb.call(this)).catch(reject)
            this.sequelize
              .close()
              .then(async () => {
                await this._callMiddleware('onClosed', this, null, async (cb) => await cb.call(this)).catch(reject)
                resolve(void 0)
              })
              .catch(reject)
          }, 1000)
        })
    })
  }

  public async pause(): Promise<void> {
    if (!this._running) return
    await super.pause()
    this._running = false
    return new Promise(async (resolve1, reject1) => {
      await this._callMiddleware('onPause', this, null, async (cb) => await cb.call(this)).catch(reject1)
      resolve1(void 0)
    })
  }

  public async start() {
    if (this._running) return
    if (this._closed) {
      throw new Error('[start] 您的爬虫已经关闭， 不能再次运行')
    }
    await super.start();
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
      await this._callMiddleware('onStart', this, null, async (cb) => await cb.call(this))
    }
    this._initialized = true
    this._running = true
  }
}
