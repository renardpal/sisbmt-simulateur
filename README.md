# Simulateur budgétaire – SISBMT

Simulateur du budget de fonctionnement du Syndicat intercommunal d'intérêt scolaire (siège : Thizy, 89), construit à partir du budget 2025 et de la proposition 2026.

Site statique : HTML, CSS et JavaScript, sans dépendance ni compilation.

## Ce que fait le simulateur

| Onglet | Contenu |
|---|---|
| **Synthèse** | Cotisations référence et scénario de 2026 à 2029, détail par commune, coût net par service |
| **Communes & cotisations** | Communes membres (population, enfants par année), clé de répartition (50/50 par défaut), simulation d'adhésion d'une commune, **détail pas à pas du calcul de la cotisation** |
| **Transport** | Pour chaque service (navette méridienne, ramassage…) : mode actuel et mode simulé (régie, prestataire, Région, supprimé), paramètres de coût, année d'effet avec prorata de septembre |
| **Budget 2026** | Toutes les lignes du budget avec le service, la nature (fixe, par enfant, par classe, ponctuelle) et l'indice d'évolution. Section d'investissement (virement 023, FCTVA) |
| **Projection** | Taux d'évolution par année, classes, fonds de roulement, ajustements libres, budget projeté par chapitre et par service |
| **Données à compléter** | Liste de contrôle des informations absentes du budget |

### Calcul des cotisations

```
Besoin = Dépenses de fonctionnement − Recettes hors cotisations − Résultat reporté + Fonds de roulement visé
Cotisation(commune) = Besoin × [ 50 % × pop_commune / pop_totale + 50 % × enfants_commune / enfants_total ]
```

### Référence et scénario

- **Référence** : le budget 2026 prolongé avec les hypothèses d'évolution.
- **Scénario** : la référence, plus les changements de mode de transport, les communes candidates actives, les ajustements et les investissements marqués « scénario seul ».

## Mise en ligne

**Netlify** : glisser-déposer le dossier sur https://app.netlify.com/drop, ou connecter le dépôt GitHub (pas de commande de build, dossier de publication `/`).

**GitHub Pages** : pousser le dossier dans un dépôt, puis aller dans *Settings → Pages → Deploy from branch → main / root*.

**En local** : ouvrir `index.html` dans un navigateur.

## Données

- Les valeurs initiales se trouvent dans `js/data.js`. Modifiez ce fichier pour changer la base que tout le monde reçoit en ouvrant le site.
- Les modifications faites dans l'interface sont enregistrées **dans le navigateur** (localStorage). Pour partager un scénario, utilisez **Exporter** (fichier .json), puis **Importer** sur un autre poste.
- Le bouton **CSV** exporte les tableaux pour Excel (séparateur `;`, virgule décimale).

## Structure

```
index.html
css/style.css
js/data.js    ← données de départ (budget, communes, transport, hypothèses)
js/model.js   ← moteur de calcul (sans interface)
js/app.js     ← interface
```
