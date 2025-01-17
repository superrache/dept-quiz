const { Client } = require('pg')

/**
 * The common server code
 * @param {app, databaseUrl} app 
 */
module.exports = function(app, databaseUrl, prod) {
    const fs = require('fs')

    console.log('Database URL: ' + databaseUrl)
    if(databaseUrl === undefined) {
        console.log('Error: environment variable DATABASE_URL must be specified')
        process.exit(1)
    }

    console.log('Initializing database')

    const db = new Client({
        connectionString: databaseUrl,
        ssl: {
            rejectUnauthorized: false
        }
    })

    try {
        db.connect()
        console.log('Connected')
        db.query('create table if not exists scores ( game text not null, name text not null, score int, created_at TIMESTAMPTZ DEFAULT Now());')
        db.query('create table if not exists stat (ip text, feature text, visit TIMESTAMPTZ DEFAULT Now());')
        console.log('Table scores created or existing')
    } catch(e) {
        console.log('An error occured')
        console.log(e)
    }
    
    app.get('/games', (req, res) => {
        if(!prod) { // parce que les ports server vue et server node sont différents en dev
            res.header('Access-Control-Allow-Origin', "*")
            res.header('Access-Control-Allow-Headers', "*")
        }

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
        if(!prod) { // parce que les ports server vue et server node sont différents en dev
            res.header('Access-Control-Allow-Origin', "*")
            res.header('Access-Control-Allow-Headers', "*")
        }

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
        if(!prod) { // parce que les ports server vue et server node sont différents en dev
            res.header('Access-Control-Allow-Origin', "*")
            res.header('Access-Control-Allow-Headers', "*")
        }

        console.log('get /highscore type=' + req.query.type)

        switch(req.query.type) {
            case 's':
            if(req.query.game) {
                db.query('select name, score from scores where game like $1 order by score desc limit 15;', [req.query.game], (err, sel) => {
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
                db.query('insert into scores(game, name, score) values($1, $2, $3);', [req.query.game, req.query.name, req.query.score])
                res.json({status: 200})
            } else {
                res.json({error: 1})
            }
            break
            default:
        }
    })

    app.get('/stat', (req, res) => {
        res.header('Access-Control-Allow-Origin', "*")
        res.header('Access-Control-Allow-Headers', "*")

        console.log('get /stat')
        var ip = req.socket.remoteAddress
        var feature = req.query.feature
        if(ip === undefined || ip === null) ip = 'unk'
        if(feature === undefined || feature === null) feature = 'unk'
        db.query('insert into stat(ip, feature) values($1, $2);', [ip, feature])
        res.json({status: 200})
    })

    app.get('/get-stat', (req, res) => {
        res.header('Access-Control-Allow-Origin', "*")
        res.header('Access-Control-Allow-Headers', "*")
        
        res.writeHead(200, {
            'Content-Type': 'text/html'
        })
        var html = "<!doctype html><html><head><title>Stat</title></head><body><h1>Stat</h1><table border=\"1\"><tr><th>feature</th><th>ip</th><th>date</th></tr>"

        db.query('select feature, ip, visit from stat order by visit desc limit 1000', (err, sel) => {
            if(err) {
                console.log(err.message)
            }
            for(var r in sel.rows) {
                const row = sel.rows[r]
                html += "<tr><td>" + row.feature + "</td><td>" + row.ip + "</td><td>" + row.visit + "</td></tr>"
            }
            html += "</table></body></html>"
            res.write(html)
            res.end()
        })
    })
}