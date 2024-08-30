import {defineSpiderEventMetaData} from "@/decorators/common/defineSpiderEventMetaData";
import {SpiderEventEnum} from "@/enum/SpiderEventEnum";

/**
 * 爬虫暂停成功后触发， 因为暂停需要时间， 比如请求收尾和做一些功能暂停
 * 所以在 SpiderPause 之后需要一段时间， 然后成功暂停后才触发 SpiderPaused
 * */
export const SpiderPaused = function (...args: any[]): any {
  return (value: any, context: ClassMethodDecoratorContext) => {
    defineSpiderEventMetaData(SpiderEventEnum.SpiderPaused, value, context, args, false)
  }
}
