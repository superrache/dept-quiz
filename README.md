# dept-quiz

Jeu de géographie : retrouve sur la carte les départements français, leurs numéros, leurs préfectures, les États américains, les provinces de RDC, etc.

Application 100 % statique (Vite + Vue 3 + MapLibre), déployée sur **Cloudflare Pages**.

## Développement

Prérequis : Node.js 22 ou plus.

```
npm install
npm run dev       # serveur de dev sur http://localhost:5173
npm run build     # build de production dans dist/
npm run preview   # sert le build localement
```

### Qualité

```
npm run lint          # ESLint
npm run format        # Prettier (format:check pour vérifier seulement)
npm run typecheck     # vue-tsc + tsc (app, config, fonctions, tests)
npm test              # tests unitaires Vitest
npm run test:e2e      # tests de bout en bout Playwright (npx playwright install chromium au préalable)
```

Les commits suivent [Conventional Commits](https://www.conventionalcommits.org/) (vérifié par commitlint via Husky).
Les versions et le CHANGELOG sont gérés par standard-version, à partir des commits (Conventional Commits) :
`npm run release`, puis `git push --follow-tags`.

Les données des jeux sont des fichiers statiques dans `public/data/` (`games.json` et les GeoJSON).
Les images des jeux sont dans `public/img/`.

### API des meilleurs scores (Pages Function + D1)

L'API est dans `functions/api/scores.ts`, la base D1 est décrite dans `migrations/`.

```
npm run db:migrate:local   # crée la base D1 locale (une fois, puis à chaque nouvelle migration)
npm run build              # wrangler sert dist/ + functions/
npm run dev:api            # API sur http://localhost:8788
npm run dev                # dans un autre terminal : Vite redirige /api vers le port 8788
```

- `GET /api/scores?game=<id>` renvoie le top 15 `[{ name, score }]`.
- `POST /api/scores` reçoit `{ game, name, score }` en JSON.
  - Le jeu doit exister dans `games.json`. Le nom fait 1 à 25 caractères.
  - Le score est un entier compris entre 0 et `100·n + 10·n·(n−1)`, où `n` est le champ `count` du jeu.
  - Un même client peut envoyer au plus 10 scores par tranche de 10 minutes.
    Pour cela, la base garde une empreinte SHA-256 de son IP, effacée au bout de 10 minutes.

> Si vous ajoutez un jeu, renseignez `count` (le nombre d'entités du GeoJSON) dans `games.json`.

## Fond de carte

Le fond aquarelle Stamen Watercolor est servi par [Stadia Maps](https://stadiamaps.com/).
En local, il fonctionne sans configuration. En production, il faut déclarer le domaine
(`<projet>.pages.dev` et le domaine personnalisé) dans le tableau de bord Stadia (authentification par domaine).

## Données des jeux

Les GeoJSON bruts sont dans `data/source/`. `npm run data` les simplifie avec mapshaper
(champs utiles uniquement, géométries simplifiées, 4 décimales) et écrit le résultat dans `public/data/`.
Pour ajouter un jeu : déposer le GeoJSON dans `data/source/`, ajouter l'entrée dans
`public/data/games.json` (avec `count`), une image `public/img/<id>.webp`, puis lancer `npm run data` et `npm test`.

## Application installable (PWA)

Le build génère un service worker (`vite-plugin-pwa`). Le jeu s'installe et se joue hors ligne :
l'app, les données et les images sont en précache, et les tuiles déjà vues restent en cache.
Les meilleurs scores ne sont pas disponibles hors ligne. Le service worker n'est pas actif en `npm run dev` :
pour le tester, utiliser `npm run build && npm run preview`.

## Déploiement (Cloudflare Pages)

- Commande de build : `npm run build`
- Répertoire de sortie : `dist`
- Variable d'environnement : `NODE_VERSION=22`

Première mise en place de la base :

```
npx wrangler login
npx wrangler d1 create dept-quiz      # reporter le database_id dans wrangler.toml
npm run db:migrate:remote
```

Cloudflare Pages lit `wrangler.toml` et lie automatiquement la base D1 (binding `DB`) au projet.
