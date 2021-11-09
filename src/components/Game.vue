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
          <div id="quit" v-on:click="quit()"><h2>Quitter</h2></div>
        </div>
    </div>
</template>

<script>
import { LMap, LTileLayer, LGeoJson } from "vue2-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

L.Icon.Default.imagePath = "https://unpkg.com/leaflet@1.3.4/dist/images/";

export default {
  name: 'Game',
  components: {
    "l-map": LMap,
    "l-tile-layer": LTileLayer,
    LGeoJson
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
      fillColor: "#e4ce7f",
      zoom: 6,
      center: { lat: 46.995, lng: 2.373 },
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
        const fillColor = this.fillColor; // important! need touch fillColor in computed for re-calculate when change fillColor
        return () => {
          //console.log("props " + feature.properties)
          return {
            weight: 2,
            color: "#ECEFF1",
            opacity: 1,
            fillColor: fillColor,
            fillOpacity: 0.5
          };
        };
      },
      onEachFeature() {
        const _this = this
        return (feature, layer) => {
          layer.on('click', function() {
            console.log('click on ' + feature.properties[_this.game.field])
            _this.onClic(feature.properties[_this.game.field])
          })
        }
      },
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
    onClic(name) {
      if(this.departmentName === name) {
        this.result = "Correct"
        this.score++
        //feature.properties.won = true
      } else {
        this.result = name
      }
      this.next()
    },
    end() {
      console.log('end of game')
      this.result = "Game over"

      // TODO save high score
    },
    quit() {
      console.log('quit game')
      this.$parent.quitGame()
      
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

#quit {
  position: absolute;
  left: 20px;
  bottom: 20px;
  background: #5eb793;
  background-image: linear-gradient(to bottom, #34d98f, #006141);
  border-radius: 11px;
  padding: 0px 20px 0px 20px;
  text-decoration: none;
  cursor: pointer;
}

#quit:hover {
  background: #5eb793;
  background-image: linear-gradient(to bottom, #35bf65, #104d3b);
  text-decoration: none;
}

</style>
