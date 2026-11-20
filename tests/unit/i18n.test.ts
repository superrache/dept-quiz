import { describe, expect, it } from 'vitest'
import { t } from '../../src/i18n'
import { fr } from '../../src/i18n/fr'

describe('i18n', () => {
  it('traduit une clé simple', () => {
    expect(t('game.over')).toBe('Partie terminée')
  })

  it('remplace les paramètres', () => {
    expect(t('game.bonus', { n: 120 })).toBe('Bonus : 120%')
    expect(t('save.summary', { score: 9100, game: 'Congo' })).toBe(
      'Tu as marqué 9100 points à « Congo »',
    )
  })

  it('laisse en place un paramètre absent', () => {
    expect(t('game.incorrect')).toBe('Incorrect ({name})')
  })

  it('n’a aucun texte vide', () => {
    for (const section of Object.values(fr))
      for (const text of Object.values(section)) expect(text.trim()).not.toBe('')
  })
})
