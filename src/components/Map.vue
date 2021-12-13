<template>
    <div class="container">
      <div id="map" ref="map">
        <div id="attribution" v-html="attribution"></div>
      </div>
    </div>
</template>

<script>

import { Map, NavigationControl } from 'maplibre-gl';
import bbox from '@turf/bbox'
import centroid from '@turf/centroid'

const geojsonSourceId = "geojson"
const geojsonLayerId = "geojson-layer"
const geojsonStrokeLayerId = "geojson-stroke-layer"

const centroidSourceId = "centroid"
const centroidLayerId = "centroid"

const initColor = "orange"
const goodColor = "green"
//const wrongColor = "red"*/

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
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }
  },
  mounted() {
    const style = {
        version: 8,
        glyphs: 'https://api.jawg.io/glyphs/{fontstack}/{range}.pbf',
        sources: {
            'raster-tiles': {
                type: 'raster',
                tiles: [
                    'https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg'
                ],
                tileSize: 256
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

    this.map = new Map({
        container: this.$refs.map,
        style: style,
        center: [this.center.lng, this.center.lat],
        zoom: this.zoom
      })
    
    this.map.addControl(new NavigationControl(), 'top-right')

    this.map.on('click', this.onClic)

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
    loadGeojson(geojson) {
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
            interactive: true,
            layout: {},
            paint: {
                "fill-outline-color": "#ffffff",
                "fill-color": ['case', ['boolean', ['feature-state', 'played'], false], goodColor, initColor],
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

        this.map.on('mousemove', geojsonLayerId, (e) => {
            if(e.features.length > 0) {
                this.map.getCanvas().style.cursor = "pointer" //crosshair
                this.highlightFeature(e.features[0])
            }
        })

        this.map.on('mouseleave', geojsonLayerId, () => {
            this.map.getCanvas().style.cursor = ""
            this.unHighlightFeature()
        })
    },
    zoomToBounds(bounds) {
        this.map.fitBounds(bounds, {
            padding: {top: 50, bottom: 200, left: 50, right: 50}
        })
    },
    zoomToFeature(feature) {
        console.log("zoomToFeature")
        var bounds = bbox(feature.geometry)
        console.log(bounds)
        this.zoomToBounds(bounds)
    },
    zoomToFeatures() {
        var bounds = bbox(this.geojson)
        this.zoomToBounds(bounds)
    },
    onClic(e) {
        var features = this.map.queryRenderedFeatures(e.point, { layers: [geojsonLayerId] })
        if(features.length > 0) {
            var feature = features[0];
            this.gameVue.onClic(feature)
        }
    },
    setGoodFeature(feature) {
        this.map.setFeatureState(
            { source: geojsonSourceId, id: feature.id },
            { played: true }
        )
    },
    setWrongFeature(feature) {
        console.log("wrong feature")
        console.log(feature)
        /*this.map.setFeatureState(
            { source: geojsonSourceId, id: feature.id },
            { played: true }
        )*/
    },
    getFeature(field, value) {
        console.log("getFeature " + field + "=" + value)
        // ne fonctionne pas à chaque fois ...
        var features = this.map.querySourceFeatures(geojsonSourceId, {
            sourceLayer: geojsonLayerId,
            filter: ["==", field, value]
        })

        //var features = this.map.getSource(geojsonSourceId)._data.features // les features n'ont pas d'id
        //var features = this.map.getLayer(geojsonLayerId)._data.features // pas de _data

        for(var f in features) {
            const feature = features[f]
            if(feature.properties[field] === value) {
                console.log("Found " + feature.properties[field])
                console.log(feature.id)
                return feature
            }
        }
        return null
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
        if(this.hoveredFeatureId !== null) {
            this.map.setFeatureState(
                { source: geojsonSourceId, id: this.hoveredStateId },
                { hovered: false }
            )
        }
        this.hoveredStateId = null
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
                        'Open Sans Bold',
                        'Noto Bold'
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

@import '~maplibre-gl/dist/maplibre-gl.css';

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
