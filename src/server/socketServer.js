const ws = require("ws");
const server = new ws.Server({ host: "127.0.0.1", port: 8888, })
console.log('WebSocket开启');

server.on("error", (err)=> console.log(err))
server.on("connection", (SSocket)=> {
    console.log("client connection")
    SSocket.on("close", ()=> {   console.log("client close") })
    SSocket.on("error", (err)=> {  console.log("client error", err)})
    SSocket.on("message", (data)=> {
        console.log(data.toString())
        SSocket.send(JSON.stringify({aa:111}))
    })
})




