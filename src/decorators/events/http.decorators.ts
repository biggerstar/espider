import {createSpiderEventDecorator} from "@/decorators/common/createSpiderEventDecorator";
import {SpiderEventEnum} from "@/enum/SpiderEventEnum";

/**
 * 函数 请求之前 装饰器， 可以获得原始请求对象， 支持传入请求 scope url, 匹配到才会调用 ， 支持正则表达式
 * 当从数据库中取出任务的时候触发
 * */
export const SpiderRequestBefore = createSpiderEventDecorator(SpiderEventEnum.SpiderRequestBefore, true)

/**
 *  函数 发起请求 装饰器， 支持传入请求 scope url, 匹配到才会调用 ， 支持正则表达式
 * */
export const SpiderRequest = createSpiderEventDecorator(SpiderEventEnum.SpiderRequest, true)

/**
 * 函数 请求响应 装饰器， 支持传入请求 scope url, 匹配到才会调用 ， 支持正则表达式
 * 当收到响应信息的时候触发
 * */
export const SpiderResponse = createSpiderEventDecorator(SpiderEventEnum.SpiderResponse, true)

/**
 * 函数 请求错误 装饰器， 支持传入请求 scope url, 匹配到才会调用 ， 支持正则表达式
 * 当收到请求错误信息的时候触发， 规则和 axios 的 catch 一样
 * */
export const SpiderError = createSpiderEventDecorator(SpiderEventEnum.SpiderError, true)

