import {Sequelize} from "sequelize";
import {Model, ModelStatic} from "sequelize/types/model";
import {AxiosSessionInstance} from "@biggerstar/axios-session";

export type ESpiderOptions = {
    /** 数据库队列超时时间,单位毫秒 */
    dbQueueTimeout: number
    /** 数据库队列并发数 */
    dbQueueConcurrency: number
    /** 请求队列超时时间,单位毫秒 */
    requestQueueTimeout: number
    /** 请求队列并发数 */
    requestConcurrency: number
    /** 轮询队列的时间周期,单位毫秒 */
    queueCheckInterval: number
    /** 请求队列执行请求任务间隔 */
    requestInterval: number
    /**
     * axiosSession 过期时间，单位毫秒, 超过这个时间将会被弃用,
     *  其中有一个用法就是可以设置成代理IP有效时间，过期将弃用
     *  */
    expirationSessionTime: number
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

    requestQueueModel: ModelStatic<Model>

}
export type EventNames = 'onRequest' | 'onResponse' | 'onError' | 'onCompleted' | 'onCreateSession' | 'onTask'
export type SessionItem = { pending: boolean, session: AxiosSessionInstance, lastUsageTime: number }
export type SpiderTask<Task extends Record<any, any> | string> = {
    name: string,
    type: 'local' | 'distributed',
    status: 'ready' | 'pending' | 'done',
    data: Task,
    timestamp: number
}
