import {AddRequestTaskOptions, AddRequestTaskOtherOptions, SessionESpiderOptions} from "@/typings";
import {SessionESpiderInterface} from "@/interface/SessionESpiderInterface";
import {AxiosSessionRequestConfig} from "@biggerstar/axios-session";
import {isObject} from "@biggerstar/tools";


/**
 * 使用方式演示:
 *   async onStart(): Promise<void> {}
 *   async onStarted(): Promise<void> {}
 *   async onPause(): Promise<void> {}
 *   async onPaused(): Promise<void> {}
 *   async onClose(): Promise<void> {}
 *   async onClosed(): Promise<void> {}
 *   onIdle(): Promise<void> | void {}
 *   onCreateSession(session: AxiosSessionInstance): Promise<void> | void {
 *     session.setAxiosDefaults({
 *       // proxyString: ``,
 *       keepSession: true,
 *     })
 *   }
 *
 *   '@baidu.com|weibo.com'(): ESpiderRequestMiddleware {
 *     return {
 *       onRequestTask<T extends SpiderTask>(task: T): Promise<void> | void {
 *       },
 *       onRequest<T extends AxiosSessionRequestConfig>(req: T): Promise<void | T> | void | T {
 *       },
 *       onResponse(this: SessionESpider, req: AxiosSessionRequestConfig, res: AxiosSessionResponse) {
 *         this.addToDatabaseQueue(() => {
 *           console.log('DatabaseQueue 回调')
 *         })
 *       },
 *       onError(this: SessionESpider, err: AxiosSessionError) {
 *       },
 *     }
 *   }
 *
 * */
export class SessionESpider
  extends SessionESpiderInterface<SessionESpiderOptions> {

  /**
   * 添加任务到本地数据库队列中，支持断点续爬
   * meta字段应该是个可序列化为字符串的普通对象
   * @return boolean 是否添加成功
   * */
  public addRequestTask<T extends Partial<AxiosSessionRequestConfig>>(
    req: T | string,
    options: Partial<AddRequestTaskOtherOptions> = {}
  ): boolean {
    let finallyReq: Partial<AddRequestTaskOptions> = typeof req === 'string' ? {url: req} : req
    if (!finallyReq.url) {
      throw new Error('[addRequestTask] 您添加的请求任务应该包含 url')
    }
    if (Reflect.has(finallyReq, 'meta') && (!finallyReq.meta || !isObject(finallyReq.meta))) {
      throw new TypeError('[addRequestTask] meta 应该是一个对象')
    }
    const fp = this.fingerprint.get(finallyReq)
    /* 这里可以直接通过 finallyReq 确定是否重复， 不需要考虑中间件是否修改了 req 中是否修改了一些字段 */
    if (!options.skipCheck && this.fingerprint.hasFP(fp)) {
      // console.log('请求指纹重复', finallyReq.url)
      return false
    } else {
      this.fingerprint.addRuntimeFP(fp)
    }

    this.taskManager.addTask({
      taskId: fp,
      request: finallyReq,
      priority: options.priority || 0,
      createTime: Date.now(),
    }).then()
    return true
  }
}
