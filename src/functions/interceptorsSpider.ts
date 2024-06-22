import {
  AxiosSessionError,
  AxiosSessionInstance,
  AxiosSessionRequestConfig,
  AxiosSessionResponse
} from "@biggerstar/axios-session";
import {SessionESpiderInterface} from "@/interface/SessionESpiderInterface";

/**
 * 拦截请求, 响应， 请求和响应错误
 * */
export function interceptorsSpider(spider: SessionESpiderInterface, session: AxiosSessionInstance) {
  async function request(req: AxiosSessionRequestConfig): Promise<any> {
    await spider.middlewareManager.call('onRequest', req.url, async (cb) => {
      const r = await cb.call(spider, req)
      if (typeof r === 'object') req = r
    })
    return req
  }

  async function response(res: AxiosSessionResponse) {
    const reqUrl = res.request?.['res']?.['responseUrl'] || res.config?.url
    await spider.middlewareManager.call('onResponse', reqUrl, async (cb) => cb.call(spider, res.request, res))
    return res
  }

  async function catchErr(err: AxiosSessionError) {
    const reqUrl = err.request?.['res']?.['responseUrl'] || err.config?.url
    await spider.middlewareManager.call('onError', reqUrl, async (cb) => cb.call(spider, err))
    return err
  }

  // @ts-ignore
  session.interceptors.request.use((req: AxiosSessionRequestConfig) => request(req), catchErr)
  // @ts-ignore
  session.interceptors.response.use((res: AxiosSessionResponse) => response(res), catchErr)
}
