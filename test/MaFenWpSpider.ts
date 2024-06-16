import {Spider, SpiderManager} from "../src";
import {AxiosSessionError, AxiosSessionRequestConfig, AxiosSessionResponse} from "@biggerstar/axios-session";

export class MaFenWpSpider extends Spider {
    async onReady() {
        console.log('ready')
        spider.addRequest({
            url: 'https://baidu.com?q=11',
            maxRedirects: 0,
        })
    }

    ['@baidu.com|weibo.com']() {
        return {
            async onRequest(this: Spider, req: AxiosSessionRequestConfig) {
                console.log('accurate request', req);
            },
            async onResponse(this: Spider, req: AxiosSessionRequestConfig, res: AxiosSessionResponse) {
                console.log('accurate response', req, res.data.slice(0, 500));
                this.addToDatabaseQueue(() => {
                    console.log('DatabaseQueue 回调')
                })
            },
            async onError(this: Spider, err: AxiosSessionError) {
                console.log('accurate err', err.message)
            }
        }
    }

}

const spiderManager = new SpiderManager()
const spider = new MaFenWpSpider()
spiderManager.addSpider(spider)
await spiderManager.start()








