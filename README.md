# Simulateur budgétaire

Site statique : HTML, CSS et JavaScript, sans dépendance ni compilation, hébergé sur GitHub Pages.

## Ce que fait le simulateur

| Onglet | Contenu |
|---|---|
| **Synthèse** | Cotisations 2025 (BP) à 2029, courbes par commune, origine de la hausse 2025 → 2026 (cascade), cotisation et coût par enfant (camemberts) |
| **Communes & cotisations** | Clé de répartition (50/50), effectifs par commune et par année, communes hors membre, poids de la cotisation dans le budget de chaque commune, effectifs par classe et projection par niveau, calcul pas à pas de chaque cotisation |
| **Personnel** | Charges de personnel (chapitre 012) modifiables pour chaque année, répartition des postes entre services |
| **Budget** | Un sous-onglet par année (2026 à 2029) : le budget ligne par ligne. 2026 = proposition d'origine ; les années suivantes sont pré-remplies avec les montants 2026 (lignes ponctuelles à 0) et se modifient directement |

### Calcul des cotisations

```
Besoin = Dépenses − Recettes hors cotisations (dont participations des communes hors membre)
         − Résultat reporté + Fonds de roulement visé
Cotisation(commune membre) = Besoin × [ 50 % × pop / pop totale + 50 % × enfants / enfants des membres ]
```

Les enfants des communes hors membre comptent dans le coût moyen par enfant mais pas dans la clé.

## Mise en ligne

Le site est publié avec **GitHub Pages** : https://renardpal.github.io/sisbmt-simulateur/

Réglage : *Settings → Pages → Deploy from a branch → `main` / `(root)`*. Chaque modification fusionnée sur `main` met le site à jour en une minute environ. Il n'y a pas de compilation : les fichiers sont servis tels quels.

**En local** : ouvrir `index.html` dans un navigateur.

## Données

- Les valeurs initiales se trouvent dans `js/data.js`. Modifiez ce fichier pour changer la base que tout le monde reçoit en ouvrant le site.
- Les modifications faites dans l'interface sont enregistrées **dans le navigateur** (localStorage). Pour les garder ou les transmettre, utilisez **Sauvegarder** (fichier .json), puis **Ouvrir** sur un autre poste.
- Le bouton **CSV** exporte les tableaux pour Excel (séparateur `;`, virgule décimale).

## Structure

```
index.html
css/style.css
js/data.js    ← données de départ (budget, communes, transport, hypothèses)
js/model.js   ← moteur de calcul (sans interface)
js/app.js     ← interface
```
