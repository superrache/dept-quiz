<template>
  <div id="save-score" v-show="showSaveScore">
      <h1 class="title">Enregistre ton score</h1>
      <h2>Tu as marqué {{ score }} points à « {{ game?.label }} »</h2>
      <p v-if="error">{{ error }}</p>
      <input id="input-player-name" type="text" 
            placeholder="Ton nom" required 
            minLength=1 maxLength="25" size="14" 
            v-model="playerName"
            @keyup.enter="save()"/>
      <div id="buttons">
        <button id="save" v-on:click="save()">Enregistrer</button>
        <button id="close" v-on:click="close()">Annuler</button>
      </div>
    </div>
</template>

<script>
export default {
  name: 'SaveScore',
  data() {
    return {
      game: null,
      score: 0,
      playerName: "anonyme",
      error: null,
      showSaveScore: false
    }
  },
  methods: {
    show(game, score) {
        this.game = game
        this.score = score
        this.error = null
        this.showSaveScore = true
    },
    async save() {
        const name = this.playerName.trim()
        if(name.length === 0) return
        try {
            const response = await fetch("/api/scores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ game: this.game.id, name, score: this.score })
            })
            if(!response.ok) throw new Error(response.status)
        } catch(e) {
            console.warn("enregistrement du score impossible", e)
            this.error = "Impossible d'enregistrer le score pour le moment."
            return
        }
        this.showSaveScore = false
        this.$parent.showHighscores()
    },
    close() {
      this.showSaveScore = false
    }
  }
}
</script>

<style scoped>
.save-score {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  margin-top: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

#input-player-name {
    color: blue;
    text-align: center;
    font-size: 2em;
}

#buttons {
  margin: 5px;
  padding: 5px;
}

#close {
  margin-left: 10px;
}

</style>