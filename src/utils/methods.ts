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

export function getRandomItemForArray(array: any[]) {
  return array[Math.floor(Math.random() * array.length)];
}

export function sleep(time: number = 0) {
  return new Promise(resolve => setTimeout(resolve, time))
}

export function everyHasKeys<T extends Record<any, any>>(obj1: Record<any, any>, obj2: Record<any, any>, keys: Array<keyof T>) {
  return keys.every(key => Object.hasOwn(obj1, key) && Object.hasOwn(obj2, key))
}
