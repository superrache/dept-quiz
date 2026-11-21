import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { FeatureCollection } from 'geojson'
import type { GameConfig } from '../../src/types'

// Vitest s'exécute depuis la racine du projet
const read = (...path: string[]) => readFileSync(join(process.cwd(), 'public', ...path), 'utf8')
const games = JSON.parse(read('data', 'games.json')) as GameConfig[]

describe('public/data/games.json', () => {
  // Données produites par `npm run data` (scripts/build-data.mjs)
  it('reste sous 2 Mo au total (GeoJSON simplifiés)', () => {
    const files = new Set(games.map((g) => g.geojson))
    const total = [...files].reduce((sum, file) => sum + read('data', file).length, 0)
    expect(total).toBeLessThan(2_000_000)
  })

  it('a des identifiants uniques', () => {
    const ids = games.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  describe.each(games)('$id', (game) => {
    const geojson = JSON.parse(read('data', game.geojson)) as FeatureCollection
    const values = geojson.features.map((f) => f.properties?.[game.field])

    it('a une image', () => {
      expect(() => read('img', game.image)).not.toThrow()
    })

    it('déclare le bon nombre d’entités (count)', () => {
      expect(game.count).toBe(geojson.features.length)
    })

    it('ne garde que les propriétés utiles', () => {
      const fields = new Set(games.filter((g) => g.geojson === game.geojson).map((g) => g.field))
      for (const f of geojson.features)
        for (const key of Object.keys(f.properties ?? {})) expect(fields).toContain(key)
    })

    it('limite la précision des coordonnées', () => {
      expect(read('data', game.geojson)).not.toMatch(/\d\.\d{6,}/)
    })

    it('n’a que des polygones', () => {
      for (const f of geojson.features)
        expect(['Polygon', 'MultiPolygon']).toContain(f.geometry.type)
    })

    it('a une réponse non vide et unique pour chaque entité', () => {
      for (const v of values) expect(String(v ?? '').trim()).not.toBe('')
      expect(new Set(values).size).toBe(values.length)
    })
  })
})
