import {
  AxiosSessionError,
  AxiosSessionInstance,
  AxiosSessionRequestConfig,
  AxiosSessionResponse
} from "@biggerstar/axios-session";
import {ESpider} from "../ESpider";

export interface SpiderMiddleware {
  onRequest?<T extends AxiosSessionRequestConfig>(this: ESpider, req: T, session: AxiosSessionInstance): Promise<T | void> | T | void

  onResponse?<T extends AxiosSessionRequestConfig, R extends AxiosSessionResponse>(this: ESpider, req: T, res: R, session: AxiosSessionInstance): Promise<void | R> | R | void

  onCompleted?<T extends AxiosSessionRequestConfig, R extends AxiosSessionResponse>(this: ESpider, req: T, res: R, session: AxiosSessionInstance): Promise<void | R> | R | void

  onError?<T extends AxiosSessionError>(this: ESpider, err: T, session: AxiosSessionInstance): Promise<void | T> | T | void
}
