import {defineSpiderEventMetaData} from "@/decorators/common/defineSpiderEventMetaData";
import {SpiderEventEnum} from "@/enum/SpiderEventEnum";

/**
 * 函数 请求响应 装饰器， 可以传入请求 scope url, 匹配到才会调用 ， 支持正则表达式
 * 当收到响应信息的时候触发
 * */
export const SpiderResponse = function (...args: any[]): any {
  return (value: any, context: ClassMethodDecoratorContext) => {
    defineSpiderEventMetaData(SpiderEventEnum.SpiderResponse, value, context, args, false)
  }
}
