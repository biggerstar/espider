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
    for (let i = 0; i <= 10; i++) {
      const url = `https://www.onergys.de/index.php?lang=1&cl=search&&pgNr=${i}`
      // const url = `http://baidu2.com/ss?a=${i}`
      // const url = `http://baidu.com?s=${i}`
      // const url = `http://httpbin.org/ip`
      this.addRequestTask({
        url: url,
        maxRedirects: 0,
      })
    }
    console.log('添加任务结束')
  }

  @SpiderCreateSession()
  patchProxy(session: AxiosSessionInstance) {
    session.setAxiosDefaults({
      // proxyString: 'socket5://115.206.60.66:17928'
    })
  }

  @SpiderRequest()
  request(req: AxiosSessionRequestConfig) {
    console.log('request', req.url)
    // console.log(req)

    req.timeout = 30000
    // console.log(req)
    // console.log('request', request)
  }

  @SpiderResponse()
  responseFunc(res: AxiosSessionResponse, req: AxiosSessionRequestConfig) {
    // console.log('response', req)
    console.log('response', req.url)
  }

  @SpiderError()
  onError(err: AxiosSessionError, req: AxiosSessionRequestConfig) {
    console.log('SpiderError', err.message, req.url);
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
