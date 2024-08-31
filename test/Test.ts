import {SessionESpider} from "@/spider";
import type {
  AxiosSessionError,
  AxiosSessionInstance,
  AxiosSessionRequestConfig,
  AxiosSessionResponse
} from "@biggerstar/axios-session";
import {SpiderCreateSession, SpiderError, SpiderReady, SpiderRequest, SpiderResponse} from "../src";
import * as url from "url";


export class TestSpider extends SessionESpider {
  public name = 'test'

  @SpiderReady()
  onReady() {
    console.log('onReady执行')
    // this.addRequestTask({
    //   url: 'https://www.baidu.com?' + Date.now(),
    // }, {
    //   skipCheck: true
    // })
    // for (let i = 0; i < 30; i++) {
    //   this.addRequestTask({
    //     url: 'https://www.baidu.com?' + Date.now(),
    //   })
    // }
    for (let i = 0; i <= 10; i++) {
      // const url = `https://www.onergys.de/index.php?lang=1&cl=search&&pgNr=${i}`
      const url = `http://baidu2.com/ss?a=${i}`
      this.addRequestTask({
        url: url,
        maxRedirects: 0
      }, {
        // skipCheck: true
      })
    }
    console.log('添加任务结束')
  }

  @SpiderCreateSession()
  patchProxy(session: AxiosSessionInstance) {
  }

  @SpiderRequest()
  request(request: AxiosSessionRequestConfig) {
    console.log('request', request.url)
    // console.log('request', request)
  }

  @SpiderResponse()
  responseFunc(res: AxiosSessionResponse, req: AxiosSessionRequestConfig) {
    console.log('response', req.url)
    // console.log('response', res.data)
  }

  @SpiderError()
  onError(err: AxiosSessionError, req: AxiosSessionRequestConfig) {
    // console.log(err.message)
    console.log(req)
  }
}

const spider = new TestSpider()

spider.setOptions({
  requestConcurrency: 1,
  dupeFilterOptions: {
    alwaysResetCache: true,
  },
  requestInterval: 0,
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
