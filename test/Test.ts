import {SessionESpider} from "@/spider";
import type {AxiosSessionRequestConfig, AxiosSessionResponse} from "@biggerstar/axios-session";
import {SpiderReady, SpiderRequest, SpiderResponse} from "../src";


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
    console.log('request')
    // console.log('request', request)
  }

  @SpiderResponse('baidu.com')
  responseFunc(req: AxiosSessionRequestConfig, res: AxiosSessionResponse) {
    console.log('response')
    // console.log('response', res.data)
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

// setTimeout(() => {
//   spider.pause().then(isSuccess => console.log('pause', isSuccess))
// }, 2000)
// setTimeout(() => {
//   spider.start().then(isSuccess => console.log('start', isSuccess))
// }, 8000)
// setTimeout(() => {
//   spider.close().then(isSuccess => console.log('close', isSuccess))
// }, 10000)
