<template>
    <div class="container">
      <Map id="map" ref="map"/>

      <Transition mode="out-in" name="score-update">
        <div id="score" :key="score" v-html="score"></div>
      </Transition>

      <div id="panel" class="floating-panel" v-show="dispPanel">
        <div id="question" v-html="question"></div>
        <Transition mode="out-in" name="result-update">
          <div id="result" :key="result">{{ result }}</div>
        </Transition>

        <div id="stats">
          <div id="corrects">Corrects : {{ corrects }}</div>
          <Transition mode="out-in" name="bonus-update">
            <div id="bonus" :key="bonus">Bonus : {{ bonus }}%</div>
          </Transition>
        </div>

        <div id="progression">{{ current }} / {{ solutionIds.length }}</div>
        <div id="progressbar" :style="{width: current / solutionIds.length * 95 + '%'}"></div>
      </div>

      <div id="buttons" class="floating-panel">
        <button id="restart" v-on:click="restart()"><img src="../img/restart.svg" width=30 title="Redémarrer" /></button>
        <button id="learning" :class="{'activatedbutton': learning}" v-on:click="switchLearningMode()"><img src="../img/learn.svg" width=30 title="Mode apprentissage" /></button>
        <button id="showHighscores" v-on:click="showHighscores()"><img src="../img/cup.svg" width=30 title="Highscores" /></button>
        <button id="quit" v-on:click="quit()"><img src="../img/exit.svg" width=30 title="Quitter" /></button>
      </div>

      <Highscores id="highscores" ref="highscores"/>
      <SaveScore id="savescore" ref="savescore"/>

      <Loading id="loading" ref="loading" v-show="dispLoading"/>
    </div>
 
</template>

<script>

import Map from './Map.vue'
import Highscores from './Highscores.vue'
import SaveScore from './SaveScore.vue'
import Loading from './Loading.vue'
import * as env from '../utils/env.js'

