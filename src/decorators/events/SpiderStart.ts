import {defineSpiderEventMetaData} from "@/decorators/common/defineSpiderEventMetaData";
import {SpiderEventEnum} from "@/enum/SpiderEventEnum";

/**
 * 爬虫启动装饰器，此时爬虫主要功能还未启动， 用于做一些初始化操作
 * 在运行实例上 start 函数时触发 
 * */
export const SpiderStart = function (...args: any[]): any {
  return (value: any, context: ClassMethodDecoratorContext) => {
    defineSpiderEventMetaData(SpiderEventEnum.SpiderStart, value, context, args, false)
  }
}
