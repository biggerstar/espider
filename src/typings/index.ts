import {Sequelize} from "sequelize";
import {Model, ModelStatic} from "sequelize/types/model";
import {AxiosSessionInstance, AxiosSessionRequestConfig} from "@biggerstar/axios-session";
import {ESpider} from "../ESpider";


export type BaseESpiderOptions = {
  /**
   * 爬虫名称
   * */
  name: string
  /** 数据库队列超时时间,单位毫秒
   * @default 12000
   * */
  dbQueueTimeout: number
  /**
   * 数据库队列并发数
   * @default 1
   * */
  dbQueueConcurrency: number
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
  dupeFilterOptions: DupeFilterOptions
  /**
   * 缓存目录
   * */
  cacheDirPath: string
}
export type SessionSpiderOptions = BaseESpiderOptions & {
  /**
   *  axiosSession 过期时间，单位毫秒, 超过这个时间将会被弃用,
   *  其中有一个用法就是可以设置成代理IP有效时间，过期将弃用
   *  @default  5 * 60 * 1000
   *  */
  expirationSessionTime: number
}

export type ESpiderOptions = BaseESpiderOptions & SessionSpiderOptions & {
  /**
   * 当前使用的 sequelize 任务队列连接实例，可以自定义远程数据库
   * 您可以使用 mysql 或者其他数据库
   * 默认使用本地，数据库类型是 sqlite,
   *  ```js
   *     const sequelize = new Sequelize({
   *                           dialect: 'sqlite',
   *                           storage: `./cache.sqlite3`,
   *                           logging: false
   *                       })
   *    参数这里接收的就是 sequelize 通过 Sequelize类构造的连接实例
   *  ```
   *
   *  TODO 未来考虑使用 RabbitMQ 等消息队列， 或者 redis
   *
   * */
  sequelize: Sequelize
  /**
   * 请求队列的 sequelize 实例
   * */
  requestQueueModel: ModelStatic<Model>
}
export type ESpiderEventNames = SessionESpiderEventNames &
  string
  | 'onStart'
  | 'onPause'
  | 'onClose'
  | 'onClosed'
  | 'onRequest'
  | 'onResponse'
  | 'onError'
  | 'onCompleted'
  | 'onRequestTask'

export type SessionESpiderEventNames = 'onCreateSession'

export type SessionItem = { pending: boolean, session: AxiosSessionInstance, lastUsageTime: number }
export type SpiderTask<Task extends Record<any, any> | string> = {
  name: string,
  status: 'ready' | 'pending' | 'done',
  data: Task,
  timestamp: number
}

export type DupeFilterOptions = {
  /**
   * 每次启动清空去重过滤缓存
   * @default false
   * */
  requestFilterReset: boolean

  /**
   * 布尔基础过滤器 ( bloom-filters ) 的哈希函数的个数
   * @default 2
   * */
  hashes: boolean

  /**
   * 设置支持的去重请求数量，需要根据开发者做的实际的业务进行设置
   * 默认支持 一亿请求过滤， 可以调高， 但是占用的缓存也会增加，目前增加 1亿请求将多占用缓存 16.7m 磁盘内存
   * @default 1e8
   * */
  supportRequestSize: boolean

  /**
   * 去重缓存文件的存放路径
   * 默认放启动路径， 如果是包运行则在包根路径
   * @default './.cache/request.filter'
   * */
  dupeFilterCacheFilePath: string

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
  enableDupeFilter: number
  /** 手动去重， 手动返回一个某个请求的唯一 hash */
  filterRule(req: AxiosSessionRequestConfig): string
}

