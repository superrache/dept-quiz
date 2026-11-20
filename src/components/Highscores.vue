<template>
  <div id="highscores" class="title" v-show="showHighscores">
      <h1>Meilleurs scores</h1>
      <h2>{{ game?.label }}</h2>
      <p v-if="error">{{ error }}</p>
      <p v-else-if="players.length === 0">Aucun score enregistré pour le moment.</p>
      
      <div id="players">
        <table>
          <tr v-for="(p, i) in players" :key="i">
            <th id="player-position">{{ i + 1 }}</th>  
            <th id="player-name">{{ p.name }}</th>
            <th id="player-score">{{ p.score }}</th>
          </tr>
        </table>
      </div>
      <br/>
      <button id="close" v-on:click="close()">Fermer</button>
    </div>
</template>

<script>
export default {
  name: 'Highscores',
  data() {
    return {
      game: null,
      players: [],
      error: null,
      showHighscores: false
    }
  },
  methods: {
    async show(game) {
        this.game = game
        this.players = []
        this.error = null
        this.showHighscores = true

        try {
            const response = await fetch("/api/scores?game=" + encodeURIComponent(game.id), { cache: "no-store" })
            if(!response.ok) throw new Error(response.status)
            this.players = await response.json()
        } catch(e) {
            console.warn("highscores indisponibles", e)
            this.error = "Les meilleurs scores sont indisponibles pour le moment."
        }
    },
    close() {
      this.showHighscores = false
    }
  }
}
</script>

<style scoped>
.highscores {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
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

</style>