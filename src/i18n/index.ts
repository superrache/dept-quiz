import { ref } from 'vue'
import { fr, type Messages } from './fr'

/**
 * Base d'internationalisation minimale (le français par défaut).
 *
 * Pour ajouter une langue : créer `en.ts` exportant un objet de type `Messages`,
 * l'ajouter à `catalogs`, puis appeler `setLocale('en')`.
 * Les libellés des jeux (games.json) ne sont pas traduits ici.
 */
const catalogs = { fr } satisfies Record<string, Messages>

export type Locale = keyof typeof catalogs
export type MessageKey = {
  [S in keyof Messages]: `${S & string}.${keyof Messages[S] & string}`
}[keyof Messages]

export const locale = ref<Locale>('fr')

/** Change de langue (App.vue répercute la langue sur `<html lang>`). */
export function setLocale(value: Locale): void {
  locale.value = value
}

/** Traduit une clé ; `{param}` est remplacé par la valeur correspondante. */
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  const [section, name] = key.split('.') as [keyof Messages, string]
  const template = (catalogs[locale.value][section] as Record<string, string>)[name] ?? key
  return template.replace(/\{(\w+)\}/g, (match, param: string) =>
    param in params ? String(params[param]) : match,
  )
}
