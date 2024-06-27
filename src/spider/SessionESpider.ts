import {AddRequestTaskOptions, AddRequestTaskOtherOptions, SessionESpiderOptions} from "@/typings";
import {SessionESpiderInterface} from "@/interface/SessionESpiderInterface";
import {SessionESpiderMiddleware} from "@/middleware/SpiderMiddleware";
import {AxiosSessionRequestConfig} from "@biggerstar/axios-session";
import {isObject} from "@biggerstar/tools";

export class SessionESpider
  extends SessionESpiderInterface<
    SessionESpiderOptions,
    SessionESpiderMiddleware
  >
  implements SessionESpiderMiddleware {
  constructor() {
    super();
  }
  /**
   * 配置爬虫
   * */
  public setOptions(opt: Partial<SessionESpiderOptions> = {}): this {
    super.setOptions(opt)
    return this
  }

  public async close(): Promise<boolean> {
    return super.close()
  }

  public async pause(): Promise<boolean> {
    return super.pause()
  }

  public async start(): Promise<boolean> {
    return super.start()
  }

  /**
   * 添加任务到本地数据库队列中，支持断点续爬
   * meta字段应该是个可序列化为字符串的普通对象
   * */
  public addRequestTask<T extends Partial<AxiosSessionRequestConfig>, R extends any>(
    req: T | string,
    options: Partial<AddRequestTaskOtherOptions> = {}
  ): R | void {
    let finallyReq: Partial<AddRequestTaskOptions> = typeof req === 'string' ? {url: req} : req
    if (!finallyReq.url) {
      throw new Error('[addRequestTask] 您添加的请求任务应该包含 url')
    }
    if (Object.hasOwn(finallyReq, 'meta') && (!finallyReq.meta || !isObject(finallyReq.meta))) {
      throw new TypeError('[addRequestTask] meta 应该是一个对象')
    }
    const fp = this.fingerprint.get(finallyReq)
    /* 这里可以通过 finallyReq 确定是否重复， 不需要考虑中间件是否修改了 req 中是否修改了一些字段 */
    if (this.fingerprint.hasFP(fp)) {
      console.log('请求指纹重复', finallyReq.url)
      return
    }
    const taskData = {
      taskId: fp,
      request: finallyReq,
      priority: options.priority || 0,
      createTime: Date.now(),
    }
    this.taskManager.addTask(taskData).then()
  }
}
