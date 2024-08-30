import {defineSpiderEventMetaData} from "@/decorators/common/defineSpiderEventMetaData";
import {SpiderEventEnum} from "@/enum/SpiderEventEnum";

/**
 * 爬虫启动成功之后触发， 在 SpiderStart 之后, 在 SpiderReady 之前运行
 * 此时爬虫主要功能全部加载完毕， 可以直接获得全功能操作能力
 * */
export const SpiderStarted = function (...args: any[]): any {
  return (value: any, context: ClassMethodDecoratorContext) => {
    defineSpiderEventMetaData(SpiderEventEnum.SpiderStarted, value, context, args, false)
  }
}
