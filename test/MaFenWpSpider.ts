import {ESpider} from "../src";
import {
    AxiosSessionError,
    AxiosSessionInstance,
    AxiosSessionRequestConfig,
    AxiosSessionResponse
} from "@biggerstar/axios-session";
import {getProxyString} from "../src/utils/methods";
import {SpiderMiddleware} from "../src/utils/SpiderMiddleware";

export class MaFenWpSpider extends ESpider {
    public name = 'ma-feng-wo'

    async onReady() {
        console.log('ready')
        spider.addLocalTask({
            url: 'https://baidu.com?q=11',
        })
    }

    async onTask(task: any) {
        console.log(task)

    }

    ['@baidu.com|weibo.com'](): SpiderMiddleware {
        return {
            async onRequest(this: ESpider, req: AxiosSessionRequestConfig) {
                console.log('accurate request', req);
            },
            async onResponse(this: ESpider, req: AxiosSessionRequestConfig, res: AxiosSessionResponse) {
                console.log('accurate response', req, res.data.slice(0, 500));
                this.addToDatabaseQueue(() => {
                    console.log('DatabaseQueue 回调')
                })
            },
            async onError(this: ESpider, err: AxiosSessionError) {
                console.log('accurate err', err.message)
            },
        }
    }
}

export class ProxyPoolSupport {
    getProxyString() {

    }
}


const spider = new MaFenWpSpider()
spider.setOptions({
    requestConcurrency: 3
}).start().then()




