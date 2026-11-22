import { describe, expect, it } from 'vitest'
import { cleanName, getScores, maxScore, postScores } from '../../worker/scores'

/** Fausse base D1 : enregistre les requêtes et renvoie des résultats prédéfinis. */
function fakeDb(options: { recent?: number; rows?: unknown[] } = {}) {
  const executed: { sql: string; params: unknown[] }[] = []
  const prepare = (sql: string) => ({
    bind: (...params: unknown[]) => {
      const statement = {
        sql,
        params,
        all: async () => {
          executed.push(statement)
          return { results: options.rows ?? [] }
        },
      }
      return statement
    },
  })
  const batch = async (statements: { sql: string; params: unknown[] }[]) => {
    executed.push(...statements)
    return statements.map((s) => ({
      results: s.sql.includes('COUNT') ? [{ n: options.recent ?? 0 }] : [],
    }))
  }
  return { executed, db: { prepare, batch } }
}

/** Arguments d'un handler : la requête et un environnement avec la fausse base. */
function context(request: Request, db: ReturnType<typeof fakeDb>['db']): [Request, Env] {
  return [request, { DB: db } as unknown as Env]
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://dept-quiz.test/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('maxScore', () => {
  it('vaut la somme des bonus d’un sans-faute', () => {
    expect(maxScore(0)).toBe(0)
    expect(maxScore(1)).toBe(100)
    expect(maxScore(2)).toBe(220)
    expect(maxScore(96)).toBe(100_800)
  })
})

describe('cleanName', () => {
  it.each([
    ['  Alice  ', 'Alice'],
    ['Jean\u0000 ​Pierre', 'Jean Pierre'],
    ['a   b', 'a b'],
    ['Élodie 🎉', 'Élodie 🎉'],
    ['x'.repeat(25), 'x'.repeat(25)],
  ])('accepte %j', (input, expected) => {
    expect(cleanName(input)).toBe(expected)
  })

  it.each([['   '], [''], ['x'.repeat(26)], [42], [null], [undefined]])('refuse %j', (input) => {
    expect(cleanName(input)).toBeNull()
  })
})

describe('GET /api/scores', () => {
  it('renvoie le classement du jeu', async () => {
    const rows = [{ name: 'Alice', score: 300 }]
    const { db, executed } = fakeDb({ rows })
    const response = await getScores(
      ...context(new Request('https://dept-quiz.test/api/scores?game=uk'), db),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(rows)
    expect(executed[0]?.params).toEqual(['uk', 15])
  })

  it('refuse un jeu inconnu', async () => {
    const { db } = fakeDb()
    const response = await getScores(
      ...context(new Request('https://dept-quiz.test/api/scores?game=%25'), db),
    )
    expect(response.status).toBe(400)
  })
})

describe('POST /api/scores', () => {
  it('enregistre un score valide', async () => {
    const { db, executed } = fakeDb()
    const response = await postScores(
      ...context(post({ game: 'uk', name: ' Bob ', score: maxScore(41) }), db),
    )
    expect(response.status).toBe(201)
    const insert = executed.find((s) => s.sql.startsWith('INSERT INTO scores'))
    expect(insert?.params).toEqual(['uk', 'Bob', maxScore(41)])
    // l'IP n'est jamais stockée en clair
    expect(JSON.stringify(executed)).not.toContain('203.0.113.7')
  })

  it.each([
    ['jeu inconnu', { game: 'xx', name: 'a', score: 1 }],
    ['nom vide', { game: 'uk', name: '  ', score: 1 }],
    ['score trop élevé', { game: 'uk', name: 'a', score: maxScore(41) + 1 }],
    ['score négatif', { game: 'uk', name: 'a', score: -1 }],
    ['score décimal', { game: 'uk', name: 'a', score: 1.5 }],
    ['score texte', { game: 'uk', name: 'a', score: '100' }],
    ['JSON null', null],
  ])('refuse : %s', async (_label, body) => {
    const { db, executed } = fakeDb()
    const response = await postScores(...context(post(body), db))
    expect(response.status).toBe(400)
    expect(executed).toHaveLength(0)
  })

  it('refuse un JSON invalide', async () => {
    const { db } = fakeDb()
    expect((await postScores(...context(post('{oops'), db))).status).toBe(400)
  })

  it('exige du JSON', async () => {
    const { db } = fakeDb()
    const response = await postScores(
      ...context(post({ game: 'uk', name: 'a', score: 1 }, { 'Content-Type': 'text/plain' }), db),
    )
    expect(response.status).toBe(415)
  })

  it('refuse une requête trop volumineuse', async () => {
    const { db } = fakeDb()
    const response = await postScores(
      ...context(post({ game: 'uk', name: 'x'.repeat(2000), score: 1 }), db),
    )
    expect(response.status).toBe(413)
  })

  it('limite le nombre d’envois par client', async () => {
    const { db, executed } = fakeDb({ recent: 10 })
    const response = await postScores(...context(post({ game: 'uk', name: 'a', score: 1 }), db))
    expect(response.status).toBe(429)
    expect(executed.some((s) => s.sql.startsWith('INSERT'))).toBe(false)
  })
})
