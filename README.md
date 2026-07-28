# Tokimo Dashboard (frontend)

Dashboard perso de suivi et de prévisions pour ton portefeuille Tokimo — Nuxt 3 + Nuxt UI + Chart.js,
en **SPA pure** (pas de rendu serveur). Toutes les données et l'authentification viennent d'une API
séparée : [tokimo-api](../tokimo-api) (Symfony + API Platform).

**Pourquoi une SPA ?** L'API tourne sur un domaine différent du frontend (IONOS vs Netlify) et pose un
cookie de session httpOnly sur *son* domaine. Ce cookie n'est jamais visible par un rendu serveur Nuxt
(les cookies sont strictement isolés par domaine par le navigateur) — toute la logique d'auth/données doit
donc tourner côté client. `ssr: false` dans `nuxt.config.ts`.

## Démarrer

```bash
cp .env.example .env   # NUXT_PUBLIC_API_BASE_URL doit pointer vers l'API (localhost:8000 en local)
pnpm install
pnpm dev
```

Il faut que [tokimo-api](../tokimo-api) tourne en local (`symfony server:start`) avec sa base MySQL
(`docker compose up -d` dans ce dossier-là). Voir son README pour le setup complet (migrations, création
du premier compte admin).

Ouvre http://localhost:3000 — tu seras redirigé vers `/login`. Toute page (hors `/login`) exige une
session valide côté client (`middleware/auth.global.ts`) ; l'API refuse aussi toute requête non
authentifiée de son côté (double protection, l'API reste la source de vérité).

**Dev local et cookie cross-site** : utilise `https://localhost:8000` (pas `127.0.0.1`) comme
`NUXT_PUBLIC_API_BASE_URL` — le cookie de session a `SameSite=None` en HTTPS, mais `localhost` et
`127.0.0.1` sont des sites différents pour le navigateur ; avec `127.0.0.1` le cookie ne serait jamais
renvoyé par le front en `localhost:3000`.

## Mettre à jour les données

Va sur `/upload` dans l'app, ou clique sur "Mettre à jour les données" dans le header. Deux fichiers à
récupérer sur Tokimo :

1. **Tableau de bord → Vos souscriptions → Exporter les projets** → `liste_projets_du_*.csv`
2. **Mon compte → Mes transactions → Exporter les transactions** → `liste_transactions_du_*.csv`

Dépose-les un par un dans la page d'upload — envoyés à l'API (`POST /upload/projects` et
`/upload/transactions`), qui gère l'upsert/remplacement. Réimporter les mêmes fichiers plus tard met à
jour les données existantes sans doublons, sans jamais écraser le taux/type de versement/durée si déjà
définis (voir le README de tokimo-api pour le détail du modèle de données).

## Éditer un projet

Sur la fiche d'un projet (`/projects/<nom>`), le **taux**, le **type de versement** (mensuel / in fine) et
la **durée du prêt** (en mois) sont éditables et enregistrés immédiatement — **réservé aux comptes admin**.
Ce sont des faits du projet, partagés par tous les comptes qui y ont souscrit.

## Structure

- `pages/index.vue` — le dashboard (KPIs, graphiques, table des projets)
- `pages/upload.vue` — l'import des CSV
- `pages/login.vue`, `pages/admin/users.vue` — authentification et gestion des comptes (admin)
- `composables/useApi.ts` — instance `$fetch` pointée sur l'API externe, cookies inclus
  (`credentials: 'include'`, indispensable puisque le cookie vit sur le domaine de l'API)
- `composables/useAuth.ts` — état d'authentification côté client (`user`, `loggedIn`, `isAdmin`, `login()`,
  `logout()`) — appelle `/me`, `/login`, `/logout` sur l'API externe
- `composables/usePortfolio.ts` — récupère `/portfolio` (via `useAsyncData`, clé `portfolio` partagée
  entre les pages) ; `refresh()` à appeler après un import ou une édition
- `middleware/auth.global.ts` — redirige vers `/login` si non authentifié (entièrement client-side)
- `utils/computeDashboard.ts` — logique de calcul (répartitions, fiscalité, prévisions), exécutée côté
  client à partir des données chargées depuis l'API

## Comptes

Pas d'inscription publique. Le premier compte admin se crée via l'API (`pnpm app:create-user` dans
tokimo-api). Ensuite, les admins peuvent créer d'autres comptes directement depuis le site, sur
`/admin/users` (lien "Comptes" dans le header, visible seulement pour les admins).

Plusieurs comptes sont possibles et sont **cloisonnés pour leurs propres données** : chaque compte ne voit
et ne peut modifier que ses propres souscriptions et transactions. Les projets (taux, type de versement,
durée) sont des données globales partagées par tous les comptes, mais seul un compte **admin** peut les
éditer.

## Déploiement (Netlify)

SPA statique : `nitro.preset` est réglé sur `netlify` automatiquement au build sur Netlify (détecté via
la variable d'env `NETLIFY`). Aucune fonction serverless nécessaire — tout le rendu est client-side, le
seul appel réseau côté build est vers l'API externe au runtime (navigateur), jamais au build.

Variable d'environnement à configurer dans le dashboard Netlify : `NUXT_PUBLIC_API_BASE_URL` (URL de
tokimo-api en prod, ex. `https://api.tondomaine.fr`).

## Notes

- Les prévisions sont des estimations théoriques (capital actif × taux cible moyen pondéré, puis
  application du taux de prélèvement fiscal effectif constaté). Elles ne tiennent pas compte des retards
  de chantier ou remboursements anticipés.
- Aucune donnée n'est persistée par ce projet — tout vit dans [tokimo-api](../tokimo-api) et sa base MySQL.
