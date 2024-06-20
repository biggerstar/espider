import {DataTypes, Sequelize} from 'sequelize'

export async function createRequestDBCache(sequelizeConnect: Sequelize, name: string) {
  if (!name) {
    throw new Error('请传入要创建的数据库队列名称')
  }
  const RequestCache = sequelizeConnect.define(`${name}-task-queue`, {
    'task-id': {    // ID
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    status: {  // 状态
      type: DataTypes.INTEGER,
      allowNull: false
    },
    data: {  // axios 请求字符串
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
