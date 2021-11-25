<template>
    <div class="container">
      <l-map id="map" :zoom="zoom" :center="center" ref="map">
      <l-tile-layer :url="url" :attribution="attribution"></l-tile-layer>
      <l-geo-json
          v-if="dispGeojson"
          :geojson="geojson"
          :options="options"
          :options-style="styleFunction"
          />
      </l-map>

      <div id="panel">
        <div id="question" v-html="question"></div>
        <Transition mode="out-in" name="fade-in">
          <div id="result" :key="result">{{ result }}</div>
        </Transition>

        <div id="score">Score : {{ score }}</div>
        <div id="bonus">Bonus {{ bonus }}%</div>

        <div id="progressborder">
          <div id="progressbar" :style="{width: current / solutionIds.length * 100 + '%'}"></div>
          <div id="progression">{{ current }} / {{ solutionIds.length }}</div>
        </div>
      </div>

      <div id="buttons">
        <button id="restart" v-on:click="restart()">Restart</button>
        <button id="showHighscores" v-on:click="showHighscores()">Highscores</button>
        <button id="quit" v-on:click="quit()">Quit</button>
      </div>

      <Highscores id="highscores" ref="highscores"/>
      <SaveScore id="savescore" ref="savescore"/>
    </div>
 
</template>

<script>
import { LMap, LTileLayer, LGeoJson } from "vue2-leaflet";
import L from "leaflet";
import { featureGroup } from "leaflet"
import "leaflet/dist/leaflet.css";
import Highscores from './Highscores.vue'
import SaveScore from './SaveScore.vue'
import * as env from '../utils/env.js'

L.Icon.Default.imagePath = "https://unpkg.com/leaflet@1.3.4/dist/images/";

