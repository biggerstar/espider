import {
  AxiosSessionError,
  AxiosSessionInstance,
  AxiosSessionRequestConfig,
  AxiosSessionResponse
} from "@biggerstar/axios-session";
import {ESpider} from "../ESpider";
import {SpiderTask} from "./index";

export abstract class SpiderMiddleware {
  /*-------------------------事件监听回调-------------------------------*/

  // public onRequestIdle?(callback: Function): void

  public onCreateSession ?(this: ESpider, session: AxiosSessionInstance): Promise<void> | void

  public onRequestTask ?<T extends SpiderTask<Record<any, any>>>(this: ESpider, task: T, session: AxiosSessionInstance): Promise<void> | void

  public onStart ?(this: ESpider): Promise<void> | void

  public onClose ?(this: ESpider): Promise<void> | void

  public onClosed ?(this: ESpider): Promise<void> | void

  public onRequest ?<T extends AxiosSessionRequestConfig>(this: ESpider, req: T, session: AxiosSessionInstance): Promise<T | void> | T | void

  public onResponse ?<T extends AxiosSessionRequestConfig, R extends AxiosSessionResponse>(this: ESpider, req: T, res: R, session: AxiosSessionInstance): Promise<void | R> | R | void

  public onCompleted ?<T extends AxiosSessionRequestConfig, R extends AxiosSessionResponse>(this: ESpider, req: T, res: R, session: AxiosSessionInstance): Promise<void | R> | R | void

  public onError ?<T extends AxiosSessionError>(this: ESpider, err: T, session: AxiosSessionInstance): Promise<void | T> | T | void

}
