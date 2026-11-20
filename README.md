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

Les données des jeux sont des fichiers statiques dans `public/data/` (`games.json` et les GeoJSON).
Les images des jeux sont dans `public/img/`.

### API des meilleurs scores (Pages Function + D1)

L'API est dans `functions/api/scores.ts`, la base D1 est décrite dans `migrations/`.

```
npm run db:migrate:local   # crée la base D1 locale (une fois, puis à chaque nouvelle migration)
npm run build              # wrangler sert dist/ + functions/
npm run dev:api            # API sur http://localhost:8788
npm run dev                # dans un autre terminal : Vite redirige /api vers le port 8788
npm run typecheck          # vérifie le typage de la fonction
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
