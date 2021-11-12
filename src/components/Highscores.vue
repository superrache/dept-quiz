<template>
  <div id="highscores" v-show="showHighscores">
      <h1>Highscores</h1>
      <h2>{{ game.label }}</h2>
      
      <div id="players">
        <table>
          <tr v-for="p in players" :key="p.position">
            <th id="player-position">{{ p.position }}</th>  
            <th id="player-name">{{ p.name }}</th>
            <th id="player-score">{{ p.score }}</th>
          </tr>
        </table>
      </div>
      <br/>
      <button id="close" v-on:click="close()">Close</button>
    </div>
</template>

<script>

export default {
  name: 'Highscores',
  data() {
    return {
      game: [],
      players: [],
      showHighscores: false
    }
  },
  methods: {
    async show(game) {
        this.game = game
        
        let url = window.location.origin.replace('8080', '3000')
        const response = await fetch(url + "/highscore?type=s&game=" + game.id)
        const data = await response.json()
        this.players = data

        for(var p in this.players) {
            this.players[p].position = eval(p) + 1
        }

        this.showHighscores = true
    },
    close() {
      this.showHighscores = false
    }
  }
}
</script>

<style>
.highscores {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

table {
  margin-left: auto;
  margin-right: auto;
  background-color: #2c3e50;
  border: 5px solid transparent;
  border-radius: 20px;
  box-shadow: 3px 3px 11px -3px #000000;
}

th {
    width: 150px;
}

#player-position {
    color: lightgray;
    font-size: 2em;
}

#player-name {
    color: yellow;
    font-size: 1.3em;
}

#player-score {
    color: lightgreen;
    font-size: 1.6em;
}

button {
  background: #5eb793;
  background-image: linear-gradient(to bottom, #34d98f, #006141);
  border-radius: 11px;
  padding: 0px 20px 0px 20px;
  text-decoration: none;
  cursor: pointer;
  color: white;
  font-size: 1.5em;
}

button:hover {
  background: #5eb793;
  background-image: linear-gradient(to bottom, #35bf65, #104d3b);
  text-decoration: none;
}

</style>