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
          <div id="question">
              <h1>{{ question }}</h1>
          </div>
          <div id="result">
              <h2>{{ result }}</h2>
          </div>
          <div id="score">
              <h2>{{ score }} / {{ solutionIds.length }}</h2>
          </div>
          <button id="restart" v-on:click="restart()">Restart</button>
          <button id="quit" v-on:click="quit()">Quit</button>
          <button id="showHighscores" v-on:click="showHighscores()">Highscores</button>
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
      departmentName: "",
      geojson: null,
      solutionIds: [],
      current: 0,
      dispGeojson: true,
      map: null,
      zoom: 2,
      center: { lat: 0, lng: 0 },
      url: "http://tile.stamen.com/watercolor/{z}/{x}/{y}.jpg",
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
      let url = window.location.origin.replace('8080', '3000');
      const response = await fetch(url + "/geojson?file=" + this.game.geojson)
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
      this.score = 0

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
        this.question = "Où est " + this.game.typeLabel + " " + this.departmentName + " ?"
      }
    },
    onClic(name, layer) {
      if(this.departmentName === name) {
        this.result = "Correct"
        this.score++
        layer.feature.properties.won = true
        layer.setStyle({fillColor: "green"})

        // zoom sur cette feature
        //const bounds = [[layer._bounds._southWest.lat, layer._bounds._southWest.lng], [layer._bounds._northEast.lat, layer._bounds._northEast.lng]]
        //this.map.mapObject.flyToBounds(bounds, { padding: [20, 20]})
      } else {
        this.result = name
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
    },
    end() {
      console.log('end of game')
      this.result = "Game over"

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
  width: 100%;
  height: 100%;
}

li {
  cursor: pointer;
}

a {
  color: #5eb793;
}

h1 {
  color: #5eb793;
}

#map {
  margin-left: 350px;
  width: 100% - 350px;
  height: 100%;
  z-index: 1;
}

.vue2leaflet-map {
  width: auto;
}

#panel {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 350px;
  height: 100%;
  z-index: 1000;
  padding: 0px;
  margin: 0px;
  background: linear-gradient(#343434, #1d1d1b);
  color: white;
}

@keyframes resultAnimation {
  0% { opacity: 1; }
  50% { opacity: 0; }
  100% { opacity: 1; }
}

#result {
  animation: resultAnimation 1.5s infinite;
}

@keyframes scoreAnimation {
  0% { background-color: transparent; }
  100% { background-color: green; }
}

#score {
  animation: scoreAnimation 0.5s infinte;
}

#restart {
  position: absolute;
  left: 20px;
  width: 310px;
  bottom: 120px;
}

#quit {
  position: absolute;
  left: 20px;
  bottom: 20px;
  width: 310px;
}

#showHighscores {
  position: absolute;
  left: 20px;
  bottom: 70px;
  width: 310px;
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
