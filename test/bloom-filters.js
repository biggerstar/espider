import pkg from 'bloom-filters';
import * as fs from "node:fs";
import md5 from 'md5'

const {BloomFilter} = pkg;
const filterFilePath = './spider.filter'
const recordFilterContent = fs.existsSync(filterFilePath) ? fs.readFileSync(filterFilePath, 'utf8') : ''
const printFlag = 2e4
let filter
if (recordFilterContent) {
    filter = BloomFilter.fromJSON(JSON.parse(recordFilterContent))
} else {
    filter = new BloomFilter(1e8, 2)
    filter.add(md5('alice'))
    filter.add(md5('bob'))
    filter.add(md5('carl'))
    let startTime = Date.now()
    for (let i = 0; i < 1e5; i++) {
        if (i % printFlag === 0 && i >= printFlag) {
            const endTime = Date.now()
            console.log('add: ', i, ' ', `${endTime - startTime}ms`)
            startTime = endTime
        }
        filter.add(md5('elem:' + i))
    }
}
console.log('----------------------------------')
let hitCont = 0
let passCont = 0
let startTime = Date.now()
for (let i = 0; i < 3e6; i++) {
    if (i % printFlag === 0 && i >= printFlag) {
        const endTime = Date.now()
        console.log('has: ', i, ' ', `${endTime - startTime}ms`)
        startTime = endTime
    }
    if (filter.has(md5('elem:' + i))) {
        hitCont++
    } else {
        passCont++
    }
}
console.log('hitCont', hitCont, 'passCont', passCont)
console.log(recordFilterContent ? '来自持久化文件' : '重新创建')
console.log(filter.has(md5('elem:1222')));
console.log(filter.has(md5('elem:12221111')));
console.log(filter.rate());
if (!recordFilterContent) {
    const content = filter.saveAsJSON()
    // console.log(JSON.stringify(content).slice(0, 500))
    fs.writeFileSync(filterFilePath, JSON.stringify(content), 'utf8')
}
