import {
  AxiosSessionError,
  AxiosSessionInstance,
  AxiosSessionRequestConfig,
  AxiosSessionResponse
} from "@biggerstar/axios-session";
import {SpiderTask} from "@/typings";
import {SessionESpider} from "@/spider";
import {ESpiderRequestMiddleware} from "@/middleware";
import {sleep} from "@biggerstar/tools";

export class Test extends SessionESpider {
  public name = 'test'

  async onReady() {
    console.log('onReady')
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
          aaa: 33333333
        },
        maxRedirects: 1,
      },
      {
        priority: 2
      })
    spider.addRequestTask({
      url: 'https://baidu.com/aaaa?b=222&q=11#accccc',
      headers: {
        'aaa': 'aaa2',
        'ccc': 'ccc2',
        'bbb': 'bbb2',
      },
      data: {
        'datA-bbb': 'bbb1',
        'datA-aaa': 'aaa1',
        'data-ccc': 'ccc1',
      }
    })
    spider.addRequestTask({
      url: 'https://baidu.com/aaaa?b=222&q=11#accccc',
      headers: {
        'aaa': 'aaa2',
        'ccc': 'ccc2',
        'bbb': 'bbb2',
      },
      data: {
        'datA-bbb': 'bbb1',
        'datA-aaa': 'aaa1',
        'data-ccc': 'ccc1',
      }
    }, {
      priority: 1
    })

    for (let i = 0; i < 3000; i++) {
      console.log(i)
      spider.addRequestTask({
        url: `https://baidu.com/q=${i}`,
        headers: {
          'aaa': 'aaa2',
          'ccc': 'ccc2',
          'bbb': 'bbb2',
        },
        data: {
          'datA-bbb': 'bbb1',
          'datA-aaa': 'aaa1',
          'data-ccc': 'ccc1',
        }
      })
    }

    // await sleep(2500)
  }

  async onStart(): Promise<void> {
    console.log('onStart')
    // await sleep(2500)
  }

  async onStarted(): Promise<void> {
    console.log('onStarted')
    // await sleep(2500)
  }

  async onPause(): Promise<void> {
    console.log('onPause')
    // await sleep(2500)
  }

  async onPaused(): Promise<void> {
    console.log('onPaused')
    // await sleep(2500)
  }

  async onClose(): Promise<void> {
    console.log('onClose')
    // await sleep(2500)
  }

  async onClosed(): Promise<void> {
    console.log('onClosed')
    // await sleep(2500)
  }

  onIdle(): Promise<void> | void {
    console.log('onIdle')
  }

  onCreateSession(session: AxiosSessionInstance): Promise<void> | void {
    // console.log('onCreateSession', session)
    session.setAxiosDefaults({
      // proxyString: ``,
      keepSession: true,
    })
  }

  '@baidu.com|weibo.com'(): ESpiderRequestMiddleware {
    return {
      onRequestTask<T extends SpiderTask>(task: T): Promise<void> | void {
        console.log('onRequestTask')
        console.log(task)
      },
      onRequest<T extends AxiosSessionRequestConfig>(req: T): Promise<void | T> | void | T {
        console.log('onRequest')
      },
      onResponse(this: SessionESpider, req: AxiosSessionRequestConfig, res: AxiosSessionResponse) {
        console.log('onResponse')
        console.log('accurate response', res.data.slice(0, 500));
        this.addToDatabaseQueue(() => {
          console.log('DatabaseQueue 回调')
        })
      },
      onError(this: SessionESpider, err: AxiosSessionError) {
        console.log('onError')
        console.log(err.message)
      },
    }
  }
}

const spider = new Test()
spider
  .setOptions({
    requestConcurrency: 1,
    dupeFilterOptions: {
      alwaysResetCache: true,
    },
    requestInterval: 5000,
    taskOptions: {}
  })
  .start()
  .then(() => console.log('启动成功'))

// setTimeout(() => {
//   spider.pause().then(isSuccess => console.log('pause', isSuccess))
// }, 2000)
// setTimeout(() => {
//   spider.start().then(isSuccess => console.log('start', isSuccess))
// }, 8000)
// setTimeout(() => {
//   spider.close().then(isSuccess => console.log('close', isSuccess))
// }, 10000)
