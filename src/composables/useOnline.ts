import { readonly, ref } from 'vue'

const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => (online.value = true))
  window.addEventListener('offline', () => (online.value = false))
}

/** État de la connexion réseau (réactif, partagé par toute l'application). */
export function useOnline() {
  return readonly(online)
}
