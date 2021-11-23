const express = require('express')
const serveStatic = require('serve-static')
const path = require('path')
const fs = require('fs')
const sqlite3 = require('sqlite3').verbose()

const app = express()

app.use('/', serveStatic(path.join(__dirname, 'dist')))

app.get(/.*/, function (req, res) {
     res.sendFile(path.join(__dirname, 'dist/index.html'))
})

const port = process.env.PORT || 8080

app.listen(port, () => {
     console.log("Server is up and running on port number " + port);
});
