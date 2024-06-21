import {
  AxiosSessionError,
  AxiosSessionInstance,
  AxiosSessionRequestConfig,
  AxiosSessionResponse
} from "@biggerstar/axios-session";
import {SpiderTask} from "@/typings";
import {SessionESpider} from "@/spider";
import {ESpiderUrlMatchMiddleware} from "@/middleware";

export class Test extends SessionESpider {
  public name = 'test'

  onStart() {
    console.log('onStart')
    spider.addRequestTask({
        url: 'https://baidu.com?q=11&b=222#accccc',
        method: 'POST',
        headers: {
          'ccc': 'ccc1',
          'bbb': 'bbb1',
          'aaa': 'aaa1',
        },
        data: {
          'data-ccc': 'ccc1',
          'datA-aaa': 'aaa1',
          'datA-bbb': 'bbb1',
        },
        meta: {
          aaa: 11122222
        },
        maxRedirects: 1,
      },
      {
        priority: 2
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

  onPause(): Promise<void> | void {
    console.log('onPause')
  }

  onClose(): Promise<void> | void {
    console.log('onClose')
  }

  onClosed(): Promise<void> | void {
    console.log('onClosed')
  }

  onCreateSession(session: AxiosSessionInstance): Promise<void> | void {
    // console.log('onCreateSession', session)
    session.setAxiosDefaults({
      // proxyString: ``,
      keepSession: true,
    })
  }

  ['@baidu.com|weibo.com'](): ESpiderUrlMatchMiddleware {
    return {
      onRequestTask<T extends SpiderTask<Record<any, any>>>(task: T, session: AxiosSessionInstance): Promise<void> | void {
        console.log('onRequestTask')
      },
      onRequest(this: SessionESpider, req: AxiosSessionRequestConfig) {
        // console.log('accurate request', req);
      },
      onResponse(this: SessionESpider, req: AxiosSessionRequestConfig, res: AxiosSessionResponse) {
        // console.log('accurate response', req, res.data.slice(0, 500));
        this.addToDatabaseQueue(() => {
          console.log('DatabaseQueue 回调')
        })
      },
      onError(this: SessionESpider, err: AxiosSessionError) {
        console.log('accurate err', err.message)
      },
    }
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
// const reqUrl = response?.request?.['res']?.['responseUrl'] || response?.config?.url
