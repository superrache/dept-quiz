var express = require('express')
var serveStatic = require('serve-static')

const app = express()

app.use(serveStatic(__dirname + "/dist"))
var port = process.env.PORT || 3001

app.listen(port)

const api = require('./server/api.js')
api(app)

console.log('Server listening on: '+ port)
