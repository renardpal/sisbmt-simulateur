/* =====================================================================
   Données de départ du simulateur – SISBMT
   Source : budget 2025 (BP, DM, réalisé) + proposition 2026.
   Toutes ces valeurs sont modifiables dans l'interface ; ce fichier
   ne sert qu'à l'état initial (et au bouton « Réinitialiser »).
   ===================================================================== */

// nature :
//   fixe        → montant 2026 indexé chaque année
//   enfant      → varie avec le nombre d'enfants scolarisés
//   classe      → varie avec le nombre de classes
//   ponctuel    → uniquement en 2026
//   virement    → virement à l'investissement (calculé)
//   report      → résultat reporté (calculé)
//   cotisations → participations des communes (calculé)
// index : aucun | inflation | salaires | energie | alimentation | tarif

window.DEFAULT_STATE = {
  version: 2,
  meta: {
    nom: "SISBMT – Syndicat intercommunal d'intérêt scolaire",
    siege: "Thizy (89420)",
    baseYear: 2026,
    years: [2026, 2027, 2028, 2029],
  },

  /* ---------------- Lignes du budget de fonctionnement ---------------- */
  lignes: [
    // ----- Dépenses -----
    { id: "d002", sens: "dep", chap: "002", art: "002", lib: "Déficit de fonctionnement reporté", bp25: 0, real25: 0, montant: 105.19, cat: "FIN", nature: "ponctuel", index: "aucun", com: "" },
    { id: "d023", sens: "dep", chap: "023", art: "023", lib: "Virement à la section d'investissement", bp25: 1500, real25: 0, montant: 1279.94, cat: "FIN", nature: "virement", index: "aucun", com: "Calculé à partir du plan d'investissement" },

    { id: "d6042", sens: "dep", chap: "011", art: "6042", lib: "Achats de prestations de services", bp25: 1078, real25: 1067.5, montant: 1800, cat: "SCO", nature: "classe", index: "inflation", com: "piscine – classe bleue" },
    { id: "d60622", sens: "dep", chap: "011", art: "60622", lib: "Carburants", bp25: 3800, real25: 2495.58, montant: 1300, cat: "TRA", nature: "fixe", index: "energie", com: "bus temps méridien + sorties + CDL Isle" },
    { id: "d60628", sens: "dep", chap: "011", art: "60628", lib: "Autres fournitures non stockées", bp25: 100, real25: 0, montant: 0, cat: "ADM", nature: "fixe", index: "inflation", com: "" },
    { id: "d60631", sens: "dep", chap: "011", art: "60631", lib: "Fournitures d'entretien", bp25: 1400, real25: 1448.6, montant: 1550, cat: "BAT", nature: "fixe", index: "inflation", com: "classes et cantine" },
    { id: "d60632", sens: "dep", chap: "011", art: "60632", lib: "Fournitures de petit équipement", bp25: 100, real25: 340.79, montant: 500, cat: "ADM", nature: "fixe", index: "inflation", com: "1 lecteur CD-ROM + 2 disques durs externes" },
    { id: "d60636", sens: "dep", chap: "011", art: "60636", lib: "Habillement et vêtements de travail", bp25: 50, real25: 0, montant: 50, cat: "PER", nature: "fixe", index: "inflation", com: "" },
    { id: "d6064", sens: "dep", chap: "011", art: "6064", lib: "Fournitures administratives", bp25: 150, real25: 224.22, montant: 100, cat: "ADM", nature: "fixe", index: "inflation", com: "" },
    { id: "d6067", sens: "dep", chap: "011", art: "6067", lib: "Fournitures scolaires", bp25: 3000, real25: 3360.8, montant: 3000, cat: "SCO", nature: "classe", index: "inflation", com: "1 500 € par classe" },
    { id: "d60668", sens: "dep", chap: "011", art: "60668", lib: "Pharmacie", bp25: 0, real25: 0, montant: 50, cat: "SCO", nature: "fixe", index: "inflation", com: "trousse de secours" },
    { id: "d615221", sens: "dep", chap: "011", art: "615221", lib: "Entretien, réparations bâtiments publics", bp25: 0, real25: 69.82, montant: 130, cat: "BAT", nature: "fixe", index: "inflation", com: "vitres école Montréal – 2 interventions/an" },
    { id: "d61551", sens: "dep", chap: "011", art: "61551", lib: "Entretien matériel roulant", bp25: 5000, real25: 6474.02, montant: 3000, cat: "TRA", nature: "fixe", index: "inflation", com: "bus cantine" },
    { id: "d61558", sens: "dep", chap: "011", art: "61558", lib: "Entretien autres biens mobiliers", bp25: 50, real25: 0, montant: 0, cat: "BAT", nature: "fixe", index: "inflation", com: "" },
    { id: "d6156", sens: "dep", chap: "011", art: "6156", lib: "Maintenance", bp25: 1100, real25: 933.16, montant: 950, cat: "ADM", nature: "fixe", index: "inflation", com: "2 copieurs" },
    { id: "d6161", sens: "dep", chap: "011", art: "6161", lib: "Assurance multirisques", bp25: 360, real25: 356.19, montant: 370, cat: "BAT", nature: "fixe", index: "inflation", com: "" },
    { id: "d6168", sens: "dep", chap: "011", art: "6168", lib: "Autres primes d'assurance", bp25: 3000, real25: 3079.8, montant: 3200, cat: "ADM", nature: "fixe", index: "inflation", com: "À ventiler : part assurance du bus ?" },
    { id: "d6232", sens: "dep", chap: "011", art: "6232", lib: "Fêtes et cérémonies", bp25: 500, real25: 304.76, montant: 750, cat: "SCO", nature: "fixe", index: "inflation", com: "Noël des élèves et agents" },
    { id: "d6236", sens: "dep", chap: "011", art: "6236", lib: "Catalogues et imprimés", bp25: 900, real25: 898.8, montant: 0, cat: "RES", nature: "fixe", index: "inflation", com: "tickets de cantine" },
    { id: "d6247", sens: "dep", chap: "011", art: "6247", lib: "Transports collectifs", bp25: 1240, real25: 455, montant: 1200, cat: "SCO", nature: "classe", index: "inflation", com: "piscine – classe bleue" },
    { id: "d6251", sens: "dep", chap: "011", art: "6251", lib: "Voyages, déplacements et missions", bp25: 300, real25: 414.2, montant: 450, cat: "RES", nature: "fixe", index: "inflation", com: "régie cantine SGC" },
    { id: "d6261", sens: "dep", chap: "011", art: "6261", lib: "Frais d'affranchissement", bp25: 85, real25: 0, montant: 100, cat: "ADM", nature: "fixe", index: "inflation", com: "" },
    { id: "d6262", sens: "dep", chap: "011", art: "6262", lib: "Frais de télécommunications", bp25: 1400, real25: 1581.52, montant: 1800, cat: "ADM", nature: "fixe", index: "inflation", com: "2 abonnements fibre + 1 portable" },
    { id: "d6281", sens: "dep", chap: "011", art: "6281", lib: "Concours divers – cotisations", bp25: 0, real25: 0, montant: 320, cat: "ADM", nature: "fixe", index: "inflation", com: "AGEDI logiciel syndicat" },
    { id: "d6288", sens: "dep", chap: "011", art: "6288", lib: "Autres services extérieurs (repas cantine)", bp25: 18500, real25: 18248.85, montant: 19000, cat: "RES", nature: "enfant", index: "alimentation", com: "repas cantine – EHPAD Thizy" },

    { id: "d6336", sens: "dep", chap: "012", art: "6336", lib: "Cotisations CNFPT et CDG FPT", bp25: 1040, real25: 975, montant: 1000, cat: "PER", nature: "fixe", index: "salaires", com: "" },
    { id: "d64111", sens: "dep", chap: "012", art: "64111", lib: "Rémunération principale titulaires", bp25: 30100, real25: 28422.87, montant: 29000, cat: "PER", nature: "fixe", index: "salaires", com: "net + prévoyance + IRCANTEC + RAFP + URSSAF" },
    { id: "d64112", sens: "dep", chap: "012", art: "64112", lib: "SFT, indemnité de résidence", bp25: 560, real25: 552.5, montant: 560, cat: "PER", nature: "fixe", index: "salaires", com: "3 agents" },
    { id: "d64118", sens: "dep", chap: "012", art: "64118", lib: "Autres indemnités (RIFSEEP)", bp25: 1500, real25: 1348.14, montant: 2000, cat: "PER", nature: "fixe", index: "salaires", com: "RIFSEEP" },
    { id: "d64131", sens: "dep", chap: "012", art: "64131", lib: "Rémunérations non titulaires", bp25: 35640, real25: 32733.76, montant: 25000, cat: "PER", nature: "fixe", index: "salaires", com: "net + URSSAF + IRCANTEC" },
    { id: "d64138", sens: "dep", chap: "012", art: "64138", lib: "Primes et autres indemnités (RIFSEEP)", bp25: 600, real25: 692.21, montant: 900, cat: "PER", nature: "fixe", index: "salaires", com: "RIFSEEP" },
    { id: "d6451", sens: "dep", chap: "012", art: "6451", lib: "Cotisations URSSAF", bp25: 17600, real25: 16217, montant: 16500, cat: "PER", nature: "fixe", index: "salaires", com: "URSSAF agents CNRACL" },
    { id: "d6453", sens: "dep", chap: "012", art: "6453", lib: "Cotisations caisses de retraite", bp25: 8000, real25: 7917.94, montant: 7860, cat: "PER", nature: "fixe", index: "salaires", com: "ATIACL + RAFP + CNRACL + IRCANTEC" },
    { id: "d6454", sens: "dep", chap: "012", art: "6454", lib: "Cotisations ASSEDIC", bp25: 1480, real25: 1338, montant: 1100, cat: "PER", nature: "fixe", index: "salaires", com: "contractuel" },
    { id: "d6455", sens: "dep", chap: "012", art: "6455", lib: "Assurance du personnel", bp25: 3200, real25: 2724.07, montant: 3000, cat: "PER", nature: "fixe", index: "salaires", com: "" },
    { id: "d6475", sens: "dep", chap: "012", art: "6475", lib: "Médecine du travail, pharmacie", bp25: 500, real25: 502.9, montant: 800, cat: "PER", nature: "fixe", index: "inflation", com: "" },

    { id: "d65311", sens: "dep", chap: "65", art: "65311", lib: "Indemnités de fonction (élus)", bp25: 3320, real25: 3299.44, montant: 3500, cat: "ELU", nature: "fixe", index: "salaires", com: "élus" },
    { id: "d65313", sens: "dep", chap: "65", art: "65313", lib: "Cotisations de retraite (élus)", bp25: 0, real25: 107, montant: 150, cat: "ELU", nature: "fixe", index: "salaires", com: "" },
    { id: "d65331", sens: "dep", chap: "65", art: "65331", lib: "Indemnités de fonction (autres)", bp25: 150, real25: 35, montant: 0, cat: "ELU", nature: "fixe", index: "salaires", com: "" },
    { id: "d6541", sens: "dep", chap: "65", art: "6541", lib: "Créances admises en non-valeur", bp25: 0, real25: 79.1, montant: 0, cat: "FIN", nature: "fixe", index: "aucun", com: "" },
    { id: "d65568", sens: "dep", chap: "65", art: "65568", lib: "Contributions aux organismes de regroupement", bp25: 0, real25: 0, montant: 3000, cat: "SCO", nature: "fixe", index: "inflation", com: "3 enfants école Guillon (dérogation) – 1 000 €/enfant" },
    { id: "d65888", sens: "dep", chap: "65", art: "65888", lib: "Autres charges de gestion courante", bp25: 10, real25: 0.66, montant: 5, cat: "ADM", nature: "fixe", index: "aucun", com: "PAS" },
    { id: "d673", sens: "dep", chap: "67", art: "673", lib: "Titres annulés (exercices antérieurs)", bp25: 100, real25: 0, montant: 0, cat: "FIN", nature: "fixe", index: "aucun", com: "" },

    // ----- Recettes -----
    { id: "r002", sens: "rec", chap: "002", art: "002", lib: "Résultat de fonctionnement reporté", bp25: 18505.12, real25: 0, montant: 0, cat: "FIN", nature: "report", index: "aucun", com: "Calculé : fonds de roulement de l'année précédente" },
    { id: "r7067", sens: "rec", chap: "70", art: "7067", lib: "Redevances services périscolaires (cantine)", bp25: 19500, real25: 20665.8, montant: 23000, cat: "RES", nature: "enfant", index: "tarif", com: "4,30 €/repas, sans augmentation" },
    { id: "r70878", sens: "rec", chap: "70", art: "70878", lib: "Remboursements de frais par des tiers", bp25: 4135, real25: 4526.46, montant: 9500, cat: "ADM", nature: "fixe", index: "aucun", com: "CCS bus, bâtiment, Coutarnoux et Marmeaux – à ventiler" },
    { id: "r7472", sens: "rec", chap: "74", art: "7472", lib: "Participation Région", bp25: 44000, real25: 26226.3, montant: 2300, cat: "TRA", nature: "fixe", index: "aucun", com: "personnel dans le bus et RC" },
    { id: "r74748", sens: "rec", chap: "74", art: "74748", lib: "Participation des communes membres", bp25: 67925, real25: 67925, montant: 107250, cat: "FIN", nature: "cotisations", index: "aucun", com: "Calculé : clé population / enfants" },
    { id: "r74888", sens: "rec", chap: "74", art: "74888", lib: "Autres dotations et participations", bp25: 0, real25: 282, montant: 280, cat: "ADM", nature: "fixe", index: "aucun", com: "" },
    { id: "r75888", sens: "rec", chap: "75", art: "75888", lib: "Autres produits de gestion courante", bp25: 5, real25: 0.35, montant: 5, cat: "ADM", nature: "fixe", index: "aucun", com: "PAS" },
    { id: "r773", sens: "rec", chap: "77", art: "773", lib: "Mandats annulés (exercices antérieurs)", bp25: 100, real25: 0, montant: 0, cat: "FIN", nature: "fixe", index: "aucun", com: "" },
    { id: "r6419", sens: "rec", chap: "013", art: "6419", lib: "Remboursements rémunérations personnel", bp25: 0, real25: 462.98, montant: 1100, cat: "PER", nature: "ponctuel", index: "aucun", com: "IJ Monnot" },
  ],

  /* ---------------- Communes ---------------- */
  // Population : BANATIC (population totale regroupée en vigueur, 971 hab.).
  // Enfants : effectifs 2026 communiqués par le syndicat (31 enfants des communes
  // membres + 6 enfants hors syndicat). 2027-2029 : recopiés de 2026, à ajuster.
  communes: [
    { id: "c1", nom: "Blacy", insee: "89043", pop: 100, enfants: { 2026: 8, 2027: 8, 2028: 8, 2029: 8 }, tendance: 0, statut: "membre", actif: true, annee: 2026, km: {}, ouvreClasse: false, posteSupp: false },
    { id: "c2", nom: "Marmeaux", insee: "89244", pop: 88, enfants: { 2026: 2, 2027: 2, 2028: 2, 2029: 2 }, tendance: 0, statut: "membre", actif: true, annee: 2026, km: {}, ouvreClasse: false, posteSupp: false },
    { id: "c3", nom: "Massangis", insee: "89246", pop: 339, enfants: { 2026: 3, 2027: 3, 2028: 3, 2029: 3 }, tendance: 0, statut: "membre", actif: true, annee: 2026, km: {}, ouvreClasse: false, posteSupp: false },
    { id: "c4", nom: "Montréal", insee: "89267", pop: 168, enfants: { 2026: 7, 2027: 7, 2028: 7, 2029: 7 }, tendance: 0, statut: "membre", actif: true, annee: 2026, km: {}, ouvreClasse: false, posteSupp: false },
    { id: "c5", nom: "Talcy", insee: "89406", pop: 84, enfants: { 2026: 1, 2027: 1, 2028: 1, 2029: 1 }, tendance: 0, statut: "membre", actif: true, annee: 2026, km: {}, ouvreClasse: false, posteSupp: false },
    { id: "c6", nom: "Thizy", insee: "89412", pop: 192, enfants: { 2026: 10, 2027: 10, 2028: 10, 2029: 10 }, tendance: 0, statut: "membre", actif: true, annee: 2026, km: {}, ouvreClasse: false, posteSupp: false },
    { id: "c7", nom: "Nouvelle commune (exemple)", insee: "", pop: 150, enfants: { 2026: 6, 2027: 6, 2028: 6, 2029: 6 }, statut: "candidate", actif: false, annee: 2027, km: { navette: 0, ramassage: 8 }, ouvreClasse: false, posteSupp: false },
  ],

  /* ---------------- Clé de répartition ---------------- */
  cle: { pop: 50, enf: 50 },

  /* ---------------- Transport ---------------- */
  // Chaque service a un mode « actuel » (référence) et un mode « scénario ».
  // L'écart de coût entre les deux est ajouté au budget à partir de l'année d'effet.
  transport: [
    {
      id: "navette", nom: "Navette méridienne (bus du syndicat → cantine)",
      modeActuel: "regie", modeScenario: "regie", anneeEffet: 2027, prorata: true,
      commun: { jours: 140, km: 12, eleves: 35 },
      regie: { conso: 25, prixCarb: 1.8, entretien: 3000, assurance: 1200, hCond: 1, hAcc: 1, coutH: 24, provision: 0, recettes: 0 },
      prestataire: { forfaitJour: 110, prixKm: 0, hAcc: 1, coutH: 24, recettes: 0 },
      region: { partEleve: 0, hAcc: 0, coutH: 24, recettes: 0 },
    },
    {
      id: "ramassage", nom: "Ramassage scolaire matin / soir",
      modeActuel: "region", modeScenario: "region", anneeEffet: 2027, prorata: true,
      commun: { jours: 140, km: 60, eleves: 30 },
      regie: { conso: 28, prixCarb: 1.8, entretien: 4000, assurance: 1500, hCond: 3, hAcc: 2, coutH: 24, provision: 0, recettes: 40000 },
      prestataire: { forfaitJour: 220, prixKm: 0, hAcc: 2, coutH: 24, recettes: 0 },
      region: { partEleve: 0, hAcc: 2, coutH: 24, recettes: 2300 },
    },
  ],

  /* ---------------- Hypothèses de projection (% par an) ---------------- */
  hyp: {
    taux: {
      inflation:    { 2027: 2.0, 2028: 2.0, 2029: 2.0 },
      salaires:     { 2027: 2.5, 2028: 2.5, 2029: 2.5 },
      energie:      { 2027: 3.0, 2028: 3.0, 2029: 3.0 },
      alimentation: { 2027: 3.0, 2028: 3.0, 2029: 3.0 },
      tarif:        { 2027: 0.0, 2028: 0.0, 2029: 0.0 },
    },
    classes: { 2026: 2, 2027: 2, 2028: 2, 2029: 2 },
    // Enfants scolarisés venant de communes NON membres : ils pèsent sur les
    // dépenses (repas, fournitures…) mais n'entrent pas dans la clé de cotisation.
    horsMembres: { 2026: 6, 2027: 6, 2028: 6, 2029: 6 },
    tendanceHors: 0,
    // Participation demandée par enfant hors syndicat (€/an). 0 par défaut :
    // les remboursements actuels (Coutarnoux…) sont déjà dans la ligne 70878.
    fraisHorsMembre: 0,
    fdr: { 2025: 0, 2026: 8054.87, 2027: 8054.87, 2028: 8054.87, 2029: 8054.87 },
    coutPoste: 24000,
    cleCalculPersonnel: { SCO: 40, RES: 30, TRA: 15, ADM: 15 },
  },

  /* ---------------- Investissement ---------------- */
  invest: {
    solde001: 120.06,          // solde d'exécution reporté en 2026
    fctvaTaux: 16.404,
    fctvaDecalage: 2,           // FCTVA perçu en N+2 (cf. « CA n-2 »)
    depensesPassees: { 2024: 0, 2025: 2632.86 },
    projets: [
      { id: "p1", annee: 2026, lib: "Tables et chaises cantine (21841)", montant: 1000, subv: 0, scenarioSeul: false },
      { id: "p2", annee: 2026, lib: "Machine à découper (2188)", montant: 400, subv: 0, scenarioSeul: false },
    ],
  },

  /* ---------------- Ajustements libres ---------------- */
  // sens: dep | rec ; portee: tous | scenario
  ajustements: [],

  /* ---------------- Points à vérifier ---------------- */
  checklist: {
    enfants: false, transportOrga: false, transportCouts: false, region: false,
    personnel: false, assuranceBus: false, remboursements: false, classes: false, fdr: false, cle: false,
  },
};
