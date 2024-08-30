import {SpiderEventEnum} from "@/enum/SpiderEventEnum";
import {defineSpiderEventMetaData} from "@/decorators/common/defineSpiderEventMetaData";

/**
 * 爬虫准备就绪，所有功能都初始化完毕，可以获取任何类对象
 * 主要用于爬虫添加网址操作
 * 在 SpiderStarted 事件之后触发
 * */
export const SpiderReady = function (...args: any[]): any {
  return (value: any, context: ClassMethodDecoratorContext) => {
    defineSpiderEventMetaData(SpiderEventEnum.SpiderReady, value, context, args, false)
  }
}
 
