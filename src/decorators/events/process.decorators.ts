import {createSpiderEventDecorator} from "@/decorators/common/createSpiderEventDecorator";
import {SpiderEventEnum} from "@/enum/SpiderEventEnum";


/**
 * 爬虫准备就绪，所有功能都初始化完毕，可以获取任何类对象
 * 主要用于爬虫添加网址操作
 * 在 SpiderStarted 事件之后触发
 * */
export const SpiderReady = createSpiderEventDecorator(SpiderEventEnum.SpiderReady)

/**
 * 爬虫启动装饰器，此时爬虫主要功能还未启动， 用于做一些初始化操作
 * 在运行实例上 start 函数时触发
 * */
export const SpiderStart = createSpiderEventDecorator(SpiderEventEnum.SpiderStart)

/**
 * 爬虫启动成功之后触发， 在 SpiderStart 之后, 在 SpiderReady 之前运行
 * 此时爬虫主要功能全部加载完毕， 可以直接获得全功能操作能力
 * */
export const SpiderStarted = createSpiderEventDecorator(SpiderEventEnum.SpiderStarted)

/**
 * 请求队列为空的时候触发，用于添加新请求
 * */
export const SpiderIdle = createSpiderEventDecorator(SpiderEventEnum.SpiderIdle)

/**
 * 当运行实例上的函数 pause 时触发
 * */
export const SpiderPause = createSpiderEventDecorator(SpiderEventEnum.SpiderPause)

/**
 * 爬虫暂停成功后触发， 因为暂停需要时间， 比如请求收尾和做一些功能暂停
 * 所以在 SpiderPause 之后需要一段时间， 然后成功暂停后才触发 SpiderPaused
 * */
export const SpiderPaused = createSpiderEventDecorator(SpiderEventEnum.SpiderPaused)

/**
 * 爬虫在运行实例上的 close 函数时触发，
 * 关闭之后不能再启动实例
 * */
export const SpiderClose = createSpiderEventDecorator(SpiderEventEnum.SpiderClose)

/**
 *  在 SpiderClose 之后一小段时间后运行， 在关闭成功后触发
 *  因为 close 函数运行后需要进行收尾工作， 比如去重持久化，请求队列清空保存， 用于下次断点续爬
 * */
export const SpiderClosed = createSpiderEventDecorator(SpiderEventEnum.SpiderClosed)

/**
 * 成功创建 session 之后触发， 此时可以在这个事件里面进行添加代理， 修改请求头， 或者一些其他操作
 * */
export const SpiderCreateSession = createSpiderEventDecorator(SpiderEventEnum.SpiderCreateSession)

