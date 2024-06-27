## ESpider 爬虫框架

支持中间件， 布隆过滤重复请求， 断点续爬， 数据库队列， session状态保持


### 未来
redis 分布式


### 使用例子
```ts
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
          aaa: 33333333
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
        // console.log('accurate response', req, res.data.slice(0, 500));
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

spider
  .setOptions({
    requestConcurrency: 1,
    dupeFilterOptions: {}
  })
  .start()
  .then(() => console.log('启动成功'))

```

### 事件 

查看 [事件定义](https://github.com/biggerstar/espider/blob/main/src/middleware/SpiderMiddleware.ts)

