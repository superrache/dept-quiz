/**
 * API des meilleurs scores (Cloudflare Pages Function + D1)
 *
 *   GET  /api/scores?game=<id>               → top 15 [{ name, score }]
 *   POST /api/scores  { game, name, score }  → 201 { ok: true }
 */
import games from '../../public/data/games.json'

const TOP = 15
const NAME_MAX = 25
const BODY_MAX = 1024
const RATE_WINDOW_S = 600
const RATE_MAX = 10

/** Nombre d'éléments à trouver par jeu (champ `count` de games.json). */
const counts = new Map<string, number>(games.map((g) => [g.id, g.count]))

/**
 * Score maximal théorique pour n éléments : bonus initial 100, +20 par bonne réponse,
 * soit la somme de 100 + 20k pour k = 0..n-1.
 */
export function maxScore(n: number): number {
  return 100 * n + 10 * n * (n - 1)
}

/** Nettoie un pseudo : caractères de contrôle/invisibles retirés, espaces normalisés, 1 à 25 caractères. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const name = raw.normalize('NFC').replace(/\p{C}/gu, '').replace(/\s+/g, ' ').trim()
  const length = [...name].length
  return length >= 1 && length <= NAME_MAX ? name : null
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

const error = (status: number, message: string) => json({ error: message }, status)

async function clientKey(request: Request): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'inconnu'
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const game = new URL(request.url).searchParams.get('game')
  if (!game || !counts.has(game)) return error(400, 'jeu inconnu')

  const { results } = await env.DB.prepare(
    'SELECT name, score FROM scores WHERE game = ? ORDER BY score DESC, created_at ASC LIMIT ?',
  )
    .bind(game, TOP)
    .all<{ name: string; score: number }>()
  return json(results)
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
    return error(415, 'JSON attendu')
  }
  const text = await request.text()
  if (text.length > BODY_MAX) return error(413, 'requête trop volumineuse')

  let body: Record<string, unknown>
  try {
    body = JSON.parse(text)
  } catch {
    return error(400, 'JSON invalide')
  }
  if (typeof body !== 'object' || body === null) return error(400, 'JSON invalide')

  const game = typeof body.game === 'string' ? body.game : ''
  const count = counts.get(game)
  if (count === undefined) return error(400, 'jeu inconnu')

  const name = cleanName(body.name)
  if (name === null) return error(400, `nom invalide (1 à ${NAME_MAX} caractères)`)

  const score = body.score
  if (
    typeof score !== 'number' ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > maxScore(count)
  ) {
    return error(400, 'score invalide')
  }

  // Limitation de débit : RATE_MAX envois par client et par fenêtre de RATE_WINDOW_S secondes
  const client = await clientKey(request)
  const now = Math.floor(Date.now() / 1000)
  const [, recent] = await env.DB.batch([
    env.DB.prepare('DELETE FROM submissions WHERE created_at < ?').bind(now - RATE_WINDOW_S),
    env.DB.prepare('SELECT COUNT(*) AS n FROM submissions WHERE client = ?').bind(client),
  ])
  const n = (recent.results[0] as { n: number } | undefined)?.n ?? 0
  if (n >= RATE_MAX) return error(429, 'trop de scores envoyés, réessaie dans quelques minutes')

  await env.DB.batch([
    env.DB.prepare('INSERT INTO submissions (client, created_at) VALUES (?, ?)').bind(client, now),
    env.DB.prepare('INSERT INTO scores (game, name, score) VALUES (?, ?, ?)').bind(
      game,
      name,
      score,
    ),
  ])
  return json({ ok: true }, 201)
}
