import { describe, expect, it } from 'vitest'
import { BONUS_STEP, INITIAL_BONUS, shuffle, useQuiz } from '../../src/composables/useQuiz'
import { maxScore } from '../../worker/scores'

const answers = ['Ain', 'Aisne', 'Allier', 'Ardèche', 'Aube']

describe('shuffle', () => {
  it('conserve tous les éléments sans modifier le tableau d’origine', () => {
    const input = [...answers]
    const result = shuffle(input)
    expect(result).toHaveLength(input.length)
    expect([...result].sort()).toEqual([...answers].sort())
    expect(input).toEqual(answers)
  })

  it('est déterministe avec un générateur donné', () => {
    expect(shuffle(answers, () => 0)).toEqual(shuffle(answers, () => 0))
  })
})

describe('useQuiz', () => {
  it('démarre une partie', () => {
    const quiz = useQuiz()
    quiz.start(answers)
    expect(quiz.playing.value).toBe(true)
    expect(quiz.total.value).toBe(answers.length)
    expect(quiz.index.value).toBe(0)
    expect(quiz.score.value).toBe(0)
    expect(quiz.bonus.value).toBe(INITIAL_BONUS)
    expect(answers).toContain(quiz.expected.value)
  })

  it('une bonne réponse ajoute le bonus puis l’augmente', () => {
    const quiz = useQuiz()
    quiz.start(answers)
    const outcome = quiz.answer(quiz.expected.value!)
    expect(outcome?.correct).toBe(true)
    expect(quiz.score.value).toBe(INITIAL_BONUS)
    expect(quiz.corrects.value).toBe(1)
    expect(quiz.bonus.value).toBe(INITIAL_BONUS + BONUS_STEP)
    expect(quiz.index.value).toBe(1)
  })

  it('une erreur remet le bonus à sa valeur initiale et indique la bonne réponse', () => {
    const quiz = useQuiz()
    quiz.start(answers)
    quiz.answer(quiz.expected.value!)
    const expected = quiz.expected.value!
    const outcome = quiz.answer('Paris')
    expect(outcome).toEqual({ correct: false, expected, given: 'Paris' })
    expect(quiz.score.value).toBe(INITIAL_BONUS)
    expect(quiz.bonus.value).toBe(INITIAL_BONUS)
    expect(quiz.index.value).toBe(2)
  })

  it('un sans-faute atteint exactement le plafond accepté par le serveur', () => {
    const quiz = useQuiz()
    quiz.start(answers)
    while (quiz.playing.value) quiz.answer(quiz.expected.value!)
    expect(quiz.finished.value).toBe(true)
    expect(quiz.corrects.value).toBe(answers.length)
    expect(quiz.score.value).toBe(maxScore(answers.length))
  })

  it('ignore les réponses une fois la partie terminée ou arrêtée', () => {
    const quiz = useQuiz()
    quiz.start(['Ain'])
    quiz.answer('Ain')
    expect(quiz.answer('Ain')).toBeNull()

    quiz.start(answers)
    quiz.stop()
    expect(quiz.answer(quiz.expected.value!)).toBeNull()
    expect(quiz.score.value).toBe(0)
  })

  it('redémarrer remet tout à zéro', () => {
    const quiz = useQuiz()
    quiz.start(answers)
    quiz.answer(quiz.expected.value!)
    quiz.start(answers)
    expect(quiz.score.value).toBe(0)
    expect(quiz.corrects.value).toBe(0)
    expect(quiz.index.value).toBe(0)
    expect(quiz.finished.value).toBe(false)
  })
})
