import {defineSpiderEventMetaData} from "@/decorators/common/defineSpiderEventMetaData";
import {SpiderEventEnum} from "@/enum/SpiderEventEnum";

/**
 * 函数 任务取出 装饰器， 可以传入请求 scope url, 匹配到才会调用 ， 支持正则表达式
 * 当从数据库中取出任务的时候触发
 * */
export const SpiderRequestTask = function (...args: any[]): any {
  return (value: any, context: ClassMethodDecoratorContext) => {
    defineSpiderEventMetaData(SpiderEventEnum.SpiderRequestTask, value, context, args, false)
  }
}
