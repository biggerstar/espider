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
    await callDecoratorEvent(spider, SpiderEventEnum.SpiderResponse, reqUrl, async (cb) => cb(res.request, res))
    return res
  }

  async function catchErr(err: AxiosSessionError) {
    const reqUrl = err.request?.['res']?.['responseUrl'] || err.config?.url
    await callDecoratorEvent(spider, SpiderEventEnum.SpiderError, reqUrl, async (cb) => cb(err))
    return err
  }

  // @ts-ignore
  session.interceptors.request.use((req: AxiosSessionRequestConfig) => request(req), catchErr)
  // @ts-ignore
  session.interceptors.response.use((res: AxiosSessionResponse) => response(res), catchErr)
}
