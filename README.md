# Tokimo Dashboard

Dashboard perso de suivi et de prévisions pour ton portefeuille Tokimo, en Nuxt 3 + Nuxt UI + Chart.js.

## Démarrer

```bash
pnpm install
pnpm dev
```

Ouvre http://localhost:3000. Au premier lancement (ou après un rechargement de page), aucune donnée n'est
affichée : il faut importer tes fichiers.

## Mettre à jour les données

Va sur `/upload` dans l'app, ou clique sur "Mettre à jour les données" dans le header. Deux fichiers à récupérer sur Tokimo :

1. **Tableau de bord → Vos souscriptions → Exporter les projets** → `liste_projets_du_*.csv`
2. **Mon compte → Mes transactions → Exporter les transactions** → `liste_transactions_du_*.csv`

Dépose-les un par un dans la page d'upload. Les CSV sont parsés côté serveur (juste le temps de la requête)
et le résultat est renvoyé au navigateur, qui le garde en mémoire pour la session en cours — rien n'est
écrit sur disque. Un rechargement de page vide les données ; il faut réimporter les fichiers.

## Structure

- `pages/index.vue` — le dashboard (KPIs, graphiques, table des projets)
- `pages/upload.vue` — l'import des CSV
- `composables/usePortfolio.ts` — état en mémoire côté client (projets/transactions), remis à zéro à
  chaque rechargement de page
- `server/api/upload/*.post.ts` — parsing des CSV (aucune écriture disque, la réponse contient les données)
- `server/utils/parse.ts` — parsing des formats CSV Tokimo (délimiteur `;`, nombres à la française)
- `utils/computeDashboard.ts` — logique de calcul (répartitions, fiscalité, prévisions), exécutée côté
  client à partir des données en mémoire

## Notes

- Les prévisions sont des estimations théoriques (capital actif × taux cible moyen pondéré, puis
  application du taux de prélèvement fiscal effectif constaté). Elles ne tiennent pas compte des retards
  de chantier ou remboursements anticipés.
- Aucune donnée financière n'est persistée nulle part (ni disque, ni cookie, ni localStorage) : tout vit en
  mémoire JS le temps de la session de navigation.
