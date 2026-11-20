<template>
    <div class="container">
      <div id="map" ref="map">
        <div id="attribution" v-html="attribution"></div>
      </div>
    </div>
</template>

<script>

import { markRaw } from 'vue'
import { Map, NavigationControl } from 'maplibre-gl'
import bbox from '@turf/bbox'
import centroid from '@turf/centroid'

const geojsonSourceId = "geojson"
const geojsonLayerId = "geojson-layer"
const geojsonStrokeLayerId = "geojson-stroke-layer"

const wasGoodSourceId = "was-good"
const wasGoodLayerId = "was-good"

const centroidSourceId = "centroid"
const centroidLayerId = "centroid"

export default {
  name: 'Map',
  data() {
    return {
      gameVue: null,
      geojson: null,
      popup: null,
      map: null,
      hoveredStateId: null,
      zoom: 2,
      center: { lat: 0, lng: 0 },
      attribution: '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> '
        + '&copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a> '
        + '&copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> '
        + '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
    }
  },
  mounted() {
    // Stamen Watercolor est désormais hébergé par Stadia Maps.
    // Authentification par domaine : déclarer les domaines de prod dans le tableau de bord Stadia
    // (localhost fonctionne sans configuration).
    const style = {
        version: 8,
        glyphs: 'https://tiles.stadiamaps.com/fonts/{fontstack}/{range}.pbf',
        sources: {
            'raster-tiles': {
                type: 'raster',
                tiles: [
                    'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg'
                ],
                tileSize: 256,
                maxzoom: 16
            }
        },
        layers: [
            {
                id: 'tiles',
                type: 'raster',
                source: 'raster-tiles',
                minzoom: 0,
                maxzoom: 22
            }
        ]
    }

    // markRaw : la carte ne doit pas être enveloppée dans un proxy réactif Vue
    this.map = markRaw(new Map({
        container: this.$refs.map,
        style: style,
        center: [this.center.lng, this.center.lat],
        zoom: this.zoom
      }))
    this.mapReady = new Promise(resolve => this.map.once('load', resolve))

    this.map.addControl(new NavigationControl(), 'top-right')

    this.map.on('click', this.onClic)

    // Écouteurs enregistrés une seule fois (et non à chaque chargement de GeoJSON)
    this.map.on('mousemove', geojsonLayerId, (e) => {
        if(e.features.length > 0) {
            this.map.getCanvas().style.cursor = "pointer"
            this.highlightFeature(e.features[0])
        }
    })

    this.map.on('mouseleave', geojsonLayerId, () => {
        this.map.getCanvas().style.cursor = ""
        this.unHighlightFeature()
    })
  },
  methods: {
    setGameVue(gameVue) {
        this.gameVue = gameVue
    },
    removeCurrentGeojson() {
        if(this.map.getLayer(geojsonStrokeLayerId)) this.map.removeLayer(geojsonStrokeLayerId)
        if(this.map.getLayer(geojsonLayerId)) this.map.removeLayer(geojsonLayerId)
        if(this.map.getSource(geojsonSourceId)) this.map.removeSource(geojsonSourceId)

        this.geojson = null
    },
    async loadGeojson(geojson) {
        await this.mapReady
        this.unWasGoodFeature()
        this.setLearningMode(false)
        this.removeCurrentGeojson()

        this.geojson = geojson

        this.map.addSource(geojsonSourceId, {
            type: "geojson",
            data: this.geojson,
            generateId: true
        })

        this.map.addLayer({
            id: geojsonLayerId,
            type: "fill",
            source: geojsonSourceId,
            layout: {},
            paint: {
                "fill-outline-color": "#ffffff",
                "fill-color": ['case', ['boolean', ['feature-state', 'played'], false], "green", "orange"],
                "fill-opacity": ['case', ['boolean', ['feature-state', 'hovered'], false], 0.7, 0.5]
            },
            "filter": ["==", "$type", "Polygon"]
        })

        this.map.addLayer({
            id: geojsonStrokeLayerId,
            type: "line",
            source: geojsonSourceId,
            layout: {},
            paint: {
                "line-color": "#ffffff",
                "line-width": 2,
                "line-opacity": 1
            },
            "filter": ["==", "$type", "Polygon"]
        })
    },
    zoomToBounds(bounds) {
        this.map.fitBounds(bounds, {
            padding: {top: 50, bottom: 200, left: 50, right: 50}
        })
    },
    zoomToFeature(feature) {
        var bounds = bbox(feature.geometry)
        this.zoomToBounds(bounds)
    },
    zoomToFeatures() {
        var bounds = bbox(this.geojson)
        this.zoomToBounds(bounds)
    },
    onClic(e) {
        this.unWasGoodFeature()

        var features = this.map.queryRenderedFeatures(e.point, { layers: [geojsonLayerId] })
        if(features.length > 0) {
            var feature = features[0]
            this.gameVue.onClic(feature)
        }
    },
    getFeature(field, value) {
        return this.geojson.features.find(f => f.properties[field] === value)
    },
    highlightFeature(feature) {
        this.unHighlightFeature()
        this.hoveredStateId = feature.id
        this.map.setFeatureState(
            { source: geojsonSourceId, id: this.hoveredStateId },
            { hovered: true }
        )
    },
    unHighlightFeature() {
        if(this.hoveredStateId !== null) {
            this.map.setFeatureState(
                { source: geojsonSourceId, id: this.hoveredStateId },
                { hovered: false }
            )
        }
        this.hoveredStateId = null
    },
    setGoodFeature(feature) {
        this.map.setFeatureState(
            { source: geojsonSourceId, id: feature.id },
            { played: true }
        )
    },
    setWasGoodFeature(feature) {
        this.unWasGoodFeature()

        this.map.addSource(wasGoodSourceId, {
            type: "geojson",
            data: feature,
            generateId: true
        })

        this.map.addLayer({
            id: wasGoodLayerId,
            type: "fill",
            source: wasGoodSourceId,
            layout: {},
            paint: {
                "fill-outline-color": "#ffffff",
                "fill-color": "red",
                "fill-opacity": 0.5
            }
        })

        this.zoomToFeature(feature)
    },
    unWasGoodFeature() {
        if(this.map.getLayer(wasGoodLayerId)) this.map.removeLayer(wasGoodLayerId)
        if(this.map.getSource(wasGoodSourceId)) this.map.removeSource(wasGoodSourceId)
    },
    setLearningMode(active, field) {
        if(active) {
            var centroidFeatures = []
            this.geojson.features.forEach(function(feature) {
                var centroidFeature = centroid(feature)
                centroidFeature.properties[field] = feature.properties[field]
                centroidFeatures.push(centroidFeature)
            })
            const centroidGeojson = {
                type: "FeatureCollection",
                features: centroidFeatures
            }
            
            this.map.addSource(centroidSourceId, {
                type: "geojson",
                data: centroidGeojson,
                generateId: true
            })

            this.map.addLayer({
                id: centroidLayerId,
                type: "symbol",
                source: centroidSourceId,
                layout: {
                    'text-font': [
                        'Open Sans Bold'
                    ],
                    'text-field': ['get', field],
                    'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
                    'text-radial-offset': 0.0,
                    'text-justify': 'auto'
                },
                paint: {
                    'text-color': '#110801',
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 1
                }
            })

        } else {
            if(this.map.getLayer(centroidLayerId)) this.map.removeLayer(centroidLayerId)
            if(this.map.getSource(centroidSourceId)) this.map.removeSource(centroidSourceId)
        }
    }
  }
}

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

li {
  cursor: pointer;
}

a {
  color: #5eb793;
}

#map {
  margin-left: 0px;
  width: 100%;
  height: 100%;
  z-index: 1;
}

#attribution {
  position: absolute;
  right: 5px;
  bottom: 5px;
  color: black;
  z-index: 1005;
}

</style>
