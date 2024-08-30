import {defineSpiderEventMetaData} from "@/decorators/common/defineSpiderEventMetaData";
import {SpiderEventEnum} from "@/enum/SpiderEventEnum";

/**
 * 函数 请求错误 装饰器， 可以传入请求 scope url, 匹配到才会调用 ， 支持正则表达式
 * 当收到请求错误信息的时候触发， 规则和 axios 的 catch 一样
 * */
export const SpiderError = function (...args: any[]): any {
  return (value: any, context: ClassMethodDecoratorContext) => {
    defineSpiderEventMetaData(SpiderEventEnum.SpiderError, value, context, args, false)
  }
}
