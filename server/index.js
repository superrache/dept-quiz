/**
 * The dev server
 */

const express = require('express')

const api = require('./api.js')

export default (app, http) => {
  app.use(express.json())

  api(app, process.env.DATABASE_URL)
}
