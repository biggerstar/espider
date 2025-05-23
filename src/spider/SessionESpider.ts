import {SessionESpiderOptions, AddRequestTaskOptions} from "@/typings";
import {SessionESpiderInterface} from "@/interface/SessionESpiderInterface";
import {isBoolean, isObject} from "@biggerstar/tools";

export class SessionESpider
  extends SessionESpiderInterface<SessionESpiderOptions> {

  /**
   * 添加任务到本地数据库队列中，支持断点续爬
   * meta字段应该是个可序列化为字符串的普通对象
   * @return boolean 是否添加成功
   * */
  protected addRequestTask<T extends AddRequestTaskOptions>(req: T | string): boolean {
    let finallyReq: Partial<AddRequestTaskOptions> = typeof req === 'string' ? {url: req} : req
    if (!finallyReq.url) {
      throw new Error('[addRequestTask] 您添加的请求任务应该包含 url')
    }
    if (Reflect.has(finallyReq, 'meta') && (!finallyReq.meta || !isObject(finallyReq.meta))) {
      throw new TypeError('[addRequestTask] meta 应该是一个对象')
    }
    if (finallyReq.proxyString) {
      throw new TypeError('[addRequestTask] proxyString 不应该在添加任务的时候使用，您需要在请求发起前的几个钩子进行附加代理')
    }
    let skipCheck: boolean
    if (isBoolean(finallyReq.skipCheck)) {
      skipCheck = finallyReq.skipCheck
    } else {
      skipCheck = !!finallyReq.__skipCheck__
    }
    const fp = this.fingerprint.get(finallyReq)
    /* 这里可以直接通过 finallyReq 确定是否重复， 不需要考虑中间件是否修改了 req 中是否修改了一些字段 */
    if (!skipCheck && this.fingerprint.hasFP(fp)) {
      // console.log('请求指纹重复', finallyReq.url)
      return false
    } else {
      this.fingerprint.addRuntimeFP(fp)
    }

    this.taskManager.addTask({
      taskId: fp,
      request: finallyReq,
      priority: finallyReq.priority || 0,
      createTime: Date.now(),
    }).then()
    return true
  }
}
