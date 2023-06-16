
const plugInManager = require('../ESpider/ESpider').plugInManager
const HeadersPool = plugInManager.newHeaderPool(' HeadersPool ')
module.exports = { HeadersPool }
// HeadersPool

HeadersPool.add([
    {
        'Accept':'*/*',
        'Accept-Language':'*/*',
        'Accept111-Language':'*/*',

    },{
        'Accept':'*/*',
        'Accept222-Language':'*/*',

    }
])


// console.log(HeadersPool.getHeadersList());



