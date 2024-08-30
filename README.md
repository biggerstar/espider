## ESpider 爬虫框架

支持中间件， 布隆过滤重复请求， 断点续爬， 数据库队列， session状态保持


###  Feature
redis 分布式

### 前提条件

```json5
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true, // 启用装饰器
    "emitDecoratorMetadata": true   // 支持装饰器元数据 
  }
}

```


### 使用例子

使用 `装饰器` 进行事件绑定

```ts
export class TestSpider extends SessionESpider {
  public name = 'test'

  @SpiderReady()
  onReady() {
    console.log('onReady执行')
    this.addRequestTask({
      url: 'https://www.baidu.com?' + Date.now(),
    }, {
      skipCheck: true
    })
    // for (let i = 0; i < 30; i++) {
    //   this.addRequestTask({
    //     url: 'https://www.baidu.com?' + Date.now(),
    //   })
    // }
  }

  @SpiderRequest('baidu.com')
  request(request: AxiosSessionRequestConfig) {
    console.log('request', request)
  }
  // 支持正则
  @SpiderResponse(/baidu.com/)
  responseFunc(res: AxiosSessionResponse) {
    console.log('response', res.data)
  }
}

const spider = new TestSpider()

spider.setOptions({
  requestConcurrency: 1,
  dupeFilterOptions: {
    alwaysResetCache: true,
  },
  requestInterval: 5000,
  taskOptions: {
    alwaysResetQueue: true,
  }
})
  .start()
  .then(() => console.log('启动成功'))

```

### 事件 

查看 [装饰器事件定义](https://github.com/biggerstar/espider/blob/main/src/decorators/events)