export default {
  name: 'Game',
  components: {
    "l-map": LMap,
    "l-tile-layer": LTileLayer,
    LGeoJson,
    Highscores,
    SaveScore
  },
  data() {
    return {
      game: [],
      question: "",
      result: "",
      score: 0,
      bonus: 0,
      playing: false,
      departmentName: "",
      geojson: null,
      solutionIds: [],
      current: 0,
      dispGeojson: true,
      map: null,
      zoom: 2,
      center: { lat: 0, lng: 0 },
      url: "https://stamen-tiles-c.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg",
      attribution:
        '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }
  },
  computed: {
      options() {
          return {
              onEachFeature: this.onEachFeature
          };
      },
      styleFunction() {
        return () => {
          return {
            weight: 2,
            color: "#ECEFF1",
            opacity: 1,
            fillColor: "#e4ce7f",
            fillOpacity: 0.5
          };
        };
      }
  },
  created() {
    this.question = "loading"
    
  },
  methods: {
    async launch(game) {
      this.game = game
      console.log('starting game ' + this.game.id)
      
      await this.load()
      this.shufflize()
      this.start()
    },
    async load() {
      console.log('loading geojson ' + this.game.geojson)
      const response = await fetch(env.getServerUrl() + "/geojson?file=" + this.game.geojson)
      const data = await response.json()
      this.geojson = data
      console.log(this.geojson.features.length + ' features loaded')
    },
    shuffleArray(array) {
      let curId = array.length;
      // There remain elements to shuffle
      while (0 !== curId) {
        // Pick a remaining element
        let randId = Math.floor(Math.random() * curId);
        curId -= 1;
        // Swap it with the current element.
        let tmp = array[curId];
        array[curId] = array[randId];
        array[randId] = tmp;
      }
      return array;
    },
    shufflize() {
      console.log('shuffling solution')
      this.solutionIds = new Array(this.geojson.features.length)
      for(var i = 0; i < this.geojson.features.length; i++) {
        this.solutionIds[i] = i
      }
      this.solutionIds = this.shuffleArray(this.solutionIds);
    },
    start() {
      console.log('game start')
      this.result = "Sélectionne " + this.game.typeLabel + " sur la carte"
      this.current = -1
      this.progression = 0
      this.score = 0
      this.bonus = 100
      this.playing = true

      // zoom sur toutes les entités
      this.map = this.$refs.map // ne fonctionne pas en created()
      var group = new featureGroup()
      this.map.mapObject.eachLayer(function(layer) {
        if(layer.feature != undefined) {
          group.addLayer(layer)
        }
      })
      this.map.mapObject.flyToBounds(group.getBounds(), { padding: [20, 20]})

      this.next()
    },
    next() {
      console.log('next')
      this.current++
      if(this.current === this.geojson.features.length) {
        this.end()
      } else {
        this.departmentName = this.geojson.features[this.solutionIds[this.current]].properties[this.game.field]
        this.question = "Où est " + this.game.typeLabel + " <span style=\"color:#35a; font-weight: 700;\">" + this.departmentName + "</span> ?"
      }
    },
    onClic(name, layer) {
      if(this.playing) {
        if(this.departmentName === name) {
          this.result = "Correct"
          this.score += this.bonus
          this.bonus += 20
          layer.feature.properties.won = true
          layer.setStyle({fillColor: "green"})

          // zoom sur cette feature
          //const bounds = [[layer._bounds._southWest.lat, layer._bounds._southWest.lng], [layer._bounds._northEast.lat, layer._bounds._northEast.lng]]
          //this.map.mapObject.flyToBounds(bounds, { padding: [20, 20]})
        } else {
          this.result = "Incorrect (" + name + ")"
          this.bonus = 100
          layer.setStyle({fillColor: "red"})
          
          // zoom sur la bonne feature, à déterminer
          var group = new featureGroup()
          this.map.mapObject.eachLayer(function(layer) {
            if(layer.feature != undefined && layer.feature.properties[this.game.field] === this.departmentName) {
              console.log(layer)
              group.addLayer(layer)
              layer.setStyle({fillColor: "orange"})
            }
          }.bind(this))
          console.log(group.getBounds())
          this.map.mapObject.flyToBounds(group.getBounds(), { padding: [20, 20]})
          
        }
        this.next()
        //this.end()
      }
    },
    end() {
      console.log('end of game')
      this.result = "Game over"
      this.playing = false

      // save high score
      this.$refs.savescore.show(this.game, this.score)
    },
    quit() {
      console.log('quit game')
      this.$parent.quitGame()
    },
    restart() {
      console.log('restart')
      this.launch(this.game)
    },
    showHighscores() {
      this.$refs.highscores.show(this.game)
    },
    onEachFeature(feature, layer) {
      const self = this

      layer.on('mouseover', function() {
        this.setStyle({fillColor: "#e4ce30"})
      })

      layer.on('mouseout', function() {
        if(this.feature.properties.won) this.setStyle({fillColor: "green"}) 
        else this.setStyle({fillColor: "#e4ce7f"})
      })

      layer.on('click', function() {
        console.log('click on ' + feature.properties[self.game.field])
        self.onClic(feature.properties[self.game.field], this)
      })
    }
  }
}

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

.container {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  text-align: center;
  overflow: hidden;
}

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

.vue2leaflet-map {
  width: auto;
}

#panel {
  position: relative;
  transform: perspective(1px) translateY(-100%);
  width: 95%;
  height: 220px;
  margin: 0 auto;
  padding: 5px;
  z-index: 1000;
  background: linear-gradient(#d5d5d577, #ffffffff);
  color: white;
  border: 2px solid #FFFFFF;
  border-radius: 11px;
}

#question {
  color: #111;
  font-size: 2.5em;
}

.deptname {
  color: red;
}

#result {
  color: #333;
  font-size: 1.5em;
}

.fade-in-enter-active {
  transition: opacity 300ms cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

.fade-in-leave-active {
  transition: opacity 225ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.fade-in-enter,
.fade-in-leave-to {
  opacity: 0;
}

#progressborder {
  border: 1px solid #898989;
}

#progressbar {
  position: absolute;
  left: 5;
  height: 23px;
  background-color: lightskyblue;
}

#progression {
  color: #333;
  font-size: 1em;
  padding-top: 4px;
}

#score {
  color: #333;
  font-size: 1.5em;
}

#bonus {
  color: #333;
  font-size: 1.5em;
}

#buttons {
  position: fixed;
  z-index: 999;
  right: 5px;
  top: 5px;
  max-width: 160px;
  background: linear-gradient(#d5d5d577, #ffffffff);
  color: white;
  border: 2px solid #FFFFFF;
  border-radius: 11px;
}

#buttons button {
  width: 100%;
  margin-bottom: 5px;
}

#highscores {
  position: fixed;
  width: 100vw;
  height: 100vh;
  bottom: 0;
  right: 0;
  z-index: 2000;
  background-color: rgb(0, 0, 0, 0.8);
  /*visibility: hidden;
  opacity: 0;
  overflow: hidden;
  transition: .64s ease-in-out;*/
}

#savescore {
  position: fixed;
  width: 100vw;
  height: 100vh;
  bottom: 0;
  right: 0;
  z-index: 2000;
  background-color: rgb(0, 0, 0, 0.8);
  /*visibility: hidden;
  opacity: 0;
  overflow: hidden;
  transition: .64s ease-in-out;*/
}

</style>
