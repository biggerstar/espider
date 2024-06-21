import {
  AxiosSessionError,
  AxiosSessionInstance,
  AxiosSessionRequestConfig,
  AxiosSessionResponse
} from "@biggerstar/axios-session";
import {SpiderTask} from "@/typings";
import {SessionESpider} from "@/spider/SessionESpider";

export abstract class BaseESpiderInterfaceMiddleware {
  public onStart ?(this: SessionESpider): Promise<void> | void

  public onPause ?(this: SessionESpider): Promise<void> | void

  public onClose ?(this: SessionESpider): Promise<void> | void
}

export abstract class SessionESpiderInterfaceMiddleware extends BaseESpiderInterfaceMiddleware {
  public onCreateSession ?(this: SessionESpider, session: AxiosSessionInstance): Promise<void> | void
}

export abstract class SessionESpiderMiddleware extends SessionESpiderInterfaceMiddleware {
  public onClosed ?(this: SessionESpider): Promise<void> | void
}

export interface ESpiderUrlMatchMiddleware  {
  onRequestTask?<T extends SpiderTask<Record<any, any>>>(this: SessionESpider, task: T, session: AxiosSessionInstance): Promise<void> | void

  onRequest?<T extends AxiosSessionRequestConfig>(this: SessionESpider, req: T, session: AxiosSessionInstance): Promise<T | void> | T | void

  onResponse?<T extends AxiosSessionRequestConfig, R extends AxiosSessionResponse>(this: SessionESpider, req: T, res: R, session: AxiosSessionInstance): Promise<void | R> | R | void

  onError?<T extends AxiosSessionError>(this: SessionESpider, err: T, session: AxiosSessionInstance): Promise<void | T> | T | void
} 
