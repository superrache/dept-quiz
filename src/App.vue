<script setup lang="ts">
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import type { GameConfig } from './types'
import { locale, t } from './i18n'
import { useOnline } from './composables/useOnline'

// Le jeu (et maplibre, ~1 Mo) n'est chargé qu'au lancement d'une partie
const loadQuizGame = () => import('./components/QuizGame.vue')
const QuizGame = defineAsyncComponent(loadQuizGame)

const games = ref<GameConfig[]>([])
const selected = ref<GameConfig | null>(null)
const error = ref<string | null>(null)
const online = useOnline()

watchEffect(() => (document.documentElement.lang = locale.value))

/** Ouvre le jeu indiqué par `?game=` (ou le menu). */
function syncFromUrl(): void {
  const id = new URLSearchParams(location.search).get('game')
  selected.value = games.value.find((g) => g.id === id) ?? null
}

function select(game: GameConfig): void {
  selected.value = game
  history.pushState(null, '', `/?game=${encodeURIComponent(game.id)}`)
}

function quit(): void {
  selected.value = null
  history.pushState(null, '', '/')
}

onMounted(async () => {
  window.addEventListener('popstate', syncFromUrl)
  try {
    const response = await fetch('/data/games.json')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    games.value = (await response.json()) as GameConfig[]
    syncFromUrl()
  } catch (e) {
    console.error('liste des jeux indisponible', e)
    error.value = t('app.gamesUnavailable')
  }
  // Précharge le jeu pendant que le joueur choisit
  const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500))
  idle(() => void loadQuizGame())
})

onBeforeUnmount(() => window.removeEventListener('popstate', syncFromUrl))
</script>

<template>
  <QuizGame v-if="selected" :key="selected.id" :game="selected" @quit="quit" />

  <main v-else id="menu">
    <h1 class="title">dept-quiz</h1>
    <h2>{{ t('app.chooseGame') }}</h2>
    <p v-if="!online" class="notice" role="status">{{ t('app.offline') }}</p>
    <p v-if="error" class="notice" role="alert">{{ error }}</p>

    <div id="games">
      <button v-for="g in games" :key="g.id" class="game-card" @click="select(g)">
        <img :src="`/img/${g.image}`" alt="" width="400" height="260" />
        <span class="game-label">{{ g.label }}</span>
      </button>
    </div>
  </main>
</template>

<style scoped>
#menu {
  min-height: 100%;
  padding: 24px 16px;
}

.notice {
  display: inline-block;
  margin: 0 0 8px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(255, 213, 74, 0.15);
  color: var(--focus);
}

#games {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  gap: 24px;
  max-width: 1200px;
  margin: 10px auto;
}

.game-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background-color: rgba(74, 120, 236, 0.1);
  border: 2px solid transparent;
  border-radius: 20px;
  box-shadow: 3px 3px 11px -3px #000000;
  font-size: 1rem;
}

.game-card:hover {
  background-color: rgba(74, 120, 236, 0.5);
}

.game-card:active {
  background-color: var(--blue);
}

.game-card img {
  width: 100%;
  height: auto;
  aspect-ratio: 400 / 260;
  object-fit: contain;
}

.game-label {
  font-weight: 700;
}
</style>
