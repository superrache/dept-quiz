/**
 * The prod server
 */

var express = require('express')
var serveStatic = require('serve-static')

const app = express()

app.use(serveStatic(__dirname + "../dist"))
var port = process.env.PORT || 3001

app.listen(port)

const api = require('./api.js')
api(app, process.env.DATABASE_URL, true)

console.log('Server listening on: '+ port)
