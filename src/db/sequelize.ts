import {DataTypes, Sequelize} from 'sequelize'

export async function createRequestDBCache(sequelizeConnect: Sequelize, name: string) {
  if (!name) {
    throw new Error('请传入要创建的数据库队列名称')
  }
  const RequestCache = sequelizeConnect.define(`${name}-task-queue`, {
    taskId: {     
      type: DataTypes.STRING,
      primaryKey: true,
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    // data是请求任务的信息， 通常包含url和一些参数，
    // 请注意: 例如请求头需要包含最新时间戳，此时不建议包含请求头和请求体或者时间戳有关的信息, 您如果要包含请求头或者请求体，应该在任务取出时进行构造，这样可以确保该请求时间有效性  
    data: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    timestamp: {  // axios 请求字符串
      type: DataTypes.INTEGER,
      allowNull: false
    },
  }, {
    timestamps: false
  })
  await sequelizeConnect.sync().then()
  await sequelizeConnect.authenticate().then(_ => void 0)
  return RequestCache
}
