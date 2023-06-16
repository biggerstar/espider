const Koa = require('koa');
const app = new Koa();
const bodyParser = require('koa-bodyparser');
const controllers = require('./controllers')
const port = 5566


app.use(bodyParser())
app.use(controllers.routes())
app.use(controllers.allowedMethods())
app.listen(port,()=>{
    console.log('run in http://localhost:' + port);
});