export default {
  name: 'Game',
  components: {
    Map,
    Highscores,
    SaveScore,
    Loading
  },
  data() {
    return {
      game: [],
      question: "",
      result: "",
      score: 0,
      corrects: 0,
      bonus: 0,
      playing: false,
      departmentName: "",
      geojson: null,
      solutionIds: [],
      current: 0,
      mapVue: null,
      dispLoading: true,
      dispPanel: false,
      learning: false
    }
  },
  created() {
    this.question = "loading"
  },
  mounted() {
    this.mapVue = this.$refs.map
    this.mapVue.setGameVue(this)
  },
  methods: {
    async launch(game) {
      this.game = game
      console.log('starting game ' + this.game.id)

      this.dispLoading = true
      await this.load()
      this.shufflize()
      this.start()
    },
    async load() {
      console.log('loading geojson ' + this.game.geojson)
      fetch(env.getServerUrl() + "/stat?feature=dept-quiz-" + this.game.id)
      const response = await fetch(env.getServerUrl() + "/geojson?file=" + this.game.geojson)
      const data = await response.json()
      this.geojson = data

      this.mapVue.loadGeojson(this.geojson)

      console.log(this.geojson.features.length + ' features loaded')
    },
    shuffleArray(array) {
      let curId = array.length
      // There remain elements to shuffle
      while (0 !== curId) {
        // Pick a remaining element
        let randId = Math.floor(Math.random() * curId)
        curId -= 1
        // Swap it with the current element
        let tmp = array[curId]
        array[curId] = array[randId]
        array[randId] = tmp
      }
      return array
    },
    shufflize() {
      console.log('shuffling solution')
      this.solutionIds = new Array(this.geojson.features.length)
      for(var i = 0; i < this.geojson.features.length; i++) {
        this.solutionIds[i] = i
      }
      this.solutionIds = this.shuffleArray(this.solutionIds)
    },
    start() {
      console.log('game start')
      this.result = "Sélectionne " + this.game.typeLabel + " sur la carte"
      this.current = -1
      this.progression = 0
      this.score = 0
      this.corrects = 0
      this.bonus = 100
      this.playing = true
      this.dispLoading = false
      this.dispPanel = true

      this.mapVue.zoomToFeatures()

      this.next()
    },
    next() {
      console.log('next')
      this.current++
      if(this.current === this.geojson.features.length) {
        this.end()
      } else {
        this.departmentName = this.geojson.features[this.solutionIds[this.current]].properties[this.game.field]
        this.question = "Où est " + this.game.typeLabel + " <span class=\"title\">" + this.departmentName + "</span> ?"
      }
    },
    onClic(feature) {
      if(this.playing) {
        const name = feature.properties[this.game.field]
        if(this.departmentName === name) {
          this.result = "Correct"
          this.score += this.bonus
          this.corrects++
          this.bonus += 20

          this.mapVue.setGoodFeature(feature)
        } else {
          this.result = "Incorrect (" + name + ")"
          this.bonus = 100
          
          // zoom sur la bonne feature, à déterminer
          const goodFeature = this.mapVue.getFeature(this.game.field, this.departmentName)
          if(goodFeature !== null) {
            this.mapVue.setWasGoodFeature(goodFeature)
          } else {
            console.log("good feature not found")
          }
        }
        this.next()
        //this.end() // debug
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
      if(this.learning) this.switchLearningMode()
      this.$parent.quitGame()
    },
    restart() {
      console.log('restart')
      if(this.learning) {
        this.learning = false
        this.mapVue.setLearningMode(false, this.game.field)
      }
      this.launch(this.game)
    },
    showHighscores() {
      this.$refs.highscores.show(this.game)
    },
    switchLearningMode() {
      this.learning = !this.learning
      
      this.mapVue.setLearningMode(this.learning, this.game.field)

      if(this.learning) {
        this.playing = false
        this.dispPanel = false
        this.score = '&#129488;'
      } else {
        this.restart()
      }
    }
  }
}

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

@import '~maplibre-gl/dist/maplibre-gl.css';

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

.floating-panel {
  background: linear-gradient(#d5d5d577, #ffffffff);
  border: 2px solid #FFFFFF;
  border-radius: 11px;
  padding: 5px 5px 5px 5px;
}

#score {
  position: absolute;
  z-index: 1002;
  left: 20px;
  top: 20px;
  color: white;
  font-size: 2em;
  font-weight: 700;
  text-shadow: 3px 2px 5px black;
}

.score-update-enter-active {
  animation: bounce-in .7s;
}

@keyframes bounce-in {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(2.5);
  }
  60% {
    transform: scale(1);
  }
  80% {
    transform: scale(1.5);
  }
  100% {
    transform: scale(1);
  }
}

#panel {
  position: relative;
  transform: perspective(1px) translateY(-120%);
  width: 95%;
  margin: 0 auto;
  z-index: 1000;
  color: white;
  padding-bottom: 12px;
}

#question {
  color: #111;
  font-size: 2em;
}

.deptname {
  color: red;
}

#result {
  color: #333;
  font-size: 1.3em;
}

.result-update-enter-active {
  transition: opacity 300ms cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

.result-update-leave-active {
  transition: opacity 225ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.result-update-enter,
.result-update-leave-to {
  opacity: 0;
}

#stats {
  height: 0px;
}

#corrects {
  float: left;
  color: #333;
  font-size: 1em;
}

#bonus {
  float: right;
  text-align: right;
  color: #333;
  font-size: 1em;
}

.bonus-update-enter-active {
  animation: bounce-in .7s;
}

#progression {
  color: rgb(74, 120, 236);
  font-size: 1em;
  font-weight: 700;
}

#progressbar {
  position: absolute;
  height: 5px;
  background-color: rgb(74, 120, 236);
}

#buttons {
  position: fixed;
  z-index: 999;
  right: 50px;
  top: 9px;
  color: white;
}

#buttons button {
  margin: 0px 2px 0px 2px;
  padding-top: 5px;
}

.activatedbutton {
  background-color: rgb(200, 80, 255);
  border: 2px solid white;
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
