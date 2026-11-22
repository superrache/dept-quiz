/**
 * Point d'entrée du Worker : seules les requêtes `/api/*` arrivent ici
 * (`run_worker_first` dans wrangler.toml). Le reste est servi depuis `dist/`.
 */
import { getScores, postScores } from './scores'

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (pathname === '/api/scores') {
      if (request.method === 'GET') return getScores(request, env)
      if (request.method === 'POST') return postScores(request, env)
      return new Response('Méthode non autorisée', { status: 405, headers: { Allow: 'GET, POST' } })
    }
    return new Response('Introuvable', { status: 404 })
  },
} satisfies ExportedHandler<Env>
