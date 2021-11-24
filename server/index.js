const express = require('express')

const api = require('./api.js')

export default (app, http) => {
  app.use(express.json())

  api(app)
}
