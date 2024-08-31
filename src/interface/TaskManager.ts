import {createRequestDBCache} from "@/db/sequelize";
import {Model, ModelStatic} from "sequelize/lib/model";
import {Sequelize} from "sequelize";
import path from "node:path";
import {TaskData, TaskManagerOptions} from "@/typings";
import {sleep} from "@biggerstar/tools";
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
  public alwaysResetQueue: boolean
  /** 当前正在数据库读取任务的个数计数器 */
  public readingCounter: number

  constructor() {
    this.queue = new PQueue({concurrency: 1})
    this.historicalTasks = []
    this.alwaysResetQueue = false
    this.readingCounter = 0
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
    if (this.alwaysResetQueue) {
      // 每次重启的时候清空历史的队列数据库
      await this.pendingModel.destroy({truncate: true})
      await this.requestModel.destroy({truncate: true})
    }
    const historyTaskList = await this.pendingModel.findAll({
      order: [
        ['priority', 'DESC'],
        ['createTime', 'ASC']
      ]
    })
    this.historicalTasks = historyTaskList.map(dbRes => dbRes.dataValues)
  }

  public setOptions(opt: Partial<TaskManagerOptions> = {}): this {
    const whiteList: Array<keyof TaskManagerOptions> = [
      'name',
      'cacheDirPath',
      'sequelize',
      'requestModel',
      'pendingModel',
      'alwaysResetQueue',
    ]
    whiteList.forEach((name: any) => {
      if (opt[name] !== undefined) {
        this[name] = opt[name]
      }
    })
    return this
  }

  /**
   * 添加任务到数据库中，如果不存在创建， 如果存在则更新
   * */
  public addTask(taskData: TaskData) {
    if (!taskData.request) taskData.request = {}
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
   * 增加计数正在数据库中读取的任务数
   * */
  private increaseCounter(len: number, async: boolean = false) {
    if (async) {
      sleep(10).then(() => this.readingCounter = len)  // sleep 类似 nextick
    } else {
      this.readingCounter = len
    }
  }

  /**
   * 减少计数正在数据库中读取的任务数
   * */
  private decreaseCounter(len: number, async: boolean = false) {
    const newNumber = Math.max(0, this.readingCounter - len)
    if (async) {
      sleep(10).then(() => this.readingCounter = newNumber)
    } else {
      this.readingCounter = newNumber
    }
  }

  /**
   * @param len 传入所需获取的任务个数
   * 任务取出来后立马会被放置到 pendingModel 引用的数据库中
   * */
  public async getTask(len: number): Promise<TaskData[]> {
    if (!isFinite(len)) {
      throw new Error('len must be a finite number')
    }
    let taskList: TaskData[]
    this.increaseCounter(len)
    /* 先看看是否有上次任务停止时未完成的任务 */
    if (this.historicalTasks.length >= len) {
      taskList = this.historicalTasks.splice(0, len)
    } else {
      taskList = [...this.historicalTasks]
      this.historicalTasks = []
    }
    const requireLen = len - taskList.length
    // console.log('requireLen', requireLen)
    if (requireLen <= 0) {
      this.decreaseCounter(len, true)
      return taskList
    }
    return new Promise((resolve) => {
      /* 看看除了历史任务还需要从数据库补多少任务 */
      return this.queue.add(async () => {
        const foundTaskList = await this.requestModel
          .findAll({
            limit: requireLen,
            order: [
              ['priority', 'DESC'],
              ['createTime', 'ASC']
            ]   // 按优先级排序获取, 然后按时间早的排序
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
        taskList = taskList.concat([...taskInfoList])
        resolve(taskList)
        this.decreaseCounter(len, true)
      })
    })
  }

  /**
   * 通过 taskId 移除请求任务， 通常在任务完成后使用
   * */
  public async removeRequestTask(taskId: string) {
    return this.queue.add(() => this.requestModel.destroy({where: {taskId}}))
  }

  /**
   * 通过 taskId 移除当前正在请求数据库中的缓存任务， 通常在任务完成后使用
   * */
  public async removePendingTask(taskId: string) {
    return this.queue.add(() => this.pendingModel.destroy({where: {taskId}}))
  }
}
