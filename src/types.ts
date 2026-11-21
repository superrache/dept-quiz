/** Un jeu, tel que décrit dans public/data/games.json */
export interface GameConfig {
  id: string
  label: string
  image: string
  geojson: string
  /** Nombre d'entités du GeoJSON (sert au plafond de score côté serveur) */
  count: number
  /** Propriété des entités à deviner */
  field: string
  /** Libellé du type d'entité, avec article : « le département » */
  typeLabel: string
}

export interface ScoreEntry {
  name: string
  score: number
}
