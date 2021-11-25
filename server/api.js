const { Client } = require('pg')

/**
 * The common server code
 * @param {app, databaseUrl} app 
 */
module.exports = function(app, databaseUrl) {
    const fs = require('fs')

    console.log('Database URL: ' + databaseUrl)
    const pg = require('pg')

    console.log('Initializing database')

    const db = new Client({
        connectionString: databaseUrl
    })

    try {
        db.connect()
        console.log('Connected')
        db.query('create table if not exists scores ( game text not null, name text not null, score int, created_at TIMESTAMPTZ DEFAULT Now());')
        console.log('Table scores created or existing')
    } catch(e) {
        console.log('An error occured')
        console.log(e)
    }
    
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

        switch(req.query.type) {
            case 's':
            if(req.query.game) {
                let sql = 'select name, score from scores where game like \'' + req.query.game + '\' order by score desc limit 15;'
                db.query(sql, (err, sel) => {
                    if(err) {
                        console.error(err.message)
                    }
                    console.log(sel.rows)
                    res.json(sel.rows)
                })
            } else {
                res.json({error: 1})
            }
            break
            case 'i':
            if(req.query.name && req.query.score) {
                console.log('inserting score for game ' + req.query.game + ' to player ' + req.query.name + " => " + req.query.score)
                db.query('insert into scores(game, name, score) values(\'' + req.query.game + '\', \'' + req.query.name + '\', ' + req.query.score + ');')
                res.json({status: 200})
            } else {
                res.json({error: 1})        
            }
            break
            default:
        }
    })
}