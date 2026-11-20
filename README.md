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

Les requêtes `/api/*` (meilleurs scores) sont redirigées en dev vers `wrangler pages dev` (port 8788).

## Fond de carte

Le fond aquarelle Stamen Watercolor est servi par [Stadia Maps](https://stadiamaps.com/).
En local, il fonctionne sans configuration. En production, il faut déclarer le domaine
(`<projet>.pages.dev` et le domaine personnalisé) dans le tableau de bord Stadia (authentification par domaine).

## Déploiement (Cloudflare Pages)

- Commande de build : `npm run build`
- Répertoire de sortie : `dist`
- Variable d'environnement : `NODE_VERSION=22`
