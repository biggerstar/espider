

sleep = async (ms)=>{
    await new Promise(resolve => setTimeout(resolve, ms))
}


test1 = async ()=>{
    await sleep(3000)
    console.log('我是test1');
    await test2()
    console.log('我是test1111');
}

test2 = async ()=>{
    console.log('我是test2');
     sleep(3000)
    console.log('我是test22222');
    test3()
}

test3 = async ()=>{
    console.log('我是test3');
    await sleep(3000)
    console.log('我是test33333');
}

(async ()=>{
    await  test1()
})()












