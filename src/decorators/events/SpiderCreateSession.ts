import {defineSpiderEventMetaData} from "@/decorators/common/defineSpiderEventMetaData";
import {SpiderEventEnum} from "@/enum/SpiderEventEnum";

/**
 * 成功创建 session 之后触发， 此时可以在这个事件里面进行添加代理， 修改请求头， 或者一些其他操作
 * */
export const SpiderCreateSession = function (...args: any[]): any {
  return (value: any, context: ClassMethodDecoratorContext) => {
    defineSpiderEventMetaData(SpiderEventEnum.SpiderCreateSession, value, context, args, false)
  }
}
