import {BaseESpiderInterface} from "@/interface";
import {SpiderEventEnum} from "@/enum/SpiderEventEnum";
import {SpiderEventSetItem} from "@/typings";

/**
 * 回调事件到所有定义了某名称装饰器的函数上
 * */
export async function callDecoratorEvent(
  spiderInstance: BaseESpiderInterface,
  eventName: keyof typeof SpiderEventEnum,
  matchUrl: string | null = null,
  callback?: (cb: Function) => Promise<any>
) {
  if (!Object.keys(SpiderEventEnum).includes(eventName)) return
  const instanceSetEvents: Set<SpiderEventSetItem> | void = Reflect.getMetadata(eventName, spiderInstance)
  if (!instanceSetEvents) return
  for (const item of instanceSetEvents) {
    if (item.eventName !== eventName) continue
    /* 如果指定需要匹配 url scope, 但是匹配不到则不执行  */
    if (item.isMatchUrl && item.args[0] && !(new RegExp(item.args[0])).test(matchUrl)) continue
    /* 如果定义回调函数的话， 将会把事件对应装饰的函数执行权限交给外部去执行  */
    try {
      if (callback) await callback(item.value.bind(spiderInstance))
      else await item.value.call(spiderInstance)
    }catch (e) {
      console.error(e)
    }
  }
}
