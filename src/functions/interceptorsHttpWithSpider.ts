import {
  AxiosSessionError,
  AxiosSessionInstance,
  AxiosSessionRequestConfig,
  AxiosSessionResponse
} from "@biggerstar/axios-session";
import {SessionESpiderInterface} from "@/interface/SessionESpiderInterface";
import {callDecoratorEvent} from "@/decorators/common/callDecoratorEvent";
import {SpiderEventEnum} from "@/enum/SpiderEventEnum";

/**
 * 拦截请求, 响应， 请求和响应错误
 * */
export function interceptorsHttpWithSpider(spider: SessionESpiderInterface, session: AxiosSessionInstance) {
  async function request(req: AxiosSessionRequestConfig): Promise<any> {
    await callDecoratorEvent(spider, SpiderEventEnum.SpiderRequest, req.url, async (cb) => {
      const r = await cb(req)
      if (typeof r === 'object') req = r
    })
    return req
  }

  async function response(res: AxiosSessionResponse) {
    const reqUrl = res.request?.['res']?.['responseUrl'] || res.config?.url
    const req = res.config || res.request
    req.spiderRequest.__skipCheck__ = true
    await callDecoratorEvent(spider, SpiderEventEnum.SpiderResponse, reqUrl, (cb) => cb(res, req.spiderRequest))
    return res
  }

  async function catchErr(err: AxiosSessionError) {
    const reqUrl = err.request?.['res']?.['responseUrl'] || err.config?.url
    const req = err.config || err.request
    req.spiderRequest.__skipCheck__ = true
    await callDecoratorEvent(spider, SpiderEventEnum.SpiderError, reqUrl, (cb) => cb(err, req.spiderRequest))
    /* 这里进行 resolve， 回调已经在爬虫事件 SpiderError 做完，后面 resolve 直接抛弃该次请求  */
    return Promise.resolve(err)
  }

  // @ts-ignore
  session.interceptors.request.use(request, catchErr)
  // @ts-ignore
  session.interceptors.response.use(response, catchErr)
}
