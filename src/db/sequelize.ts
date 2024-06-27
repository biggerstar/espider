import {DataTypes, Sequelize} from 'sequelize'
import {Model} from "sequelize/types/model";
import {ModelStatic} from "sequelize/lib/model";

type createRequestDBCache = {
  pending: ModelStatic<Model>,
  requests: ModelStatic<Model>,
}

export async function createRequestDBCache(sequelizeConnect: Sequelize, name: string): Promise<createRequestDBCache> {
  if (!name) {
    throw new Error('请传入当前的爬虫名称')
  }
  const requestDefine = {
    taskId: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    // request 是请求任务的信息， 通常包含url和一些参数，
    // 请注意: 例如请求头需要包含最新时间戳，此时不建议包含请求头和请求体或者时间戳有关的信息, 您如果要包含请求头或者请求体，应该在任务取出时进行构造，这样可以确保该请求时间有效性  
    request: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    createTime: {  // axios 请求字符串
      type: DataTypes.INTEGER,
      allowNull: false
    },
  }
  const RequestCacheModel = sequelizeConnect
    .define(`request-tasks`, requestDefine, {
      timestamps: false
    })
  const PendingCacheModel = sequelizeConnect
    .define(`pending-tasks`, requestDefine, {
      timestamps: false
    })
  await sequelizeConnect.sync().then()
  await sequelizeConnect.authenticate().then(_ => void 0)
  return {
    pending: PendingCacheModel,
    requests: RequestCacheModel,
  }
}
