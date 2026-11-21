<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import {
  Map as MaplibreMap,
  NavigationControl,
  type FilterSpecification,
  type LngLatBoundsLike,
  type MapGeoJSONFeature,
  type MapMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl'
import type { Feature, FeatureCollection } from 'geojson'
import bbox from '@turf/bbox'
import centroid from '@turf/centroid'
import '../maplibre'
import { t } from '../i18n'

const props = withDefaults(
  defineProps<{
    /** Marges (px) à laisser libres lors du cadrage, pour les panneaux posés sur la carte */
    padding?: { top: number; bottom: number; left: number; right: number }
  }>(),
  { padding: () => ({ top: 70, bottom: 200, left: 50, right: 50 }) },
)

const emit = defineEmits<{
  /** Une entité de la carte a été cliquée */
  select: [feature: MapGeoJSONFeature]
}>()

const SOURCE = 'geojson'
const FILL_LAYER = 'geojson-layer'
const STROKE_LAYER = 'geojson-stroke-layer'
const EXPECTED = 'was-good'
const LABELS = 'centroid'
const POLYGONS: FilterSpecification = [
  'in',
  ['geometry-type'],
  ['literal', ['Polygon', 'MultiPolygon']],
]

const attribution =
  '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noopener">Stadia Maps</a> ' +
  '&copy; <a href="https://stamen.com/" target="_blank" rel="noopener">Stamen Design</a> ' +
  '&copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> ' +
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'

// Stamen Watercolor est hébergé par Stadia Maps. Authentification par domaine :
// déclarer les domaines de production dans le tableau de bord Stadia (localhost fonctionne sans).
const style: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.stadiamaps.com/fonts/{fontstack}/{range}.pbf',
  sources: {
    'raster-tiles': {
      type: 'raster',
      tiles: ['https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg'],
      tileSize: 256,
      maxzoom: 16,
      attribution,
    },
  },
  layers: [{ id: 'tiles', type: 'raster', source: 'raster-tiles', minzoom: 0, maxzoom: 22 }],
}

const container = useTemplateRef<HTMLDivElement>('container')

// Volontairement non réactifs : maplibre ne doit pas être enveloppé dans un proxy Vue
let map: MaplibreMap | null = null
let ready: Promise<void> = Promise.resolve()
let geojson: FeatureCollection | null = null
let field = ''
let hoveredId: string | number | undefined

function getMap(): MaplibreMap {
  if (!map) throw new Error('carte non initialisée')
  return map
}

onMounted(() => {
  const m = new MaplibreMap({
    container: container.value!,
    style,
    center: [0, 0],
    zoom: 2,
    // Attribution repliable (bouton « i ») pour ne pas encombrer les petits écrans
    attributionControl: { compact: true },
  })
  map = m
  ready = new Promise((resolve) => m.once('load', () => resolve()))
  m.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')

  m.on('click', onClick)
  m.on('mousemove', FILL_LAYER, (e) => {
    const feature = e.features?.[0]
    if (feature) {
      m.getCanvas().style.cursor = 'pointer'
      highlight(feature.id)
    }
  })
  m.on('mouseleave', FILL_LAYER, () => {
    m.getCanvas().style.cursor = ''
    highlight(undefined)
  })

  // Accès pour les tests de bout en bout (serveur de dev uniquement)
  if (import.meta.env.DEV) (window as unknown as { __quizMap: MaplibreMap }).__quizMap = m
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})

function onClick(e: MapMouseEvent): void {
  clearExpected()
  const feature = getMap().queryRenderedFeatures(e.point, { layers: [FILL_LAYER] })[0]
  if (feature) emit('select', feature)
}

function highlight(id: string | number | undefined): void {
  const m = getMap()
  if (hoveredId !== undefined && m.getSource(SOURCE)) {
    m.setFeatureState({ source: SOURCE, id: hoveredId }, { hovered: false })
  }
  hoveredId = id
  if (id !== undefined) m.setFeatureState({ source: SOURCE, id }, { hovered: true })
}

