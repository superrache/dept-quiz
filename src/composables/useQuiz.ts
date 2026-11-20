import { computed, ref } from 'vue'

export const INITIAL_BONUS = 100
export const BONUS_STEP = 20

/** Mélange de Fisher-Yates (renvoie une copie). */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j] as T, result[i] as T]
  }
  return result
}

export interface AnswerResult {
  correct: boolean
  expected: string
  given: string
}

/**
 * Logique d'une partie, indépendante de la carte.
 *
 * Règles : le bonus commence à 100. Une bonne réponse ajoute le bonus au score puis
 * l'augmente de 20 ; une erreur remet le bonus à 100.
 */
export function useQuiz(random: () => number = Math.random) {
  const order = ref<string[]>([])
  const index = ref(0)
  const score = ref(0)
  const corrects = ref(0)
  const bonus = ref(INITIAL_BONUS)
  const playing = ref(false)

  const total = computed(() => order.value.length)
  const expected = computed<string | null>(() => order.value[index.value] ?? null)
  const finished = computed(() => total.value > 0 && index.value >= total.value)

  function start(answers: readonly string[]): void {
    order.value = shuffle(answers, random)
    index.value = 0
    score.value = 0
    corrects.value = 0
    bonus.value = INITIAL_BONUS
    playing.value = answers.length > 0
  }

  /** Enregistre une réponse. Renvoie null si aucune partie n'est en cours. */
  function answer(given: string): AnswerResult | null {
    const current = expected.value
    if (!playing.value || current === null) return null

    const correct = given === current
    if (correct) {
      score.value += bonus.value
      corrects.value++
      bonus.value += BONUS_STEP
    } else {
      bonus.value = INITIAL_BONUS
    }

    index.value++
    if (index.value >= total.value) playing.value = false
    return { correct, expected: current, given }
  }

  function stop(): void {
    playing.value = false
  }

  return { score, corrects, bonus, playing, index, total, expected, finished, start, answer, stop }
}
