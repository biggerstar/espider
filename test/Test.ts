import {
  AxiosSessionError,
  AxiosSessionInstance,
  AxiosSessionRequestConfig,
  AxiosSessionResponse
} from "@biggerstar/axios-session";
import {SpiderTask} from "@/typings";
import {SessionESpider} from "@/spider";
import {SessionESpiderMiddleware} from "@/middleware";

export class Test extends SessionESpider {
  public name = 'test'

  async onStart() {
    console.log('onStart')
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

  ['@baidu.com|weibo.com'](): SessionESpiderMiddleware {
    return {
      async onRequest(this: SessionESpider, req: AxiosSessionRequestConfig) {
        console.log('accurate request', req);
      },
      async onResponse(this: SessionESpider, req: AxiosSessionRequestConfig, res: AxiosSessionResponse) {
        console.log('accurate response', req, res.data.slice(0, 500));
        this.addToDatabaseQueue(() => {
          console.log('DatabaseQueue 回调')
        })
      },
      async onError(this: SessionESpider, err: AxiosSessionError) {
        console.log('accurate err', err.message)
      },
    }
  }

  onClose(): Promise<void> | void {
    console.log('onClose')
  }

  onPause(): Promise<void> | void {
    console.log('onPause')
  }

  onClosed(): Promise<void> | void {
    console.log('onClosed')
  }

  onError<T extends AxiosSessionError>(err: T, session: AxiosSessionInstance): Promise<void | T> | void | T {
    console.log('onError')
  }

  onRequestTask<T extends SpiderTask<Record<any, any>>>(task: T, session: AxiosSessionInstance): Promise<void> | void {
    console.log('onRequestTask')
  }
}

export class ProxyPoolSupport {
  getProxyString() {

  }
}

const spider = new Test()
spider
  .setOptions({
    requestConcurrency: 1
  })
  .start()
  .then(() => {
    console.log('启动成功')
  })


setTimeout(() => {
  console.log('爬虫关闭')
  // console.log(spider.middleware);
  spider.close().then()
}, 6000)

