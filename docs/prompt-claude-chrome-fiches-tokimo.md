Récupère les infos des fiches projet Tokimo et reporte-les dans mon dashboard.

**Projets à traiter :** {{PROJETS}}

## Règles

- Sur app.tokimo.eu : **lecture seule**. Ne clique sur aucun bouton d'investissement, de crédit, de retrait, d'auto-invest ou de parrainage. Ne télécharge rien.
- Sur le dashboard : ne modifie **que** les champs listés plus bas, et rien d'autre (pas le taux, pas les comptes, pas l'import).
- **Montre-moi le tableau récapitulatif et attends mon « ok » avant d'écrire quoi que ce soit dans le dashboard.**
- Une valeur introuvable reste vide : ne devine pas.

## 1. Lister mes souscriptions sur Tokimo

Ouvre https://app.tokimo.eu/mon-compte, section « Vos souscriptions ». Parcours **toute** la liste (pages suivantes, « voir plus », défilement), car elle affiche seulement 10 lignes à la fois. Pour chaque projet à traiter, note son nom exact et le lien `/investissements/<n°>`.

Un même projet peut apparaître plusieurs fois (plusieurs souscriptions, par ex. VILLA MIREILLE - MANDELIEU) : traite-le une seule fois.

## 2. Lire chaque fiche projet

Depuis la page `/investissements/<n°>`, suis le lien vers la fiche publique `/projects/<n°>`. Relève :

| Champ | Où le trouver sur la fiche |
|---|---|
| N° de fiche Tokimo | le nombre à la fin de l'URL `/projects/<n°>` |
| Durée cible (mois) | bandeau du haut, « Durée cible » (ex. « 12 mois » → 12) |
| Type de versement | bandeau du haut, « Versement » (« In fine » ou « Mensuel ») |
| Opérateur | onglet « Opérateur et travaux », bloc « Présentation de l'opérateur » (nom de la société, ex. « SAS HDB INVEST ») |
| Garanties | onglet « Garanties » : le **titre** de chaque garantie, recopié tel quel (ex. « Hypothèque inscrite de 1er rang ») |
| Note Tokimo | onglet « Analyse », « Évaluation Tokimo » : la **lettre** de la note (ex. « A »), pas le libellé « Excellent » |
| LTV (%) | onglet « Bilan financier », « Indicateurs financiers », ligne « LTV » (ex. « 27.0 % » → 27) |

## 3. Me montrer le récapitulatif

Un tableau, une ligne par projet : nom, n° de fiche, durée, versement, opérateur, garanties, note, LTV.

En dessous, liste à part :
- les projets Tokimo que tu n'as pas trouvés dans le dashboard (nom différent) ;
- les champs déjà remplis sur le dashboard **avec une valeur différente** de Tokimo : ne les écrase pas sans mon accord explicite.

Puis attends mon « ok ».

## 4. Remplir le dashboard

Ouvre {{DASHBOARD_URL}} (je suis connecté avec un compte admin). Pour chaque projet, va sur `{{DASHBOARD_URL}}/projects/<nom du projet encodé pour une URL>` (ou clique sur son nom dans le tableau des projets du dashboard). Dans la carte « Infos complémentaires (admin) » :

- **N° de fiche Tokimo**, **Opérateur**, **Note Tokimo**, **LTV (%)** : saisis la valeur.
- **Garanties** : une garantie par ligne.
- **Durée du prêt (mois)** : la durée cible.
- **Type de versement** : « In fine (à l'échéance) » ou « Mensuel ».

Chaque champ s'enregistre quand tu cliques ailleurs (sortie du champ). Vérifie qu'aucun message d'erreur rouge n'apparaît sous le champ avant de passer au suivant.

## 5. Compte rendu

Termine par : le nombre de projets mis à jour, ceux ignorés et pourquoi, et les éventuelles erreurs d'enregistrement.
