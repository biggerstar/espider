import {
  AxiosSessionError,
  AxiosSessionInstance,
  AxiosSessionRequestConfig,
  AxiosSessionResponse
} from "@biggerstar/axios-session";
import {SpiderTask} from "@/typings";
import {SessionESpider} from "@/spider/SessionESpider";

export abstract class BaseESpiderInterfaceMiddleware {
  /**
   * 爬虫已准备， 在 onStarted 之后执行， 并且只会在第一次运行 spider.start() 函数执行一次
   * onReady 和 onStarted 区别是:
   *     onReady 只在第一次触发 spider.start() 执行
   *     onStarted 每次触发 spider.start() 都会执行
   * */
  public onReady?(this: SessionESpider): Promise<void> | void

  /**
   * 爬虫调用 spider.start() 函数时触发，需要等待一定时间才能暂停，暂停成功触发 onStarted
   * */
  public onStart?(this: SessionESpider): Promise<void> | void

  /**
   * 爬虫启动成功
   * */
  public onStarted?(this: SessionESpider): Promise<void> | void

  /**
   * 爬虫调用 spider.pause() 函数时触发，需要等待一定时间才能暂停，暂停成功触发 onPaused
   * */
  public onPause?(this: SessionESpider): Promise<void> | void

  /**
   * 爬虫暂停成功
   * */
  public onPaused?(this: SessionESpider): Promise<void> | void

  /**
   * 爬虫调用 spider.close() 函数时触发，，需要等待一定时间才能关闭，暂停成功触发 onClosed
   * */
  public onClose?(this: SessionESpider): Promise<void> | void

  /**
   * 爬虫关闭成功
   * */
  public onClosed?(this: SessionESpider): Promise<void> | void

  /**
   * 数据库队列空了进行调用， 调用间隔为 queueCheckInterval 字段配置， 默认间隔 500ms
   * */
  public onIdle?(this: SessionESpider): Promise<void> | void
}

export abstract class SessionESpiderInterfaceMiddleware extends BaseESpiderInterfaceMiddleware {
  /**
   * 每次自动创建 session 之后的回调
   * */
  public onCreateSession ?(this: SessionESpider, session: AxiosSessionInstance): Promise<void> | void
}

export abstract class SessionESpiderMiddleware extends SessionESpiderInterfaceMiddleware {
}

export interface ESpiderRequestMiddleware {
  /**
   * 监听到从数据库取出任务时的回调， 可以在里面修改任务信息， 在 onRequest 时间之前运行
   * */
  onRequestTask?<T extends SpiderTask>(this: SessionESpider, task: T): Promise<void> | void

  /**
   * 监听到发起 axios 请求的回调， 该事件本质是 axios 拦截器
   * */
  onRequest?<T extends AxiosSessionRequestConfig>(this: SessionESpider, req: T): Promise<T | void> | T | void

  /**
   * 监听到发起 axios 响应的回调， 该事件本质是 axios 拦截器
   * */
  onResponse?<T extends AxiosSessionRequestConfig, R extends AxiosSessionResponse>(this: SessionESpider, req: T, res: R): Promise<void | R> | R | void

  /**
   * 监听到发起 axios 错误的回调， 该事件本质是 axios 拦截器
   * */
  onError?<T extends AxiosSessionError>(this: SessionESpider, err: T): Promise<void | T> | T | void
} 
