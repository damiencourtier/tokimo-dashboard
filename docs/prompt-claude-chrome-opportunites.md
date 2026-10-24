Relève les opportunités d'investissement ouvertes sur Tokimo et importe-les dans mon dashboard, sous forme de données factuelles.

## Règles

- Sur app.tokimo.eu : **lecture seule**. Ne clique jamais sur « Investir maintenant », ni sur aucun bouton d'investissement, de crédit, de retrait ou d'auto-invest. Ne télécharge rien.
- Relève uniquement ce qui est affiché. Une valeur introuvable est `null` : ne devine pas et ne calcule rien.
- Ne donne **aucun avis** sur l'intérêt d'investir : c'est le dashboard qui confronte ces données à mes propres critères.
- **Montre-moi le récapitulatif et attends mon « ok » avant d'importer quoi que ce soit dans le dashboard.**

## 1. Lister les opportunités

Ouvre https://app.tokimo.eu/projects, onglet « En cours ». Pour chaque projet listé, note son lien `/projects/<n°>`.

Relève aussi ces opportunités, déjà présentes dans mon dashboard comme « En cours », même si elles n'apparaissent plus dans l'onglet « En cours » : leur statut a pu changer (retrouve-les dans « Financés »).

{{OPPORTUNITES_CONNUES}}

## 2. Lire chaque fiche `/projects/<n°>`

| Clé JSON | Type | Où le trouver |
|---|---|---|
| `tokimoId` | entier | le nombre à la fin de l'URL `/projects/<n°>` |
| `name` | texte | titre du projet |
| `city` | texte | ville sous le titre |
| `category` | texte | badge de catégorie en haut (ex. « Résidentiel », « Equity ») |
| `fundingStatus` | texte | badge de statut (« En cours », « Financé »…) |
| `rate` | nombre | « Rendement », en %/an (ex. 11,50 %/an → `11.5`) |
| `durationMonths` | entier | « Durée cible » / « Durée d'investissement », en mois |
| `paymentType` | texte | « Versement » (ex. « In fine », « Mensuel ») |
| `targetAmount` | nombre | « Objectif » / « Collecte cible », en € |
| `collectedAmount` | nombre | « Déjà collecté », en € |
| `minTicket` | nombre | « Ticket minimum », en € |
| `guarantees` | liste de textes | onglet « Garanties » : le **titre** de chaque garantie, tel quel |
| `ltv` | nombre | onglet « Bilan financier », ligne « LTV », en % (27,0 % → `27`) |
| `ltc` | nombre | onglet « Bilan financier », ligne « LTC », en % |
| `equity` | nombre | onglet « Bilan financier », « Capital propre engagé », en € |
| `rating` | texte | onglet « Analyse », « Évaluation Tokimo » : la **lettre** de la note (ex. « A ») |
| `ratingLabel` | texte | onglet « Analyse » : le libellé de la note (ex. « Excellent », « Très bien ») |
| `subScores` | objet | onglet « Analyse » : chaque sous-note sur 10, ex. `{"Localisation": 7, "Garanties": 9}` |
| `operator` | texte | onglet « Opérateur et travaux », « Présentation de l'opérateur » : le nom de la société |
| `preSalesPct` | nombre | pré-commercialisation en %, si elle est indiquée (ex. « 39,39 % de pré-commercialisation » → `39.39`) |
| `bonus` | texte | bonus affiché, s'il y en a un (ex. « 3 % bonus au taux d'ouverture ») |

Les nombres s'écrivent **sans unité ni espace**, avec un point décimal : `195000`, `11.5`.

## 3. Me montrer le récapitulatif

Un tableau, une ligne par opportunité : nom, statut, taux, durée, garanties, LTV, note, opérateur. Puis le JSON complet, exactement sous cette forme, uniquement avec les clés ci-dessus :

```json
{"items": [{"tokimoId": 135, "name": "…", "rate": 11.5, "guarantees": ["…"], "ltv": null}]}
```

Puis attends mon « ok ».

## 4. Importer dans le dashboard

Ouvre {{DASHBOARD_URL}}/opportunites (je suis connecté avec un compte admin). Dans la carte « Importer des opportunités », colle le JSON dans le champ prévu, puis clique sur « Importer ».

Si un message d'erreur s'affiche, rien n'a été enregistré : corrige les lignes signalées et réessaie.

## 5. Compte rendu

Termine par : le nombre d'opportunités créées et mises à jour (affiché après l'import), et les valeurs que tu n'as pas trouvées.
