import {defineSpiderEventMetaData} from "@/decorators/common/defineSpiderEventMetaData";
import {SpiderEventEnum} from "@/enum/SpiderEventEnum";

/**
 * 请求队列为空的时候触发，用于添加新请求
 * */
export const SpiderIdle = function (...args: any[]): any {
  return (value: any, context: ClassMethodDecoratorContext) => {
    defineSpiderEventMetaData(SpiderEventEnum.SpiderIdle, value, context, args, false)
  }
}
