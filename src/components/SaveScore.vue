<template>
  <div id="save-score" v-show="showSaveScore">
      <h1>Save your score</h1>
      <h2>You scored {{ score }} at {{ game.label }}</h2>
      <input id="input-player-name" type="text" 
            placeholder="Enter your name" required 
            minLength=1 maxLength="25" size="14" 
            v-model="playerName"
            @keyup.enter="save()"/>
      <div id="buttons">
        <button id="save" v-on:click="save()">Save</button>
        <button id="close" v-on:click="close()">Cancel</button>
      </div>
    </div>
</template>

<script>

export default {
  name: 'SaveScore',
  data() {
    return {
      game: [],
      score: 0,
      playerName: "anonymous",
      showSaveScore: false
    }
  },
  methods: {
    show(game, score) {
        this.game = game
        this.score = score
        this.showSaveScore = true
    },
    async save() {
        let url = window.location.origin.replace('8080', '3000')
        const response = await fetch(url + "/highscore?type=i&game=" + this.game.id + "&name=" + this.playerName + "&score=" + this.score)
        await response.json()
        this.showSaveScore = false
        this.$parent.showHighscores()
    },
    close() {
      this.showSaveScore = false
    }
  }
}
</script>

<style>
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