<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import type { GameConfig } from '../types'
import { t } from '../i18n'
import { useEscape } from '../composables/useEscape'
import { useOnline } from '../composables/useOnline'

const props = defineProps<{ game: GameConfig; score: number }>()
const emit = defineEmits<{ saved: []; close: [] }>()

const playerName = ref('anonyme')
const error = ref<string | null>(null)
const saving = ref(false)
const online = useOnline()
const input = useTemplateRef<HTMLInputElement>('input')

useEscape(() => emit('close'))
onMounted(() => input.value?.select())

async function save(): Promise<void> {
  const name = playerName.value.trim()
  if (name.length === 0 || saving.value || !online.value) return
  saving.value = true
  error.value = null
  try {
    const response = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: props.game.id, name, score: props.score }),
    })
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      const reason = data.error ?? t('save.httpError', { status: response.status })
      error.value = t('save.rejected', { reason })
      return
    }
    emit('saved')
  } catch (e) {
    console.warn('enregistrement du score impossible', e)
    error.value = t('save.failed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div id="savescore" class="overlay" role="dialog" aria-modal="true" aria-labelledby="save-title">
    <h1 id="save-title" class="title">{{ t('save.title') }}</h1>
    <h2>{{ t('save.summary', { score, game: game.label }) }}</h2>
    <p v-if="!online" role="status">{{ t('save.offline') }}</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <form @submit.prevent="save">
      <input
        id="input-player-name"
        ref="input"
        v-model="playerName"
        type="text"
        :placeholder="t('save.placeholder')"
        :aria-label="t('save.placeholder')"
        autocomplete="nickname"
        required
        minlength="1"
        maxlength="25"
        size="14"
      />
      <div class="actions">
        <button id="save" type="submit" :disabled="saving || !online">{{ t('save.save') }}</button>
        <button id="close" type="button" @click="emit('close')">{{ t('save.cancel') }}</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
#input-player-name {
  width: min(100%, 14em);
  color: var(--blue-dark);
  text-align: center;
  font-size: 1.6em;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 10px;
}
</style>
