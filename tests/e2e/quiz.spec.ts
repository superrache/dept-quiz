import { expect, test, type Page } from '@playwright/test'

const CONGO = {
  id: 'rdCongoProvNames',
  label: 'Les provinces de la République Démocratique du Congo',
  count: 26,
  field: 'name',
}
const maxScore = (n: number) => 100 * n + 10 * n * (n - 1)

// PNG 1×1 transparent : remplace les tuiles Stadia pour des tests reproductibles
const BLANK_TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

interface Saved {
  game: string
  name: string
  score: number
}

/** Simule l'API des scores et renvoie la liste des scores enregistrés. */
async function mockApi(page: Page, options: { fail?: boolean } = {}): Promise<Saved[]> {
  const saved: Saved[] = []
  await page.route('https://tiles.stadiamaps.com/tiles/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: BLANK_TILE }),
  )
  await page.route('**/api/scores**', async (route) => {
    if (options.fail) return route.fulfill({ status: 500, body: '{}' })
    const request = route.request()
    if (request.method() === 'POST') {
      saved.push(request.postDataJSON() as Saved)
      return route.fulfill({ status: 201, json: { ok: true } })
    }
    const game = new URL(request.url()).searchParams.get('game')
    const rows = saved
      .filter((s) => s.game === game)
      .sort((a, b) => b.score - a.score)
      .map(({ name, score }) => ({ name, score }))
    return route.fulfill({ json: rows })
  })
  return saved
}

/** Attend que la carte soit chargée et immobile. */
async function waitForMap(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const map = (window as unknown as { __quizMap?: import('maplibre-gl').Map }).__quizMap
    return !!map && map.isSourceLoaded('geojson') && !map.isMoving()
  })
}

/**
 * Pour chaque réponse possible, un point cliquable (dans la page) situé sur l'entité.
 * Balaye la carte et ignore les points masqués par un panneau.
 */
async function locateAnswers(
  page: Page,
  field: string,
): Promise<Record<string, { x: number; y: number }>> {
  await waitForMap(page)
  return page.evaluate((field) => {
    const map = (window as unknown as { __quizMap: import('maplibre-gl').Map }).__quizMap
    const canvas = map.getCanvas()
    const rect = canvas.getBoundingClientRect()
    const points: Record<string, { x: number; y: number }> = {}
    for (let y = 4; y < rect.height; y += 5) {
      for (let x = 4; x < rect.width; x += 5) {
        const feature = map.queryRenderedFeatures([x, y], { layers: ['geojson-layer'] })[0]
        if (!feature) continue
        const name = String(feature.properties[field])
        if (name in points) continue
        const pageX = rect.left + x
        const pageY = rect.top + y
        if (document.elementFromPoint(pageX, pageY) === canvas)
          points[name] = { x: pageX, y: pageY }
      }
    }
    return points
  }, field)
}

const expectedAnswer = (page: Page) => page.locator('#question .answer')

async function openCongo(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: CONGO.label }).click()
  await expect(page).toHaveURL(`/?game=${CONGO.id}`)
  await expect(page.locator('#question')).toContainText('Où est la province')
  await expect(page.locator('#progression')).toHaveText(`0 / ${CONGO.count}`)
}

test('le menu liste les jeux', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Choisis un jeu' })).toBeVisible()
  await expect(page.locator('.game-card')).toHaveCount(7)
})

test('une partie sans faute se termine par l’enregistrement du score', async ({ page }) => {
  test.setTimeout(120_000)
  const saved = await mockApi(page)
  await openCongo(page)

  const points = await locateAnswers(page, CONGO.field)
  expect(Object.keys(points)).toHaveLength(CONGO.count)

  for (let i = 0; i < CONGO.count; i++) {
    const name = (await expectedAnswer(page).textContent())!.trim()
    const point = points[name]
    expect(point, `point cliquable pour ${name}`).toBeDefined()
    await page.mouse.click(point!.x, point!.y)
    if (i < CONGO.count - 1)
      await expect(page.locator('#progression')).toHaveText(`${i + 1} / ${CONGO.count}`)
  }

  const score = maxScore(CONGO.count)
  await expect(page.locator('#result')).toHaveText('Partie terminée')
  await expect(page.locator('#corrects')).toHaveText(`Corrects : ${CONGO.count}`)
  await expect(page.locator('#savescore')).toContainText(`Tu as marqué ${score} points`)

  await page.getByLabel('Ton nom').fill('  Testeur ')
  await page.getByRole('button', { name: 'Enregistrer' }).click()

  expect(saved).toEqual([{ game: CONGO.id, name: 'Testeur', score }])
  await expect(page.locator('#highscores')).toContainText('Testeur')
  await expect(page.locator('#highscores')).toContainText(String(score))
})

