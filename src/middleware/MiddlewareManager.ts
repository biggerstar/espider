import {BaseESpiderInterface} from "@/interface/BaseESpiderInterface";
import {BaseESpiderInterfaceOptions} from "@/typings";
import {isFunction, isObject} from "@biggerstar/tools";

const rootMiddlewareEvent = [
  'onReady',
  'onStart',
  'onPause',
  'onClose',
  'onClosed',
  'onCreateSession',
  'onIdle',
]

const requestMiddlewareEvent = [
  'onRequestTask',
  'onRequest',
  'onResponse',
  'onError',
]

export class MiddlewareManager<RootMiddleware extends unknown, UrlMatchMiddleware extends unknown> {
  public spider: BaseESpiderInterface<BaseESpiderInterfaceOptions, RootMiddleware>
  public middleware: Record<string, UrlMatchMiddleware>
  public rootRootMiddleware: RootMiddleware
  public rootMiddlewareEvent: Array<keyof RootMiddleware | string>
  public requestMiddlewareEvent: Array<keyof UrlMatchMiddleware | string>

  constructor(spider: BaseESpiderInterface<BaseESpiderInterfaceOptions, RootMiddleware>) {
    this.spider = spider
    this.rootMiddlewareEvent = rootMiddlewareEvent
    this.requestMiddlewareEvent = requestMiddlewareEvent
    this.middleware = {}
    this.rootRootMiddleware = {} as any
  }

  /**
   * 添加主蜘蛛钩子
   * */
  public addRootMiddleware(rootRootMiddleware: RootMiddleware) {
    this.rootRootMiddleware = rootRootMiddleware
  }

  /**
   * 添加请求中间件
   * */
  public addMiddleware(name: string, middleware: UrlMatchMiddleware) {
    if (name.startsWith('@')) {
      throw new Error('请求中间件的名字第一个字符不应该是 @ ')
    }
    this.middleware[name] = middleware
  }

  /**
   * 回调 url 匹配的中间件事件
   * */
  public async call(
    type: keyof UrlMatchMiddleware,
    matchUrl: string | null = null,
    callback?: (cb: Function) => Promise<any>
  ) {
    if (!this.requestMiddlewareEvent.includes(type)) return
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
    // console.log(type, cb)
    if (!isFunction(cb)) return
    if (callback) await callback(cb.bind(this.spider))
    else await cb.call(this.spider)
  }
}






