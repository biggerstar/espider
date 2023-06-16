
class ParseProxyInfo {
    static #checkIsProxyIp(ip) {
        /** 支持1.1.1.1:888形式或者对象{host:1.1.1.1,port:888} 形式的代理IP校验，每次只能检验一个 */
        let isProxyIp = false
        ip = typeof ip === 'object' ? ip['host'] + ':' + ip['port'] : ip;
        const hostPartList = ip.split(':')[0].split('.')
        if (hostPartList.length !== 4 || ip.split(':')[1] < 0 || ip.split(':')[1] > 65535) return isProxyIp
        for (const partKey in hostPartList) {
            if (isNaN(parseInt(hostPartList[partKey]))
                || hostPartList[partKey] < 0
                || hostPartList[partKey] > 255) return isProxyIp
        }
        return !isProxyIp
    }
    hasIp = (content) => {
        if (typeof content === 'object') {
            try {
                content = JSON.stringify(content)
            } catch (e) {
                content += ''
            }
        }
        if (content === '') return false
        let pattern = /((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})(\.((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})){3}/;
        return pattern.test(content);
    }
    findJsonIpMode = (resultPart,option) => {
        /** 用于解析第三方代理IP返回结果中的host和对应端口并返回IP数组*/
        //  注意本函数使用的正则表达式不能匹配X.X.X.X.X 或 X.X.X 等类型的情况
        if (this.hasIp(resultPart)) {
            for (const key in resultPart) {
                if (!this.hasIp(resultPart[key])) continue
                if (Array.isArray(resultPart)) {
                    if (ParseProxyInfo.#checkIsProxyIp({
                        host: (resultPart[0][option['matchHostKey']] || resultPart[0]['ip']),
                        port: (resultPart[0][option['matchPortKey']] || resultPart[0]['port']),
                    })) {
                        return resultPart.map((val, index) => {
                            return {
                                host: val[option['matchHostKey']] || val['ip'],
                                port: val[option['matchPortKey']] || val['port'],
                            }
                        })
                    }
                }
                return this.findJsonIpMode(resultPart[key])
            }
        } else {
            return false
        }
    }
    findTextIpMode = (resultPart) => {
        /** 该正则表达式能匹配IPV4的IP+端口 */
        let pattern = /(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\:({[0-9]|[1-9]\d{1,3|[1-5]\d{4}|6[0-5]{2}[0-3][0-5])/img;
        return resultPart.match(pattern)
    }
}

module.exports = {ParseProxyInfo}
