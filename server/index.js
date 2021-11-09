import express from 'express';
const fs = require('fs');

export default (app, http) => {
  app.use(express.json());

  app.get('/games', (req, res) => {
    // parce que les ports server vue et server node sont différents 
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Headers', "*");
    console.log('get /games')
    fs.readFile('./data/games.json', 'utf8', (err, data) => {
      if(err) {
          console.log(`Error reading file from disk: ${err}`);
      } else {
        res.json(JSON.parse(data));
      }
    });
  });

  app.get('/geojson', (req, res) => {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Headers', "*");
    console.log('get /geojson file=' + req.query.file)
    fs.readFile('./data/' + req.query.file, 'utf8', (err, data) => {
      if(err) {
          console.log(`Error reading file from disk: ${err}`);
      } else {
        res.json(JSON.parse(data));
      }
    });
  });

}
