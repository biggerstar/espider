import {ESpider} from "../src";
import {
  AxiosSessionError,
  AxiosSessionInstance,
  AxiosSessionRequestConfig,
  AxiosSessionResponse
} from "@biggerstar/axios-session";
import {getProxyString} from "../src/utils/methods";
import {SpiderMiddleware} from "../src/typings/SpiderMiddleware";

export class MaFenWpSpider extends ESpider {
  public name = 'ma-feng-wo'
  proxy: any

  async onReady() {
    console.log('ready')
    spider.addRequestTask({
      url: 'https://baidu.com/aaaa?q=11&b=222#accccc',
      headers: {
        'ccc': 'ccc1',
        'bbb': 'bbb1',
        'aaa': 'aaa1',
      },
      data: {
        'data-ccc': 'ccc1',
        'datA-aaa': 'aaa1',
        'datA-bbb': 'bbb1',
        date: Date.now()
      }
    })
    // spider.addRequestTask({
    //   url: 'https://baidu.com/aaaa?b=222&q=11#accccc',
    //   headers: {
    //     'aaa': 'aaa2',
    //     'ccc': 'ccc2',
    //     'bbb': 'bbb2',
    //   },
    //   data: {
    //     'datA-bbb': 'bbb1',
    //     'datA-aaa': 'aaa1',
    //     'data-ccc': 'ccc1',
    //   }
    // })
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
spider
  .setOptions({
    requestConcurrency: 1
  })
  .start()




