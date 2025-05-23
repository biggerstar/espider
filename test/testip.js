import {createAxiosSession} from '@biggerstar/axios-session'

const session = createAxiosSession()
session.setAxiosDefaults({
  proxyString: 'socket5://125.123.141.169:25164'
})

session.request({
  url: `http://httpbin.org/ip`,

}).then(res => {
  console.log(res.data)
})

