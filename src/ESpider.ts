import PQueue from "p-queue";
import {AxiosError} from "axios";
import {
    createAxiosSession,
    AxiosSessionRequestConfig,
    AxiosSessionResponse,
    AxiosSessionInstance, AxiosSessionError
} from "@biggerstar/axios-session";
import {SpiderMiddleware} from "./utils/SpiderMiddleware";
import {getRandomItemForArray, sleep} from "./utils/methods";
import {createRequestDBCache} from "./db/sequelize";
import {Op, Sequelize} from "sequelize";
import {Model, ModelStatic} from "sequelize/types/model";
import {ESpiderOptions, EventNames, SessionItem, SpiderTask} from "./typings";


/**
 * 回调的中间件事件， 包括主蜘蛛实例上的事件
 * */
async function callMiddleware(type: EventNames, spider: ESpider, reqUrl: string | null, callback: (cb: Function) => Promise<any>) {
    let middlewares = []
    if (reqUrl) {
        middlewares = Object.keys(spider.middleware)
            .filter((name) => (new RegExp(name)).test(reqUrl))
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

/**
 * 拦截请求, 响应， 请求和响应错误
 * */
function interceptorsSpider(spider: ESpider, session: AxiosSessionInstance) {
    async function request(req: AxiosSessionRequestConfig) {
        await callMiddleware('onRequest', spider, req.url, async (cb) => {
            const r = await cb.call(spider, req)
            if (typeof r === 'object') req = r
        })
        return req
    }

    async function response(res: AxiosSessionResponse) {
        const reqUrl = res.request?.['res']?.['responseUrl'] || res.config?.url
        await callMiddleware('onResponse', spider, reqUrl, async (cb) => cb.call(spider, res.request, res))
        return res
    }

    async function catchErr(err: AxiosError) {
        const reqUrl = err.request?.['res']?.['responseUrl'] || err.config?.url
        await callMiddleware('onError', spider, reqUrl, async (cb) => cb.call(spider, err))
        return err
    }

    // @ts-ignore
    session.interceptors.request.use((req: AxiosSessionRequestConfig) => request(req), catchErr)
    // @ts-ignore
    session.interceptors.response.use((res: AxiosSessionResponse) => response(res), catchErr)
}

export class ESpider implements SpiderMiddleware {
    [key: `@${string}`]: () => SpiderMiddleware

    public declare name: string
    public requestQueue: PQueue
    public dbQueue: PQueue
    public _manager: ESpider
    public middleware: Record<string, SpiderMiddleware>
    public expirationSessionTime: number
    private queueCheckInterval: number   // 最低 500ms
    private _listeningTimer: NodeJS.Timeout   // 轮询队列的时间周期
    private _running: boolean
    private _initialized: boolean
    private sessionList: Array<SessionItem> = []
    public sequelize: Sequelize
    public requestQueueModel: ModelStatic<Model>
    public requestInterval: number

    constructor() {
        this._initialized = false
        this._running = false
        this.name = ''
        this.requestQueue = new PQueue()
        this.dbQueue = new PQueue()
        this.setOptions({
            queueCheckInterval: 500,
            dbQueueTimeout: 12000,
            requestQueueTimeout: 12000,
            dbQueueConcurrency: 1,
            requestConcurrency: 1,
            expirationSessionTime: 5 * 60 * 1000,
            requestInterval: 0,
        })
        const descriptors = Object.getOwnPropertyDescriptors(this.constructor.prototype)
        this.middleware = {}
        Object.keys(descriptors)
            .filter(keyName => keyName.startsWith('@'))
            .forEach(name => this.middleware[name.slice(1)] = this[name]())
    }

    /**
     * 配置爬虫
     * */
    public setOptions(opt: Partial<ESpiderOptions>): this {
        const whiteList = ['queueCheckInterval', 'dbQueueConcurrency', 'requestConcurrency']
        for (const optKey in opt) {
            if (!whiteList.includes(optKey)) continue
            if (Object.hasOwn(opt, optKey) && Object.hasOwn(this, optKey)) this[optKey] = opt[optKey]
        }
        if (typeof opt.dbQueueConcurrency === 'number') this.dbQueue.concurrency = opt.dbQueueConcurrency
        if (typeof opt.requestConcurrency === 'number') this.requestQueue.concurrency = opt.requestConcurrency
        if (typeof opt.dbQueueTimeout === 'number') this.dbQueue.timeout = opt.dbQueueTimeout
        if (typeof opt.requestQueueTimeout === 'number') this.requestQueue.timeout = opt.requestQueueTimeout
        return this
    }

    /**
     * 添加任务到本地数据库队列中，若中途暂停将会持久化
     * */
    public addLocalTask<T extends Record<any, any>, R extends any>(task: T | string): R | void {
        if (typeof task !== 'string') task = JSON.stringify(task)
        this.dbQueue.add(() => {
            return this.requestQueueModel.create({
                name: this.name,
                type: 'local',
                status: 'ready',
                data: task,
                timestamp: Date.now()
            })
        }).then()
    }

    /**
     * 添加分布式队列中
     * */
    public addDistributedTask<T extends Record<any, any>>(task: T | string): void {
        throw new Error('addDistributedTask 是未来特性, 将会支持分布式任务爬取')
    }

    /**
     * 将请求添加到本地任务队列中
     * @param {AxiosSessionInstance} session 使用该 session 去请求
     * @param {AxiosSessionRequestConfig} req axios 请求参数
     * */
    public async addRequest<T extends AxiosSessionRequestConfig>(session: AxiosSessionInstance, req: Partial<T> | string | void) {
        let finallyReq = typeof req === 'string' ? {url: req} : req
        await this.requestQueue.add(async () => {
                await sleep(this.requestInterval)
                let dbResRef: Model
                if (!req) {
                    this.requestQueueModel.findOne({
                        where: {
                            name: this.name,
                            status: {
                                [Op.or]: ['ready']
                            }
                        }
                    }).then(dbRes => {
                        if (dbRes) {
                            dbResRef = dbRes
                            callMiddleware('onTask', this, null, async (cb) => {
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
                            await callMiddleware('onCompleted', this, reqUrl, async (cb) => cb.call(this, response.request, response))
                            dbResRef.set('status', 'done')
                            this.dbQueue.add(() => dbResRef.save()).then()
                        })
                }
            }
        )
    }

    /**
     * 添加到数据库操作队列
     * */

    public addToDatabaseQueue(callback
                                  :
                                  Function
    ):
        void {
        if (typeof callback !== 'function'
        ) {
            throw new Error(`[addToDatabaseQueue] 入参应该是一个函数`)
        }
        this.dbQueue.add(() => callback()).then()
    }

    /**
     * 获取当前管理调度中的 session
     * */


    public getSession(id
                          :
                          string
    ):
        SessionItem | null {
        return this.sessionList.find(item => item.session.sessionId === id) || null
    }

    /**
     * 移除当前的 session
     * */

    public removeSession(session
                             :
                             string | AxiosSessionInstance
    ) {
        const sessionId = typeof session === 'string' ? session : session.sessionId
        const foundIndex = this.sessionList
            .findIndex(item => item.session.sessionId === sessionId)
        if (foundIndex) this.sessionList.splice(foundIndex, 1)
    }

    /** 开始监听各项数据，自动管理添加各种东西 */


    private _startListening()
        :
        this {
        if (this._running) return this
        const queueVacancy = this.requestQueue.concurrency - this.requestQueue.pending - this.requestQueue.size
        const removeExpirationSession = () => {
            this.sessionList = this.sessionList
                .filter(item => (Date.now() - item.lastUsageTime) < this.expirationSessionTime)
        }
        const createNewSession = () => {
            for (let i = 0; i < queueVacancy; i++) {
                const session = createAxiosSession()
                this.sessionList.push({
                    pending: false,
                    session,
                    lastUsageTime: Date.now()
                })
                interceptorsSpider(this, session)
                callMiddleware('onCreateSession', this, null, async (cb) => await cb.call(this, session)).then()
            }
            if (this.sessionList.length > this.requestQueue.concurrency) {
                throw new Error('当前的 session 列表超出并发数量，请检查是否在适当的地方使用 this.removeSession 移除没用的 session')
            }
        }
        const addNewTask = () => {
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
            patchSessionList.forEach((session) => this.addRequest(session))
        }
        const listening = () => {
            removeExpirationSession()
            createNewSession()
            addNewTask()
        }

        this._listeningTimer = setInterval(() => listening(), Math.min(500, this.queueCheckInterval))
        return this
    }

    /**
     * 暂停爬虫
     * */


    public pause()
        :
        this {
        if (!this._running) return this
        this.requestQueue.pause()
        this.dbQueue.pause()
        clearInterval(this._listeningTimer)
        this._running = false
        return this
    }

    /**
     * 开始爬虫, 爬虫入口
     * */
    public async start()
        :
        Promise<this> {
        if (!
            this.name
        ) {
            throw new Error('请指定爬虫名称 name')
        }
        if (this._running) return this
        this.requestQueue.start()
        this.dbQueue.start()
        if (!this._initialized) {
            if (!this.sequelize) {  // 如果没有手动定义 sequelize 连接，则使用内部默认
                this.sequelize = new Sequelize({
                    dialect: 'sqlite',
                    storage: `./${this.name}.sqlite3`,
                    logging: false
                })
            }
            if (!this.requestQueueModel) {
                this.requestQueueModel = await createRequestDBCache(this.sequelize, this.name)
            }
            console.log('数据库连接成功')
            typeof this.onReady === 'function' && this.onReady.call(this)
        }
        this._startListening()
        this._initialized = true
        this._running = true
        return this
    }

    /*-------------------------事件监听回调-------------------------------*/

    // public onRequestIdle?(callback: Function): void

    public onCreateSession ?(this: ESpider, session: AxiosSessionInstance): Promise<void> | void

    public onTask ?<T extends SpiderTask<Record<any, any>>>(this: ESpider, task: T, session: AxiosSessionInstance): Promise<void> | void

    public onReady ?(this: ESpider): Promise<void> | void {
        return void 0
    }

    public onRequest ?<T extends AxiosSessionRequestConfig>(this: ESpider, req: T, session: AxiosSessionInstance): Promise<T | void> | T | void

    public onResponse ?<T extends AxiosSessionRequestConfig, R extends AxiosSessionResponse>(this: ESpider, req: T, res: R, session: AxiosSessionInstance): Promise<void | R> | R | void

    public onCompleted ?<T extends AxiosSessionRequestConfig, R extends AxiosSessionResponse>(this: ESpider, req: T, res: R, session: AxiosSessionInstance): Promise<void | R> | R | void

    public onError ?<T extends AxiosSessionError>(this: ESpider, err: T, session: AxiosSessionInstance): Promise<void | T> | T | void
}
