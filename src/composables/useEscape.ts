import { onBeforeUnmount, onMounted } from 'vue'

/** Appelle `callback` quand on appuie sur Échap, tant que le composant est monté. */
export function useEscape(callback: () => void): void {
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') callback()
  }
  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
