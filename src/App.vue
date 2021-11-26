<template>
  <div id="app">
    <div id="menu" v-show="showMenu">
      <h1 class="title">dept-quiz</h1>
      
      <h2>Choisis un jeu</h2>

      <div id="games">
        
        <div class="game" 
            v-for="g in games"
            :key="g.id"
            v-on:click="select($event, g)">
          <img v-bind:src="require('./img/' + g.image)" />
          <h3>{{ g.label }}</h3>
        </div>
      </div>
    </div>

    <Game ref="game" v-show="showGame"/>

  </div>
</template>

<script>
import Game from './components/Game.vue'
import * as env from './utils/env.js'

export default {
  name: 'App',
  components: {
    Game
  },
  data() {
    return {
      showMenu: true,
      showGame: true,
      games: [],
      game: null
    }
  },
  mounted() {
    this.game = this.$refs.game
  },
  async created() {
    const response = await fetch(env.getServerUrl() + "/games")
    const data = await response.json()
    this.games = data

    this.showMenu = true
    this.showGame = false
  },
  methods: {
    select: function(event, game) {
      console.log("select " + game.id)
      this.showMenu = false
      this.showGame = true
      this.game.launch(game)
    },
    quitGame() {
      this.showMenu = true
      this.showGame = false
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

html,
body {
  margin: 0;
  padding: 0;
  height: 100vh;
  width: 100vw;
  background-color: #343434;
}

#app {
  user-select: none;
  color: white;
  width: 100%;
  height: 100%;
  margin: 0;
}

.title {
  color: rgb(74, 120, 236);
  font-weight: 700;
}

#games {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  width: 100%;
  background: transparent;
  margin: 10px auto;
  position: relative;
  text-align:center;
}

.game {
  width: 300px;
  height: 300px;
  margin: 20px;
  padding: 20px;
  cursor: pointer;
  background-color: #5eb79320;
  border: 5px solid transparent;
  border-radius: 20px;
  box-shadow: 3px 3px 11px -3px #000000;
}

.game:hover {
  background-color: #5eb79360;
}

.game:active {
  background-color: #5eb793aa;
}

.game h3 {
  font-size: 16px;
}

.game img {
  width: 70%;
  height: 70%;
}


button {
  background-color: #35a;
  border-radius: 11px;
  padding: 0px 10px 0px 10px;
  text-decoration: none;
  cursor: pointer;
  color: white;
  font-size: 1.5em;
}

button:hover {
  background-color: rgb(62, 102, 204);
  text-decoration: none;
}

</style>
