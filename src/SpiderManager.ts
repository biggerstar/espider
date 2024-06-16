import PQueue from "p-queue";
import {MittEventBus} from "@biggerstar/mitt-bus";
import {createAxiosSession} from "@biggerstar/axios-session";
import {Spider} from "./Spider";
import {AxiosInstance, AxiosRequestConfig} from "axios";

export class SpiderManager extends MittEventBus<{}> {
    requestQueue: PQueue
    databaseQueue: PQueue
    spiderList: Spider[] = []
    _initialized: boolean

    constructor(opt = {}) {
        super()
        this._initialized = false
        this.requestQueue = new PQueue(opt['requestQueueConfig'])
        this.databaseQueue = new PQueue(opt['databaseQueueConfig'])
    }

    /**
     * 暂停爬虫
     * */
    pause() {
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
        // @ts-ignore
        if (!(spider instanceof Spider)) {
            throw new Error('请继承 Spider 类')
        }
        spider.session = createAxiosSession() as any
        spider._manager = this
        this.spiderList.push(spider)
    }

    /**
     * 将请求添加到队列中
     * */
    async addRequest(spider: Spider, req: AxiosRequestConfig | string) {
        let finallyReq: AxiosRequestConfig
        if (typeof req === 'string') {
            finallyReq = {url: req}
        }
        finallyReq = req as any
        this.requestQueue.add(async () => {
            if (typeof spider.request === 'function') {
                const r = await spider.request(finallyReq)
                if (typeof r === 'object') req = r
            }
            // 这里定义是可能会在 request 中修改 url， 可能不会和 response 的地址匹配一样, 下面重复代码同理
            const reqUrlList = Object.keys(spider.middleware).filter((name) => (new RegExp(name)).test(finallyReq.url))
            for (const matchUrl of reqUrlList) {
                const middleware = spider.middleware[matchUrl]
                if (middleware && typeof middleware.request === 'function') {
                    const r = await spider.request(finallyReq)
                    if (typeof r === 'object') req = r
                }
            }
            spider.session
                .request(finallyReq)
                .then(async (res) => {
                    const reqUrl = res.request?.['res']?.['responseUrl'] || res.config?.url
                    if (typeof spider.response === 'function') {
                        await spider.response(finallyReq, res)
                    }
                    const reqUrlList = Object.keys(spider.middleware).filter((name) => (new RegExp(name)).test(reqUrl))
                    for (const matchUrl of reqUrlList) {
                        const middleware = spider.middleware[`@${matchUrl}`]
                        if (middleware && typeof middleware.response === 'function') {
                            await spider.response(finallyReq, res)
                        }
                    }
                    return res
                })
                .catch(async (err) => {
                    const reqUrl = err.request?.['res']?.['responseUrl'] || err.config?.url
                    if (typeof spider.catch === 'function') {
                        await spider.catch(err)
                    }
                    const reqUrlList = Object.keys(spider.middleware).filter((name) => (new RegExp(name)).test(reqUrl))
                    for (const matchUrl of reqUrlList) {
                        const middleware = spider.middleware[`@${matchUrl}`]
                        if (middleware && typeof middleware.catch === 'function') {
                            await spider.catch(err)
                        }
                    }
                    return err
                })
        }).then()
    }
    /**
     * 添加到数据库操作队列
     * */
    async addToDatabaseQueue(callback: Function) {
        if (typeof callback !== 'function') {
            throw new Error(`[addToDatabaseQueue] 入参应该是一个函数`)
        }
        this.databaseQueue.add(() => callback()).then()
    }

    async start() {
        this.requestQueue.start()
        this.databaseQueue.start()
        if (!this._initialized) {
            this.spiderList.forEach(spider => typeof spider.ready === 'function' && spider.ready())
        }
        this._initialized = true
    }
}
