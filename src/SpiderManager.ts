import PQueue from "p-queue";
import {MittEventBus} from "@biggerstar/mitt-bus";
import {Spider} from "./Spider";
import {AxiosError} from "axios";
import {Options} from "p-queue";
import type {Queue, RunFunction} from "p-queue/dist/queue";
import {QueueAddOptions} from "p-queue/dist/options";
import {createAxiosSession, AxiosSessionRequestConfig, AxiosSessionResponse} from "@biggerstar/axios-session";

export type SpiderManagerOptions = {
    requestQueueConfig: Options<Queue<RunFunction, {}>, QueueAddOptions>
    databaseQueueConfig: Options<Queue<RunFunction, {}>, QueueAddOptions>
}

export class SpiderManager extends MittEventBus<{}> {
    public requestQueue: PQueue
    public databaseQueue: PQueue
    public spiderList: Spider[] = []
    private _initialized: boolean
    private _running: boolean

    constructor(opt: Partial<SpiderManagerOptions> = {}) {
        super()
        this._initialized = false
        this._running = false
        this.requestQueue = new PQueue(opt.requestQueueConfig)
        this.databaseQueue = new PQueue(opt.databaseQueueConfig)
    }

    /**
     * 暂停爬虫
     * */
    pause() {
        if (!this._running) return
        this.requestQueue.pause()
        this.databaseQueue.pause()
    }

    onRequestIdle(callback: Function) {
        this.requestQueue.onIdle().then(() => callback())
    }

    /**
     * 添加爬虫实例
     * */
    addSpider(spider: Spider) {
        if (!(spider instanceof Spider)) {
            throw new Error('请继承 Spider 类')
        }
        spider.session = createAxiosSession()
        spider._manager = this
        this.spiderList.push(spider)
    }

    static _interceptors(spider: Spider) {
        async function request(req: AxiosSessionRequestConfig) {
            if (typeof spider.onRequest === 'function') {
                const r = await spider.onRequest.call(spider, req)
                if (typeof r === 'object') req = r
            }
            // 这里定义是可能会在 request 中修改 url， 可能不会和 response 的地址匹配一样, 下面重复代码同理
            const reqUrlList = Object.keys(spider.middleware).filter((name) => (new RegExp(name)).test(req.url))
            for (const matchUrl of reqUrlList) {
                const middleware = spider.middleware[matchUrl]
                if (middleware && typeof middleware.onRequest === 'function') {
                    const r = await middleware.onRequest.call(spider, req)
                    if (typeof r === 'object') req = r
                }
            }
            return req
        }

        async function response(res: AxiosSessionResponse) {
            const reqUrl = res.request?.['res']?.['responseUrl'] || res.config?.url
            if (typeof spider.onResponse === 'function') await spider.onResponse.call(spider, res.request, res)
            const reqUrlList = Object.keys(spider.middleware).filter((name) => (new RegExp(name)).test(reqUrl))
            for (const matchUrl of reqUrlList) {
                const middleware = spider.middleware[`${matchUrl}`]
                if (middleware && typeof middleware.onResponse === 'function') {
                    await middleware.onResponse.call(spider, res.request, res)
                }
            }
            return res
        }

        async function catchErr(err: AxiosError) {
            const reqUrl = err.request?.['res']?.['responseUrl'] || err.config?.url
            if (typeof spider.onError === 'function') await spider.onError.call(spider, err)
            const reqUrlList = Object.keys(spider.middleware).filter((name) => (new RegExp(name)).test(reqUrl))
            for (const matchUrl of reqUrlList) {
                const middleware = spider.middleware[`${matchUrl}`]
                if (middleware && typeof middleware.onError === 'function') {
                    await middleware.onError.call(spider, err)
                }
            }
            return err
        }

        // @ts-ignore
        spider.session.interceptors.request.use((req: AxiosSessionRequestConfig) => request(req), catchErr)
        // @ts-ignore
        spider.session.interceptors.response.use((res: AxiosSessionResponse) => response(res), catchErr)
    }

    /**
     * 将请求添加到队列中
     * */
    async addRequest<T extends AxiosSessionRequestConfig>(spider: Spider, req: Partial<T> | string) {
        const finallyReq = typeof req === 'string' ? {url: req} : req
        this.requestQueue.add(() => spider.session.request(finallyReq)).then()
    }

    /**
     * 添加到数据库操作队列
     * */
    async addToDatabaseQueue(_: Spider, callback: Function) {
        if (typeof callback !== 'function') {
            throw new Error(`[addToDatabaseQueue] 入参应该是一个函数`)
        }
        this.databaseQueue.add(() => callback()).then()
    }

    async start() {
        if (this._running) return
        this.requestQueue.start()
        this.databaseQueue.start()
        if (!this._initialized) {
            this.spiderList.forEach(spider => {
                SpiderManager._interceptors(spider)
                typeof spider.onReady === 'function' && spider.onReady()
            })
        }
        this._initialized = true
        this._running = true
    }
}
