<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import type { GameConfig, ScoreEntry } from '../types'
import { t } from '../i18n'
import { useEscape } from '../composables/useEscape'
import { useOnline } from '../composables/useOnline'

const props = defineProps<{ game: GameConfig }>()
const emit = defineEmits<{ close: [] }>()

const players = ref<ScoreEntry[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const online = useOnline()
const closeButton = useTemplateRef<HTMLButtonElement>('closeButton')

useEscape(() => emit('close'))

onMounted(async () => {
  closeButton.value?.focus()
  if (!online.value) {
    error.value = t('highscores.offline')
    loading.value = false
    return
  }
  try {
    const response = await fetch(`/api/scores?game=${encodeURIComponent(props.game.id)}`, {
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    players.value = (await response.json()) as ScoreEntry[]
  } catch (e) {
    console.warn('meilleurs scores indisponibles', e)
    error.value = t('highscores.unavailable')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div
    id="highscores"
    class="overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="highscores-title"
  >
    <h1 id="highscores-title" class="title">{{ t('highscores.title') }}</h1>
    <h2>{{ game.label }}</h2>
    <p v-if="error" role="status">{{ error }}</p>
    <p v-else-if="!loading && players.length === 0">{{ t('highscores.empty') }}</p>

    <table v-if="players.length > 0">
      <caption class="sr-only">
        {{
          t('highscores.title')
        }}
      </caption>
      <thead class="sr-only">
        <tr>
          <th scope="col">{{ t('highscores.rank') }}</th>
          <th scope="col">{{ t('highscores.name') }}</th>
          <th scope="col">{{ t('highscores.score') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(p, i) in players" :key="i">
          <td class="player-position">{{ i + 1 }}</td>
          <td class="player-name">{{ p.name }}</td>
          <td class="player-score">{{ p.score }}</td>
        </tr>
      </tbody>
    </table>

    <button id="close" ref="closeButton" @click="emit('close')">{{ t('highscores.close') }}</button>
  </div>
</template>

<style scoped>
table {
  width: min(480px, 100%);
  margin: 0 auto 20px;
  border-collapse: separate;
  border-spacing: 0;
  background-color: #2c3e50;
  border-radius: 20px;
  padding: 6px;
  box-shadow: 3px 3px 11px -3px #000000;
  font-weight: 700;
}

td {
  padding: 4px 8px;
}

.player-position {
  color: lightgray;
  font-size: 1.6em;
}

.player-name {
  color: yellow;
  font-size: 1.2em;
  overflow-wrap: anywhere;
}

.player-score {
  color: lightgreen;
  font-size: 1.4em;
}
</style>
