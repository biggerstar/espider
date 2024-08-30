import {defineSpiderEventMetaData} from "@/decorators/common/defineSpiderEventMetaData";
import {SpiderEventEnum} from "@/enum/SpiderEventEnum";

/**
 *  在 SpiderClose 之后一小段时间后运行， 在关闭成功后触发
 *  因为 close 函数运行后需要进行收尾工作， 比如去重持久化，请求队列清空保存， 用于下次断点续爬
 * */
export const SpiderClosed = function (...args: any[]): any {
  return (value: any, context: ClassMethodDecoratorContext) => {
    defineSpiderEventMetaData(SpiderEventEnum.SpiderClosed, value, context, args, false)
  }
}
