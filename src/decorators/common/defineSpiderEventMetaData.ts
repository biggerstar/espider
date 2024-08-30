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
   * 标准版本或者传统版本的 装饰器参数， 长度两个的是标准版本 (value, context) ， 长度三个的是传统版本 ( target, key, descriptor )
   * */
  decoratorArgs: any[],
  /**
   * 装饰器 传入的形参
   * */
  customInjectArgs: any[],
  /**
   * 是否匹配 url
   * */
  isMatchUrl: boolean 
) {
  if (decoratorArgs.length === 2) {
    const [value, context] = decoratorArgs as [Function, ClassMethodDecoratorContext];
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
        args: customInjectArgs,
        isMatchUrl
      })
    })
  } else {
    const [target, key, descriptor] = decoratorArgs as [Function, string, PropertyDescriptor];
    if (!target?.constructor?.name) {
      throw new Error(
        `@${eventName}-${key} can only be used on methods as it needs the target class to be fully defined`,
      );
    }
    let eventSet: Set<SpiderEventSetItem> | void = Reflect.getMetadata(eventName, target)
    if (!eventSet) {
      eventSet = new Set<SpiderEventSetItem>()
      Reflect.defineMetadata(eventName, eventSet, target);
    }
    eventSet.add({
      eventName: eventName,
      callName: key,
      value: descriptor.value,
      args: customInjectArgs,
      isMatchUrl
    })
  }
}














