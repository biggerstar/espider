// console.log(__dirname);

const plugInManager = require('../ESpider/ESpider').plugInManager
const pool1 = plugInManager.newUaPool('pool1')
// pool1
pool1.useDefaultUserAgents()

// console.log(pool1.getOneUserAgents());


module.exports = { pool1 }



