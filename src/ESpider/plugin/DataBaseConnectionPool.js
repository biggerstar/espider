
const { Sequelize, Model, DataTypes } = require("sequelize");
const sequelize = new Sequelize("sqlite::memory:");

const User = sequelize.define("user", {
    name: DataTypes.TEXT,
    favoriteColor: {
        type: DataTypes.TEXT,
        defaultValue: 'green'
    },
    age: DataTypes.INTEGER,
    cash: DataTypes.INTEGER
});

(async () => {
    await sequelize.sync({ force: true });
    // 这里是代码
})();


class DataBaseConnectionPool {
    #customConnectionList = []
    #isRunning= false
    constructor() {
    }

    //############################################################
    spiderOpen(){
        if (this.#isRunning === false)  this.start()
    }
    //#########################################################
}


class HeaderPoolManager {
    pools = {}

    constructor() {
    }
    static getInstance(){
        if(!this.Instance)  this.Instance = new HeaderPoolManager()
        return this.Instance
    }
    newConnection(name) {
        if (typeof name === 'string') {
            if (this.pools[name.trim()]) throw new Error(name +　'该数据库连接池已存在')
            const Pool = new HeaderPool()
            this.pools[name.trim()] = Pool
            return Pool
        }
    }

    getConnection(name) {
        if (!this.pools[name.trim()]) throw new Error(name +　'该数据库连接池不存在')
        return this.pools[name]
    }
    closeConnection(name){

    }

}

module.exports = HeaderPool














