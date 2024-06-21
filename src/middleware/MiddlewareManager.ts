import {isFunction} from "lodash-es";
import {BaseESpiderInterface} from "@/interface/BaseESpiderInterface";
import {BaseESpiderInterfaceOptions} from "@/typings";

const rootMiddlewareEvent = [
  'onStart',
  'onPause',
  'onClose',
  'onClosed',
  'onCreateSession',
]

const urlMatchMiddlewareEvent = [
  'onRequestTask',
  'onRequest',
  'onResponse',
  'onError',
]

export class MiddlewareManager<RootMiddleware extends unknown, UrlMatchMiddleware extends unknown> {
  public spider: BaseESpiderInterface<BaseESpiderInterfaceOptions, RootMiddleware>
  public middleware: Record<string, UrlMatchMiddleware> = {}
  public rootRootMiddleware: RootMiddleware
  public rootMiddlewareEvent: Array<keyof RootMiddleware | string>
  public urlMatchMiddlewareEvent: Array<keyof UrlMatchMiddleware | string>

  constructor(spider: BaseESpiderInterface<BaseESpiderInterfaceOptions, RootMiddleware>) {
    this.spider = spider
    this.rootMiddlewareEvent = rootMiddlewareEvent
    this.urlMatchMiddlewareEvent = urlMatchMiddlewareEvent
  }

  /**
   * 添加主蜘蛛钩子
   * */
  public addRootMiddleware(rootRootMiddleware: RootMiddleware) {
    this.rootRootMiddleware = rootRootMiddleware
  }

  /**
   * 添加中间件
   * */
  public addMiddleware(name: string, middleware: UrlMatchMiddleware) {
    this.middleware[name] = middleware
  }

  /**
   * 回调中间件事件
   * */
  public async call(
    type: keyof UrlMatchMiddleware,
    matchUrl: string | null = null,
    callback?: (cb: Function) => Promise<any>
  ) {
    if (!this.urlMatchMiddlewareEvent.includes(type)) return
    let middlewares: UrlMatchMiddleware[] = []
    if (matchUrl) {
      middlewares = Object.keys(this.middleware)
        .filter((name) => (new RegExp(name)).test(matchUrl))
        .map(matchUrl => this.middleware[matchUrl])
        .filter(middleware => isFunction(middleware[type]))
    }
    for (const middleware of middlewares) {
      const cb = middleware[type]
      if (!isFunction(cb)) continue
      if (callback) await callback(cb.bind(this.spider))
      else await cb.call(this.spider)
    }
  }

  /**
   * 回调主蜘蛛实例事件
   * */
  public async callRoot(type: keyof RootMiddleware, callback?: (cb: Function) => Promise<any>) {
    if (!this.rootMiddlewareEvent.includes(type)) return
    const cb = this.rootRootMiddleware[type]
    if (!isFunction(cb)) return
    if (callback) await callback(cb.bind(this.spider))
    else await cb.call(this.spider)
  }
}






