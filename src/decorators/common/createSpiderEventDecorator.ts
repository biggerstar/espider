import {SpiderEventEnum} from "@/enum/SpiderEventEnum";
import {defineSpiderEventMetaData} from "@/decorators";

/**
 * 创建一个 事件方法 装饰器
 * */
export function createSpiderEventDecorator(eventName: keyof typeof SpiderEventEnum, isMatchUrl: boolean = false) {
  return function (...customInjectArgs: any[]): MethodDecorator {
    return (...decoratorArgs: any[]) => {
      defineSpiderEventMetaData(eventName, decoratorArgs, customInjectArgs, isMatchUrl)
    }
  }
}
