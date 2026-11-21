import { onBeforeUnmount, ref } from 'vue'

/** Vrai tant que la media query correspond (réactif). */
export function useMediaQuery(query: string) {
  const list = window.matchMedia(query)
  const matches = ref(list.matches)
  const onChange = (event: MediaQueryListEvent) => (matches.value = event.matches)
  list.addEventListener('change', onChange)
  onBeforeUnmount(() => list.removeEventListener('change', onChange))
  return matches
}
