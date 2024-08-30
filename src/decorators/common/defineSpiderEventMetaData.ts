import {SpiderEventEnum} from "@/enum/SpiderEventEnum";
import {SpiderEventSetItem} from "@/typings";

/**
 * 为类方法定义事件元数据
 * */
export function defineSpiderEventMetaData(
  /**
   * 事件 的名称
   * */
  eventName: keyof typeof SpiderEventEnum,
  /**
   * 装饰器 装饰的函数
   * */
  value: any,
  /**
   * 新版 装饰器 上下文
   * */
  context: ClassMethodDecoratorContext,
  /**
   * 装饰器 传入的形参
   * */
  args: any[],
  /**
   * 是否匹配 url
   * */
  isMatchUrl: boolean = false
) {
  if (context.kind !== "method") {
    throw new Error(
      `@${eventName}-${context.name.toString()} can only be used on methods as it needs the target class to be fully defined`,
    );
  }
  context.addInitializer(function () {
    let eventSet: Set<SpiderEventSetItem> | void = Reflect.getMetadata(eventName, this)
    if (!eventSet) {
      eventSet = new Set<SpiderEventSetItem>()
      Reflect.defineMetadata(eventName, eventSet, this);
    }
    eventSet.add({
      eventName: eventName,
      callName: context.name,
      value: value,
      args,
      isMatchUrl
    })
  })
}