test('une erreur remet le bonus à 100 et montre la bonne réponse', async ({ page }) => {
  await mockApi(page)
  await openCongo(page)
  const points = await locateAnswers(page, CONGO.field)

  // une bonne réponse pour faire monter le bonus
  const first = points[(await expectedAnswer(page).textContent())!.trim()]!
  await page.mouse.click(first.x, first.y)
  await expect(page.locator('#bonus')).toHaveText('Bonus : 120%')

  const expected = (await expectedAnswer(page).textContent())!.trim()
  const [wrong, point] = Object.entries(points).find(([name]) => name !== expected)!
  await page.mouse.click(point.x, point.y)

  await expect(page.locator('#result')).toHaveText(`Incorrect (${wrong})`)
  await expect(page.locator('#bonus')).toHaveText('Bonus : 100%')
  await expect(page.locator('#corrects')).toHaveText('Corrects : 1')
  await expect(page.locator('#progression')).toHaveText(`2 / ${CONGO.count}`)
})

test('le mode apprentissage masque la partie puis la relance', async ({ page }) => {
  await mockApi(page)
  await openCongo(page)

  await page.getByRole('button', { name: 'Mode apprentissage' }).click()
  await expect(page.locator('#score')).toHaveText('🧐')
  await expect(page.locator('#panel')).toBeHidden()

  await page.getByRole('button', { name: 'Mode apprentissage' }).click()
  await expect(page.locator('#panel')).toBeVisible()
  await expect(page.locator('#score')).toHaveText('0')
  await expect(page.locator('#progression')).toHaveText(`0 / ${CONGO.count}`)
})

test('l’URL ?game= ouvre directement un jeu et le bouton retour revient au menu', async ({
  page,
}) => {
  await mockApi(page)
  await page.goto('/')
  await page.goto('/?game=uk')
  await expect(page.locator('#question')).toContainText('Où est la région')

  await page.getByRole('button', { name: 'Quitter' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.locator('.game-card')).toHaveCount(7)

  await page.getByRole('button', { name: CONGO.label }).click()
  await page.goBack()
  await expect(page.locator('.game-card')).toHaveCount(7)
})

test('les meilleurs scores signalent une API indisponible', async ({ page }) => {
  await mockApi(page, { fail: true })
  await openCongo(page)
  await page.getByRole('button', { name: 'Meilleurs scores' }).click()
  await expect(page.locator('#highscores')).toContainText('indisponibles pour le moment')
  await page.getByRole('button', { name: 'Fermer' }).click()
  await expect(page.locator('#highscores')).toHaveCount(0)
})

test('Échap ferme la fenêtre des meilleurs scores', async ({ page }) => {
  await mockApi(page)
  await openCongo(page)
  await page.getByRole('button', { name: 'Meilleurs scores' }).click()
  await expect(page.getByRole('button', { name: 'Fermer' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('#highscores')).toHaveCount(0)
})

test.describe('sur mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('le panneau de question est sous la carte, sans la masquer', async ({ page }) => {
    await mockApi(page)
    await openCongo(page)
    const map = (await page.locator('.map-area').boundingBox())!
    const panel = (await page.locator('#panel').boundingBox())!
    expect(panel.y).toBeGreaterThanOrEqual(map.y + map.height - 1)
    expect(panel.y + panel.height).toBeLessThanOrEqual(844 + 1)

    for (const button of await page.locator('#buttons button').all()) {
      const box = (await button.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  })
})
