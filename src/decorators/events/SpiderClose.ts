import {defineSpiderEventMetaData} from "@/decorators/common/defineSpiderEventMetaData";
import {SpiderEventEnum} from "@/enum/SpiderEventEnum";

/**
 * 爬虫在运行实例上的 close 函数时触发，
 * 关闭之后不能再启动实例
 * */
export const SpiderClose = function (...args: any[]): any {
  return (value: any, context: ClassMethodDecoratorContext) => {
    defineSpiderEventMetaData(SpiderEventEnum.SpiderClose, value, context, args, false)
  }
}
