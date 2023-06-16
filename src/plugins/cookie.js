

const plugInManager = require('../ESpider/ESpider').plugInManager
const cookiePool1 = plugInManager.newCookiePool('cookiePool1')
module.exports = { cookiePool1 }
// cookiePool1


cookiePool1.add({
    'a':'1',
    'b':'2',
})
cookiePool1.add([
    {
        'c':'3',
        'd':'4',
    },
    {
        'e':'5',
        'f':'6',
    },
])
cookiePool1.add([
    'g=7;h=8;'
    ,
    {
        'i':'9',
        'j':'10',
    },
])

// console.log(cookiePool1.getCookieList());
