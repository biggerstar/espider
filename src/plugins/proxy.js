const axios = require("axios");

const plugInManager = require('../ESpider/ESpider').plugInManager


const ProxyPool1 = plugInManager.newProxyPool('ProxyPool1')
module.exports={ ProxyPool1 }
ProxyPool1.setPoolLen(2).setGlobalSurvivalTime(50000)

// p.add(['1.1.1.1:8888','2.2.2.2:9999','3.3.3.3:8080','4.4.4.4:6688'])
// p.add(['1.1.1.1:8888'])


const pandas = {
    url:'http://pandavip.xiongmaodaili.com/xiongmao-web/apiPlus/vgl?secret=27c02803db8c44f73e42713eec11d397&orderNo=VGL20210814005634KK1xe6x7&count=1&isTxt=0&proxyType=1&validTime=0&removal=0&cityIds=',

    // hostName:'ip',
    // portName:'port',
    // time:5000,
    extractDelay:3000,
    // available:false,
    // max:1,
    controlName:'count',
    message:'当前使用的是熊猫代理',
    callback:async (res,option)=>{
        // console.log(res.data);
        // console.log(await ProxyPool1.getProxyListSync())
    }

}
const jiLight = {
    url:'http://d.jghttp.alicloudecs.com/getip?num=3&type=2&pro=&city=0&yys=0&port=11&time=4&ts=0&ys=0&cs=0&lb=1&sb=0&pb=4&mr=1&regions=',
    controlName:'num',
    params:{ },
    // max:1,
    extractDelay:3000,
    // hostName:'ip',
    // portName:'port',
    time:30000,
    // survivalTime:15000,   // 后面改成这个参数，现在是time为准
    // available:true,
    message:`当前使用的是极光代理`,
    // prepare:(option)=>{
    //
    // },
    callback:async (result,option)=>{
        let data = result.data
        if (data.code !== 0)  console.log(data)
        // else console.log('callback',await ProxyPool1.getProxyListSync())
        // console.log('getProxyList',ProxyPool1.getProxyList())
        const key = '2fdbba9a8fd96251e25cbbc292ef5e16'
        const neek = '36273'
        if (data.code === 113){
            let ip = data['msg'].replace('请添加白名单','')
            const url = 'http://webapi.jghttp.alicloudecs.com/index/index/save_white?neek='+key+'&appkey='+key+'&white=' + ip
            axios.get(url).then(r => {
                console.log(r.data);
            })
        }
        // console.log(option);
        // option.max = 2
    }
}

// ProxyPool1.autoUpdateFromInternet(jiLight)
ProxyPool1.autoUpdateFromInternet(pandas)
ProxyPool1.followESpiderClose()
ProxyPool1.start()
ProxyPool1.waitUntilPoolFull()
// p.autoUpdateFromInternet([pandas])
// ProxyPool1.followSpiderClose()
// ProxyPool1.start()
// ProxyPool1.start().waitUntilPoolFull().then(()=>{
//     console.log(1111,ProxyPool1.getProxyList());
// })


// p.handleUpdateProxy({
//     hostName:'',
//     portName:'',
//     max:2,
//     // available:false,
//     time:20000,
//     extractDelay:10000,
//     message:'手动模式当前使用的是极光代理',
//     handleUpdate: async function(option){
//         console.log('option.offset',option.offset);
//
//         const url = 'http://d.jghttp.alicloudecs.com/getip?num='+option.offset+'&type=2&pro=&city=0&yys=0&port=11&time=4&ts=0&ys=0&cs=0&lb=1&sb=0&pb=4&mr=1&regions='
//
//         let result = await axios.get(url)
//         let data = result.data
//         // console.log('handleUpdate',data);
//
//
//         if (data.ESpider === 113){
//             let ip = data['msg'].replace('请添加白名单','')
//             const url = 'https://webapi.jghttp.alicloudecs.com/index/index/save_white?neek=36273&appkey=2fdbba9a8fd96251e25cbbc292ef5e16&white=' + ip
//             axios.get(url).then(r => {
//                 console.log(r.data);
//             })
//             return null
//         }
//         // return  axios.get(url)
//         return data
//
//     },
// })



// console.log('开始');

// p.waitUntilPoolFull()
// console.log(p.getProxyList());
// p.setMaxErrCount(3)
// p.errCount('1.1.1.1:8888')
// p.errCount('1.1.1.1:8888')
// p.errCount('1.1.1.1:8888')

// console.time('test')

// console.log(p.getProxyList());
// console.log(p.getOneProxy());
// setTimeout(()=>{
//     p.close()
//     console.log('关闭代理池');
//     console.timeEnd('test')
// },12000)


