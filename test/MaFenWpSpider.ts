import {Spider, SpiderManager} from "../src";
import {AxiosError, AxiosRequestConfig, AxiosResponse} from "axios";

class MaFenWpSpider extends Spider {
    async ready() {
        console.log('ready')
        spider.addRequest('https://www.baidu.com')

    }

    ['@https://baidu.com']() {
        return {
            async request(req: AxiosRequestConfig) {
                console.log('accurate request', req);
            },
            async response(req: AxiosRequestConfig, res: AxiosResponse) {
                console.log('accurate response', req, res.data.slice(0, 500));
            },
            async catch(err: AxiosError) {
                console.log('accurate err', err.message)
            }
        }
    }

    async request(req: AxiosRequestConfig) {
        console.log('main request', req);
    }

    async response(req: AxiosRequestConfig, res: AxiosResponse) {
        console.log('main response', req, res.data.slice(0, 500));
    }

    async catch(err: AxiosError) {
        console.log('main err', err.message)
    }
}

const spiderManager = new SpiderManager()
const spider = new MaFenWpSpider()
spiderManager.addSpider(spider)
await spiderManager.start()

