<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import type { MapGeoJSONFeature } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import type { GameConfig } from '../types'
import { t } from '../i18n'
import { useQuiz } from '../composables/useQuiz'
import { useMediaQuery } from '../composables/useMediaQuery'
import QuizMap from './QuizMap.vue'
import HighscoresModal from './HighscoresModal.vue'
import SaveScoreModal from './SaveScoreModal.vue'
import LoadingScreen from './LoadingScreen.vue'
import restartIcon from '../img/restart.svg'
import learnIcon from '../img/learn.svg'
import cupIcon from '../img/cup.svg'
import exitIcon from '../img/exit.svg'

const props = defineProps<{ game: GameConfig }>()
const emit = defineEmits<{ quit: [] }>()

const map = useTemplateRef<InstanceType<typeof QuizMap>>('map')
const { score, corrects, bonus, index, total, expected, finished, start, answer, stop } = useQuiz()

const loading = ref(true)
const loadError = ref<string | null>(null)
const learning = ref(false)
const result = ref('')
const modal = ref<'none' | 'save' | 'highscores'>('none')

// Sur petit écran, le panneau est sous la carte (et non posé dessus)
const compact = useMediaQuery('(max-width: 700px)')
const mapPadding = computed(() =>
  compact.value
    ? { top: 70, bottom: 30, left: 20, right: 20 }
    : { top: 70, bottom: 220, left: 50, right: 50 },
)

