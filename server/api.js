module.exports = function(app) {
    const fs = require('fs')
    const sqlite3 = require('sqlite3')
    
    app.get('/games', (req, res) => {
    // parce que les ports server vue et server node sont différents 
    res.header('Access-Control-Allow-Origin', "*")
    res.header('Access-Control-Allow-Headers', "*")
    console.log('get /games')
    fs.readFile('./data/games.json', 'utf8', (err, data) => {
        if(err) {
            console.log(`Error reading file from disk: ${err}`)
        } else {
        res.json(JSON.parse(data))
        }
    })
    })

    app.get('/geojson', (req, res) => {
    res.header('Access-Control-Allow-Origin', "*")
    res.header('Access-Control-Allow-Headers', "*")
    console.log('get /geojson file=' + req.query.file)
    fs.readFile('./data/' + req.query.file, 'utf8', (err, data) => {
        if(err) {
            console.log(`Error reading file from disk: ${err}`)
        } else {
        res.json(JSON.parse(data))
        }
    })
    })

    app.get('/highscore', (req, res) => {
    res.header('Access-Control-Allow-Origin', "*")
    res.header('Access-Control-Allow-Headers', "*")
    console.log('get /highscore type=' + req.query.type)
    
    let db = new sqlite3.Database('./data/highscore.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if(err) {
        console.error(err.message)
        }
        db.run('create table if not exists scores ( game text, name text, score int );')
    });

    switch(req.query.type) {
        case 's':
        if(req.query.game) {
            let sql = 'select name, score from scores where game like "' + req.query.game + '" order by score desc limit 15;'
            db.all(sql, [], (err, rows) => {
            if(err) {
                console.error(err.message)
            }
            res.json(rows)
            })
        } else {
            res.json({error: 1})
        }
        break
        case 'i':
        if(req.query.name && req.query.score) {
            console.log('inserting score for game ' + req.query.game + ' to player ' + req.query.name + " => " + req.query.score)
            db.run('insert into scores(game, name, score) values("' + req.query.game + '", "' + req.query.name + '", ' + req.query.score + ');')
            res.json({status: 200})
        } else {
            res.json({error: 1})        
        }
        break
        default:
    }
    
    db.close((err) => {
        if(err) {
        console.error(err.message)
        }
    })
    })
}