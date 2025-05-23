import {Sequelize} from "sequelize";
import {Model, ModelStatic} from "sequelize/types/model";
import {AxiosSessionInstance, AxiosSessionRequestConfig} from "@biggerstar/axios-session";
import {RequestStatusEnum, SpiderEventEnum} from "@/enum/SpiderEventEnum";

export type BaseESpiderInterfaceOptions = {
  /**
   * 爬虫名称
   * */
  name: string
  /** 数据库队列超时时间,单位毫秒
   * @default 12000
   * */
  dbQueueTimeout: number
  /**
   * 请求队列超时时间,单位毫秒
   * @default 12000
   * */
  requestQueueTimeout: number
  /**
   * 请求队列并发数
   * @default 1
   * */
  requestConcurrency: number
  /**
   *  轮询队列的时间周期,单位毫秒
   *  @default 500
   *  */
  queueCheckInterval: number
  /**
   * 请求队列执行请求任务间隔
   * @default 0
   * */
  requestInterval: number
  /**
   * 请求去重选项配置
   * */
  dupeFilterOptions: Partial<DupeFilterOptions>
  /** 任务管理器配置选项 */
  taskOptions: Partial<TaskManagerOptions>
  /**
   * 缓存目录
   * */
  cacheDirPath: string
}
export type SessionESpiderInterfaceOptions = BaseESpiderInterfaceOptions & {
  /**
   *  axiosSession 过期时间，单位毫秒, 超过这个时间将会被弃用,
   *  其中有一个用法就是可以设置成代理IP有效时间，过期将弃用
   *  如果设置成 null 表示永不过期
   *  @default  null
   *  */
  expirationSessionTime: number | null
}

export type SessionESpiderOptions = BaseESpiderInterfaceOptions & SessionESpiderInterfaceOptions

export type TaskManagerOptions = {
  /** 爬虫名称，从主蜘蛛名称同步过来的 */
  name: string
  /** 缓存地址，可以单独指定，默认使用 BaseESpiderInterfaceOptions 类型中 cacheDirPath 的缓存地址 */
  cacheDirPath: string
  /**
   * 当前使用的 sequelize 任务队列连接实例，可以自定义远程数据库
   * 您可以使用 mysql 或者其他数据库
   * 默认使用本地，数据库类型是 sqlite,
   *  ```js
   *     const sequelize = new Sequelize({
   *                           dialect: 'sqlite',
   *                           storage: `./cache.db`,
   *                           logging: false
   *                       })
   *    参数这里接收的就是 sequelize 通过 Sequelize类构造的连接实例
   *  ```
   *
   *  TODO 未来考虑使用 RabbitMQ 等消息队列， 或者 redis
   *
   * */
  sequelize: Sequelize
  /** 控制所有请求数据库表缓存的 sequelize 模型 */
  requestModel: ModelStatic<Model>
  /** 控制正在请求数据库表的 sequelize 模型 */
  pendingModel: ModelStatic<Model>
  /**
   * 每次都清空上一次的请求队列
   * */
  alwaysResetQueue: boolean
}

export type TaskData = {
  taskId: string,
  request: Partial<AxiosSessionRequestConfig>,
  priority: number,
  createTime: number,
}

export type AddRequestTaskOptions = Partial<AxiosSessionRequestConfig> &
  AddRequestTaskOtherOptions &
  {
    /** 是否跳过去重过滤器检查, 在错误事件中自动附加的 */
    __skipCheck__?: boolean,
    proxyString?: never
  }

export type SessionItem = { pending: boolean, session: AxiosSessionInstance, createTime: number }

export type AddRequestTaskOtherOptions = {
  /**
   * 任务优先级
   * */
  priority?: number,
  /**
   * 不检查指纹( 是否重复 )直接添加任务
   * */
  skipCheck?: boolean
}

export type DupeFilterOptions = {
  /**
   * 爬虫名称
   * */
  name: string
  /**
   * 缓存目录
   * */
  cacheDirPath: string
  /**
   * 每次启动清空去重过滤缓存
   * @default false
   * */
  alwaysResetCache: boolean

  /**
   * 布隆基础过滤器 ( bloom-filters ) 的哈希函数的个数
   * @default 2
   * */
  hashes: number

  /**
   * 设置支持的去重请求数量，需要根据开发者做的实际的业务进行设置
   * 默认支持 一亿请求过滤， 可以调高， 但是占用的缓存也会增加，目前缓存占用参考 1亿请求将多占用缓存 16.7m 磁盘内存
   * @default 1e8
   * */
  supportRequestSize: number

  /**
   * 对请求去重进行持久化缓存的间隔
   * 每 5秒 保存一次指纹缓存
   * @default 5 * 1000
   * */
  dupePersistenceInterval: number
  /**
   * 是否开启请求指纹过滤去重
   * @default true
   * */
  enableDupeFilter: boolean
  /** 手动定义去重规则， 返回一个能表示某个请求的唯一 hash */
  filterRule(req: Partial<AxiosSessionRequestConfig>): string
}

export type SpiderEventSetItem = {
  eventName: keyof typeof SpiderEventEnum,
  callName: string | symbol
  value: Function,
  args: any[],
  isMatchUrl: boolean
}
