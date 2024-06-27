import {createRequestDBCache} from "@/db/sequelize";
import {Model, ModelStatic} from "sequelize/lib/model";
import {Sequelize} from "sequelize";
import path from "node:path";
import {TaskData, TaskManagerOptions} from "@/typings";
import {everyHasKeys, isString} from "@biggerstar/tools";
import PQueue from "p-queue";

/**
 * 任务管理
 * requestModel 保存请求任务信息
 * pendingModel 保存当前正在请求的任务
 * 支持获取任务时获取上次意外中断未执行完成的任务
 * */
export class TaskManager {
  public sequelize: Sequelize
  public requestModel: ModelStatic<Model>
  public pendingModel: ModelStatic<Model>
  public historicalTasks: TaskData[]
  public queue: PQueue
  public name: string
  public cacheDirPath: string

  constructor() {
    this.queue = new PQueue({concurrency: 1})
    this.historicalTasks = []
  }

  public async init() {
    if (!this.sequelize) {  // 如果没有手动定义 sequelize 连接，则使用内部默认
      this.sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.resolve(this.cacheDirPath, `${this.name}.request.sqlite3`),
        logging: false
      })
    }
    if (!this.requestModel || !this.pendingModel) {
      const models = await createRequestDBCache(this.sequelize, this.name)
      if (!this.requestModel) this.requestModel = models.requests
      if (!this.pendingModel) this.pendingModel = models.pending
    }
    const historyTaskList = await this.pendingModel.findAll({order: [['priority', 'DESC']]})
    this.historicalTasks = historyTaskList.map(dbRes => {
      const task = dbRes.dataValues
      task.request = JSON.parse(task.request)
      return task
    })
  }

  public setOptions(opt: Partial<TaskManagerOptions> = {}): this {
    const whiteList: Array<keyof TaskManagerOptions> = [
      'name',
      'cacheDirPath',
      'sequelize',
      'requestModel',
      'pendingModel',
    ]
    whiteList.forEach((name: any) => everyHasKeys(this, opt, [name]) && (this[name] = opt[name]))
    return this
  }

  /**
   * 添加任务到数据库中，如果不存在创建， 如果存在则更新
   * */
  public addTask(taskData: TaskData) {
    if (!isString(taskData.request)) {
      taskData.request = JSON.stringify(taskData.request) as any
    }
    return this.queue.add(async () => {
      const [_, created] = await this.requestModel
        .findOrCreate({
          where: {taskId: taskData.taskId},
          defaults: taskData
        })
      if (!created) {
        await this.requestModel.update(taskData, {
          where: {taskId: taskData.taskId}
        })
      }
    })
  }

  /**
   * @param len 传入所需获取的任务个数
   * 任务取出来后立马会被放置到 pendingModel 引用的数据库中
   * */
  public async getTask(len: number): Promise<TaskData[]> {
    let taskList: TaskData[]
    /* 先看看是否有上次任务停止时未完成的任务 */
    if (this.historicalTasks.length >= len) {
      taskList = this.historicalTasks.splice(0, len)
    } else {
      taskList = [...this.historicalTasks]
      this.historicalTasks = []
    }
    const requireLen = len - taskList.length
    // console.log('requireLen', requireLen)
    if (requireLen <= 0) return taskList
    return new Promise((resolve) => {
      /* 看看除了历史任务还需要从数据库补多少任务 */
      return this.queue.add(async () => {
        // console.log('requestModel before count', await this.requestModel.count());
        // console.log('pendingModel before count', await this.pendingModel.count());
        const foundTaskList = await this.requestModel
          .findAll({
            limit: requireLen,
            order: [['priority', 'DESC']]   // 按优先级排序获取
          })
        const taskInfoList = foundTaskList.map(dbRes => dbRes.dataValues)
        // console.log(taskInfoList)
        for (const k in taskInfoList) {
          const task = taskInfoList[k]
          const [_, created] = await this.pendingModel
            .findOrCreate({
              where: {taskId: task.taskId},
              defaults: task
            })
          if (!created) {
            await this.pendingModel.update(task, {
              where: {taskId: task.taskId}
            })
          }
        }
        for (const k in foundTaskList) {
          await foundTaskList[k].destroy()
        }
        // console.log('requestModel count', await this.requestModel.count());
        // console.log('pendingModel count', await this.pendingModel.count());
        taskInfoList.forEach(task => task.request = JSON.parse(task.request))
        taskList = taskList.concat([...taskInfoList])
        resolve(taskList)
      })
    })
  }

  /**
   * 通过 taskId 移除请求任务， 通常在任务完成后使用
   * */
  public async removeRequestTask(taskId: string) {
    await this.requestModel.destroy({where: {taskId}})
  }

  /**
   * 通过 taskId 移除当前正在请求数据库中的缓存任务， 通常在任务完成后使用
   * */
  public async removePendingTask(taskId: string) {
    await this.pendingModel.destroy({where: {taskId}})
  }
}
