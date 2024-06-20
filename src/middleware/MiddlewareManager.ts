import {BaseESpiderOptions} from "@/typings";
import {isFunction} from "lodash-es";
import {BaseESpiderInterface} from "@/interface/BaseESpiderInterface";

export class MiddlewareManager<Middleware extends unknown> {
  public spider: BaseESpiderInterface<BaseESpiderOptions, Middleware>
  public middleware: Record<string, Middleware> = {}
  public rootMiddleware: Middleware

  /**
   * 添加主蜘蛛钩子
   * */
  public addRootMiddleware(rootMiddleware: Middleware) {
    this.rootMiddleware = rootMiddleware
  }

  /**
   * 添加中间件
   * */
  public addMiddleware(name: string, middleware: Middleware) {
    this.middleware[name] = middleware
  }

  /**
   * 回调中间件事件
   * */
  public async call(
    type: keyof Middleware,
    matchUrl: string | null = null,
    callback?: (cb: Function) => Promise<any>
  ) {
    let middlewares: Middleware[] = []
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
  public async callRoot(type: keyof Middleware, callback?: (cb: Function) => Promise<any>) {
    const cb = this.rootMiddleware[type]
    if (!isFunction(cb)) return
    if (callback) await callback(cb.bind(this.spider))
    else await cb.call(this.spider)
  }

  /**
   * 回调中间件和主蜘蛛实例事件
   * 传入 callback 将会回调该函数进行手动调用
   * 如果没有传入 callback 则会自动调用
   * */
  public async callAll(type: keyof Middleware, matchUrl: string | null = null, callback?: (cb: Function) => Promise<any>) {
    await this.callRoot(type, callback)
    await this.call(type, matchUrl, callback)
  }
}
