import {defineSpiderEventMetaData} from "@/decorators/common/defineSpiderEventMetaData";
import {SpiderEventEnum} from "@/enum/SpiderEventEnum";

/**
 *  函数 发起请求 装饰器， 可以传入请求 scope url, 匹配到才会调用 ， 支持正则表达式
 * */
export const SpiderRequest = function (...args: any[]): any {
  return (value: any, context: ClassMethodDecoratorContext) => {
    defineSpiderEventMetaData(SpiderEventEnum.SpiderRequest, value, context, args, true)
  }
}
