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
  
  public onReady ?(this: SessionESpider): Promise<void> | void
}

export abstract class SessionESpiderInterfaceMiddleware extends BaseESpiderInterfaceMiddleware {
  public onCreateSession ?(this: SessionESpider, session: AxiosSessionInstance): Promise<void> | void
}

export abstract class SessionESpiderMiddleware extends SessionESpiderInterfaceMiddleware {
  public onClosed ?(this: SessionESpider): Promise<void> | void
}

export interface ESpiderRequestMiddleware {
  onRequestTask?<T extends SpiderTask>(this: SessionESpider, task: T): Promise<void> | void

  onRequest?<T extends AxiosSessionRequestConfig>(this: SessionESpider, req: T): Promise<T | void> | T | void

  onResponse?<T extends AxiosSessionRequestConfig, R extends AxiosSessionResponse>(this: SessionESpider, req: T, res: R): Promise<void | R> | R | void

  onError?<T extends AxiosSessionError>(this: SessionESpider, err: T): Promise<void | T> | T | void
} 