function removeLayer(...ids: string[]): void {
  const m = getMap()
  for (const id of ids) {
    if (m.getLayer(id)) m.removeLayer(id)
    if (m.getSource(id)) m.removeSource(id)
  }
}

/** Affiche un nouveau jeu de données (remplace le précédent). */
async function load(data: FeatureCollection, labelField: string): Promise<void> {
  await ready
  const m = getMap()
  clearExpected()
  setLabels(false)
  hoveredId = undefined
  removeLayer(STROKE_LAYER, FILL_LAYER, SOURCE)

  geojson = data
  field = labelField

  m.addSource(SOURCE, { type: 'geojson', data, generateId: true })
  m.addLayer({
    id: FILL_LAYER,
    type: 'fill',
    source: SOURCE,
    paint: {
      'fill-outline-color': '#ffffff',
      'fill-color': ['case', ['boolean', ['feature-state', 'played'], false], 'green', 'orange'],
      'fill-opacity': ['case', ['boolean', ['feature-state', 'hovered'], false], 0.7, 0.5],
    },
    filter: POLYGONS,
  })
  m.addLayer({
    id: STROKE_LAYER,
    type: 'line',
    source: SOURCE,
    paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-opacity': 1 },
    filter: POLYGONS,
  })
}

function zoomTo(target: Feature | FeatureCollection): void {
  getMap().fitBounds(bbox(target) as LngLatBoundsLike, { padding: props.padding })
}

function zoomToAll(): void {
  if (geojson) zoomTo(geojson)
}

/** Colore en vert une entité trouvée. */
function markFound(id: string | number | undefined): void {
  if (id !== undefined) getMap().setFeatureState({ source: SOURCE, id }, { played: true })
}

/** Montre en rouge l'entité qu'il fallait trouver et zoome dessus. */
function showExpected(value: string): void {
  const feature = geojson?.features.find((f) => String(f.properties?.[field]) === value)
  if (!feature) {
    console.warn('entité attendue introuvable :', value)
    return
  }
  clearExpected()
  const m = getMap()
  m.addSource(EXPECTED, { type: 'geojson', data: feature })
  m.addLayer({
    id: EXPECTED,
    type: 'fill',
    source: EXPECTED,
    paint: { 'fill-outline-color': '#ffffff', 'fill-color': 'red', 'fill-opacity': 0.5 },
  })
  zoomTo(feature)
}

function clearExpected(): void {
  removeLayer(EXPECTED)
}

/** Mode apprentissage : affiche le nom de chaque entité. */
function setLabels(active: boolean): void {
  removeLayer(LABELS)
  if (!active || !geojson) return

  const points: FeatureCollection = {
    type: 'FeatureCollection',
    features: geojson.features.map((f) =>
      centroid(f, { properties: { [field]: f.properties?.[field] } }),
    ),
  }
  const m = getMap()
  m.addSource(LABELS, { type: 'geojson', data: points })
  m.addLayer({
    id: LABELS,
    type: 'symbol',
    source: LABELS,
    layout: {
      'text-font': ['Open Sans Bold'],
      'text-field': ['to-string', ['get', field]],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 0,
      'text-justify': 'auto',
    },
    paint: { 'text-color': '#110801', 'text-halo-color': '#ffffff', 'text-halo-width': 1 },
  })
}

defineExpose({ load, zoomToAll, markFound, showExpected, setLabels })
</script>

<template>
  <div ref="container" class="map" role="application" :aria-label="t('game.map')"></div>
</template>

<style scoped>
.map {
  width: 100%;
  height: 100%;
}

/* Sur petit écran, le zoom se fait au doigt : boutons +/− masqués */
@media (max-width: 700px) {
  .map :deep(.maplibregl-ctrl-bottom-right .maplibregl-ctrl-group) {
    display: none;
  }
}
</style>
