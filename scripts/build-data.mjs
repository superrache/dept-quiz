/**
 * Prépare les GeoJSON des jeux : data/source/*.geojson → public/data/*.geojson
 *
 * - ne garde que les propriétés utilisées par les jeux (champ `field` de games.json) ;
 * - simplifie les tracés en préservant la topologie (frontières communes cohérentes).
 *   `resolution` adapte la tolérance à l'étendue de chaque carte : les formes restent nettes
 *   même zoomées ~3× sur un écran de 1 000 px, et les petites entités (Paris…) sont préservées ;
 * - arrondit les coordonnées à 4 décimales (~11 m).
 *
 * Usage : npm run data
 */
import { readFileSync, statSync } from 'node:fs'
import mapshaper from 'mapshaper'

const RESOLUTION = '3000x3000'
const PRECISION = 0.0001

const games = JSON.parse(readFileSync('public/data/games.json', 'utf8'))

/** Fichier GeoJSON → propriétés à conserver */
const files = new Map()
for (const game of games) {
  const fields = files.get(game.geojson) ?? new Set()
  fields.add(game.field)
  files.set(game.geojson, fields)
}

const kb = (bytes) => `${Math.round(bytes / 1024)} Ko`.padStart(8)
let before = 0
let after = 0

for (const [file, fields] of files) {
  const source = `data/source/${file}`
  const target = `public/data/${file}`
  await mapshaper.runCommands(
    [
      `-i "${source}"`,
      `-filter-fields ${[...fields].join(',')}`,
      `-simplify resolution=${RESOLUTION} keep-shapes`,
      `-o "${target}" format=geojson precision=${PRECISION} force`,
    ].join(' '),
  )

  const count = (path) => JSON.parse(readFileSync(path, 'utf8')).features.length
  if (count(source) !== count(target)) throw new Error(`${file} : des entités ont disparu`)

  const [s, t] = [statSync(source).size, statSync(target).size]
  before += s
  after += t
  console.log(`${file.padEnd(40)} ${kb(s)} → ${kb(t)}`)
}
console.log(`${'Total'.padEnd(40)} ${kb(before)} → ${kb(after)}`)
