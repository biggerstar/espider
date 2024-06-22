import axios from "axios";

export async function getProxyString(num = 1) {
  let proxyString = ''
  for (let i = 0; i < 3; i++) {
    // 高效套餐（ 按量 ）
    const xiongMaoUrl1 = `http://route.xiongmaodaili.com/xiongmao-web/api/glip?secret=09b57e4fafb414d7bc566fc4140faabd&orderNo=GL20240429114230JDdoElmV&count=${num}&isTxt=1&proxyType=1&returnAccount=1`
    // 不限量套餐（ 天/ 单次只能一个IP ）
    const xiongMaoUrl2 = `http://route.xiongmaodaili.com/xiongmao-web/api/gbip?secret=09b57e4fafb414d7bc566fc4140faabd&orderNo=QGB20240614174238lCjlGu1a&count=1&isTxt=1&proxyType=2&returnAccount=1`

    try {
      const {data: res} = await axios.get(xiongMaoUrl2)
      if (typeof res === 'string') {
        proxyString = res
      }
    } catch (e) {
      console.log('获取ID失败:  ', e?.message)
    }
    if (proxyString) {
      break
    }
  }
  return proxyString.replace('\r', '').replace('\n', '').trim()
}