async function launch(): Promise<void> {
  loading.value = true
  loadError.value = null
  learning.value = false
  modal.value = 'none'
  try {
    const response = await fetch(`/data/${props.game.geojson}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const geojson = (await response.json()) as FeatureCollection
    await map.value!.load(geojson, props.game.field)
    start(geojson.features.map((f) => String(f.properties?.[props.game.field])))
    map.value!.zoomToAll()
    result.value = t('game.select', { type: props.game.typeLabel })
    loading.value = false
  } catch (e) {
    console.error('chargement du jeu impossible', e)
    loadError.value = t('game.loadError')
  }
}

onMounted(launch)

function onSelect(feature: MapGeoJSONFeature): void {
  const given = String(feature.properties[props.game.field])
  const outcome = answer(given)
  if (!outcome) return

  if (outcome.correct) {
    result.value = t('game.correct')
    map.value!.markFound(feature.id)
  } else {
    result.value = t('game.incorrect', { name: given })
    map.value!.showExpected(outcome.expected)
  }

  if (finished.value) {
    result.value = t('game.over')
    modal.value = 'save'
  }
}

function toggleLearning(): void {
  learning.value = !learning.value
  if (learning.value) {
    stop()
    map.value!.setLabels(true)
  } else {
    void launch()
  }
}
</script>

<template>
  <div class="quiz" :class="{ compact }">
    <div class="map-area">
      <QuizMap ref="map" class="map" :padding="mapPadding" @select="onSelect" />

      <Transition mode="out-in" name="score-update">
        <div id="score" :key="learning ? 'learning' : score" aria-hidden="true">
          {{ learning ? '🧐' : score }}
        </div>
      </Transition>

      <div id="buttons" class="floating-panel">
        <button
          id="restart"
          :title="t('game.restart')"
          :aria-label="t('game.restart')"
          @click="launch"
        >
          <img :src="restartIcon" width="30" height="30" alt="" />
        </button>
        <button
          id="learning"
          :class="{ activatedbutton: learning }"
          :title="t('game.learning')"
          :aria-label="t('game.learning')"
          :aria-pressed="learning"
          :disabled="loading"
          @click="toggleLearning"
        >
          <img :src="learnIcon" width="30" height="30" alt="" />
        </button>
        <button
          id="showHighscores"
          :title="t('game.highscores')"
          :aria-label="t('game.highscores')"
          @click="modal = 'highscores'"
        >
          <img :src="cupIcon" width="30" height="30" alt="" />
        </button>
        <button
          id="quit"
          :title="t('game.quit')"
          :aria-label="t('game.quit')"
          @click="emit('quit')"
        >
          <img :src="exitIcon" width="30" height="30" alt="" />
        </button>
      </div>
    </div>

    <section v-show="!loading && !learning" id="panel" class="floating-panel">
      <div id="question" aria-live="polite">
        <template v-if="expected">
          {{ t('game.questionBefore', { type: game.typeLabel }) }}
          <span class="answer">{{ expected }}</span>{{ t('game.questionAfter') }}
        </template>
      </div>
      <Transition mode="out-in" name="result-update">
        <div id="result" :key="result" aria-live="polite">{{ result }}</div>
      </Transition>

      <div id="stats">
        <div id="corrects">{{ t('game.corrects', { n: corrects }) }}</div>
        <div id="progression">{{ index }} / {{ total }}</div>
        <Transition mode="out-in" name="bonus-update">
          <div id="bonus" :key="bonus">{{ t('game.bonus', { n: bonus }) }}</div>
        </Transition>
      </div>

      <div
        id="progressbar"
        role="progressbar"
        :aria-valuenow="index"
        aria-valuemin="0"
        :aria-valuemax="total"
      >
        <div :style="{ width: (total ? (index / total) * 100 : 0) + '%' }"></div>
      </div>
    </section>

    <HighscoresModal v-if="modal === 'highscores'" :game="game" @close="modal = 'none'" />
    <SaveScoreModal
      v-if="modal === 'save'"
      :game="game"
      :score="score"
      @saved="modal = 'highscores'"
      @close="modal = 'none'"
    />

    <LoadingScreen v-if="loading" :error="loadError" />
  </div>
</template>

<style scoped>
.quiz {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.map-area {
  position: relative;
  flex: 1;
  min-height: 0;
}

.map {
  position: absolute;
  inset: 0;
}

.floating-panel {
  background: linear-gradient(#d5d5d5ee, #ffffff);
  border: 2px solid #ffffff;
  border-radius: 11px;
  padding: 6px;
}

#score {
  position: absolute;
  z-index: 2;
  left: 16px;
  top: 12px;
  color: white;
  font-size: clamp(1.4rem, 5vw, 2rem);
  font-weight: 700;
  text-shadow: 3px 2px 5px black;
}

#buttons {
  position: absolute;
  z-index: 2;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
}

#buttons button {
  display: grid;
  place-items: center;
  min-width: 44px;
  min-height: 44px;
  padding: 4px;
}

.activatedbutton {
  background-color: rgb(200, 80, 255);
  border-color: white;
}

/* Grand écran : panneau flottant en bas de la carte */
#panel {
  position: absolute;
  z-index: 2;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  width: min(640px, calc(100% - 32px));
  color: #222;
}

/* Petit écran : panneau sous la carte, pour ne pas la masquer */
.compact #panel {
  position: static;
  transform: none;
  width: 100%;
  border-radius: 11px 11px 0 0;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
}

#question {
  color: #111;
  font-size: clamp(1.15rem, 4.5vw, 1.8rem);
  min-height: 1.3em;
}

.answer {
  color: var(--blue-dark);
  font-weight: 700;
}

#result {
  color: #333;
  font-size: clamp(1rem, 3.5vw, 1.3em);
}

#stats {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-top: 4px;
  color: #333;
}

#progression {
  color: var(--blue-dark);
  font-weight: 700;
}

#progressbar {
  height: 5px;
  margin-top: 4px;
  border-radius: 3px;
  background: rgba(47, 95, 208, 0.15);
  overflow: hidden;
}

#progressbar > div {
  height: 100%;
  background-color: var(--blue-dark);
  transition: width 0.3s;
}

.score-update-enter-active,
.bonus-update-enter-active {
  animation: bounce-in 0.7s;
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

.result-update-enter-active {
  transition: opacity 300ms cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

.result-update-leave-active {
  transition: opacity 225ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.result-update-enter-from,
.result-update-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .score-update-enter-active,
  .bonus-update-enter-active {
    animation: none;
  }
}
</style>
