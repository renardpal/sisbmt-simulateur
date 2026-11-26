/* =====================================================================
   Données de départ du simulateur – SISBMT
   Source : budget 2025 (BP, DM, réalisé) + proposition 2026.
   Toutes ces valeurs sont modifiables dans l'interface ; ce fichier
   ne sert qu'à l'état initial (et au bouton « Réinitialiser »).
   ===================================================================== */

// Chaque ligne a un montant 2026 (« montant ») ; les années suivantes sont
// pré-remplies avec le même montant (sauf lignes « ponctuel » : 0) et restent
// modifiables dans les onglets par année (champ « montants »).
// nature : ponctuel | report (calculé) | cotisations (calculé)

window.DEFAULT_STATE = {
  version: 11,
  meta: {
    nom: "SISBMT – Syndicat intercommunal d'intérêt scolaire",
    siege: "Thizy (89420)",
    baseYear: 2026,
    histYear: 2025, // année passée affichée pour comparaison (BP 2025, non modifiable)
    years: [2026, 2027, 2028, 2029],
  },

  /* ---------------- Lignes du budget de fonctionnement ---------------- */
  lignes: [
    // ----- Dépenses -----
    { id: "d002", sens: "dep", chap: "002", art: "002", lib: "Déficit de fonctionnement reporté", bp25: 0, real25: 0, montant: 105.19, cat: "FIN", nature: "ponctuel", com: "" },
    { id: "d023", sens: "dep", chap: "023", art: "023", lib: "Virement à la section d'investissement", bp25: 1500, real25: 0, montant: 1279.94, cat: "FIN", nature: "ponctuel", com: "Selon les investissements de l'année" },

    { id: "d6042", sens: "dep", chap: "011", art: "6042", lib: "Achats de prestations de services", bp25: 1078, real25: 1067.5, montant: 1800, cat: "SCO", com: "piscine – classe bleue" },
    { id: "d60622", sens: "dep", chap: "011", art: "60622", lib: "Carburants", bp25: 3800, real25: 2495.58, montant: 1300, cat: "TRA", com: "bus temps méridien + sorties + CDL Isle" },
    { id: "d60628", sens: "dep", chap: "011", art: "60628", lib: "Autres fournitures non stockées", bp25: 100, real25: 0, montant: 0, cat: "ADM", com: "" },
    { id: "d60631", sens: "dep", chap: "011", art: "60631", lib: "Fournitures d'entretien", bp25: 1400, real25: 1448.6, montant: 1550, cat: "BAT", com: "classes et cantine" },
    { id: "d60632", sens: "dep", chap: "011", art: "60632", lib: "Fournitures de petit équipement", bp25: 100, real25: 340.79, montant: 500, cat: "ADM", com: "1 lecteur CD-ROM + 2 disques durs externes" },
    { id: "d60636", sens: "dep", chap: "011", art: "60636", lib: "Habillement et vêtements de travail", bp25: 50, real25: 0, montant: 50, cat: "PER", com: "" },
    { id: "d6064", sens: "dep", chap: "011", art: "6064", lib: "Fournitures administratives", bp25: 150, real25: 224.22, montant: 100, cat: "ADM", com: "" },
    { id: "d6067", sens: "dep", chap: "011", art: "6067", lib: "Fournitures scolaires", bp25: 3000, real25: 3360.8, montant: 3000, cat: "SCO", com: "1 500 € par classe" },
    { id: "d60668", sens: "dep", chap: "011", art: "60668", lib: "Pharmacie", bp25: 0, real25: 0, montant: 50, cat: "SCO", com: "trousse de secours" },
    { id: "d615221", sens: "dep", chap: "011", art: "615221", lib: "Entretien, réparations bâtiments publics", bp25: 0, real25: 69.82, montant: 130, cat: "BAT", com: "vitres école Montréal – 2 interventions/an" },
    { id: "d61551", sens: "dep", chap: "011", art: "61551", lib: "Entretien matériel roulant", bp25: 5000, real25: 6474.02, montant: 3000, cat: "TRA", com: "bus cantine" },
    { id: "d61558", sens: "dep", chap: "011", art: "61558", lib: "Entretien autres biens mobiliers", bp25: 50, real25: 0, montant: 0, cat: "BAT", com: "" },
    { id: "d6156", sens: "dep", chap: "011", art: "6156", lib: "Maintenance", bp25: 1100, real25: 933.16, montant: 950, cat: "ADM", com: "2 copieurs" },
    { id: "d6161", sens: "dep", chap: "011", art: "6161", lib: "Assurance multirisques", bp25: 360, real25: 356.19, montant: 370, cat: "BAT", com: "" },
    { id: "d6168", sens: "dep", chap: "011", art: "6168", lib: "Autres primes d'assurance", bp25: 3000, real25: 3079.8, montant: 3200, cat: "ADM", com: "À ventiler : part assurance du bus ?" },
    { id: "d6232", sens: "dep", chap: "011", art: "6232", lib: "Fêtes et cérémonies", bp25: 500, real25: 304.76, montant: 750, cat: "SCO", com: "Noël des élèves et agents" },
    { id: "d6236", sens: "dep", chap: "011", art: "6236", lib: "Catalogues et imprimés", bp25: 900, real25: 898.8, montant: 0, cat: "RES", com: "tickets de cantine" },
    { id: "d6247", sens: "dep", chap: "011", art: "6247", lib: "Transports collectifs", bp25: 1240, real25: 455, montant: 1200, cat: "SCO", com: "piscine – classe bleue" },
    { id: "d6251", sens: "dep", chap: "011", art: "6251", lib: "Voyages, déplacements et missions", bp25: 300, real25: 414.2, montant: 450, cat: "RES", com: "régie cantine SGC" },
    { id: "d6261", sens: "dep", chap: "011", art: "6261", lib: "Frais d'affranchissement", bp25: 85, real25: 0, montant: 100, cat: "ADM", com: "" },
    { id: "d6262", sens: "dep", chap: "011", art: "6262", lib: "Frais de télécommunications", bp25: 1400, real25: 1581.52, montant: 1800, cat: "ADM", com: "2 abonnements fibre + 1 portable" },
    { id: "d6281", sens: "dep", chap: "011", art: "6281", lib: "Concours divers – cotisations", bp25: 0, real25: 0, montant: 320, cat: "ADM", com: "AGEDI logiciel syndicat" },
    { id: "d6288", sens: "dep", chap: "011", art: "6288", lib: "Autres services extérieurs (repas cantine)", bp25: 18500, real25: 18248.85, montant: 19000, montants: { 2026: 19000, 2027: 21663.45, 2028: 21663.45, 2029: 21663.45 }, cat: "RES", com: "repas EHPAD Thizy – 4,05 €/repas × 5349 repas à partir de 2027" },

    { id: "d6336", sens: "dep", chap: "012", art: "6336", lib: "Cotisations CNFPT et CDG FPT", bp25: 1040, real25: 975, montant: 1000, cat: "PER", com: "" },
    { id: "d64111", sens: "dep", chap: "012", art: "64111", lib: "Rémunération principale titulaires", bp25: 30100, real25: 28422.87, montant: 29000, cat: "PER", com: "net + prévoyance + IRCANTEC + RAFP + URSSAF" },
    { id: "d64112", sens: "dep", chap: "012", art: "64112", lib: "SFT, indemnité de résidence", bp25: 560, real25: 552.5, montant: 560, cat: "PER", com: "3 agents" },
    { id: "d64118", sens: "dep", chap: "012", art: "64118", lib: "Autres indemnités (RIFSEEP)", bp25: 1500, real25: 1348.14, montant: 2000, cat: "PER", com: "RIFSEEP" },
    { id: "d64131", sens: "dep", chap: "012", art: "64131", lib: "Rémunérations non titulaires", bp25: 35640, real25: 32733.76, montant: 25000, cat: "PER", com: "net + URSSAF + IRCANTEC" },
    { id: "d64138", sens: "dep", chap: "012", art: "64138", lib: "Primes et autres indemnités (RIFSEEP)", bp25: 600, real25: 692.21, montant: 900, cat: "PER", com: "RIFSEEP" },
    { id: "d6451", sens: "dep", chap: "012", art: "6451", lib: "Cotisations URSSAF", bp25: 17600, real25: 16217, montant: 16500, cat: "PER", com: "URSSAF agents CNRACL" },
    { id: "d6453", sens: "dep", chap: "012", art: "6453", lib: "Cotisations caisses de retraite", bp25: 8000, real25: 7917.94, montant: 7860, cat: "PER", com: "ATIACL + RAFP + CNRACL + IRCANTEC" },
    { id: "d6454", sens: "dep", chap: "012", art: "6454", lib: "Cotisations ASSEDIC", bp25: 1480, real25: 1338, montant: 1100, cat: "PER", com: "contractuel" },
    { id: "d6455", sens: "dep", chap: "012", art: "6455", lib: "Assurance du personnel", bp25: 3200, real25: 2724.07, montant: 3000, cat: "PER", com: "" },
    { id: "d6475", sens: "dep", chap: "012", art: "6475", lib: "Médecine du travail, pharmacie", bp25: 500, real25: 502.9, montant: 800, cat: "PER", com: "" },

    { id: "d65311", sens: "dep", chap: "65", art: "65311", lib: "Indemnités de fonction (élus)", bp25: 3320, real25: 3299.44, montant: 3500, cat: "ELU", com: "élus" },
    { id: "d65313", sens: "dep", chap: "65", art: "65313", lib: "Cotisations de retraite (élus)", bp25: 0, real25: 107, montant: 150, cat: "ELU", com: "" },
    { id: "d65331", sens: "dep", chap: "65", art: "65331", lib: "Indemnités de fonction (autres)", bp25: 150, real25: 35, montant: 0, cat: "ELU", com: "" },
    { id: "d6541", sens: "dep", chap: "65", art: "6541", lib: "Créances admises en non-valeur", bp25: 0, real25: 79.1, montant: 0, cat: "FIN", com: "" },
    { id: "d65568", sens: "dep", chap: "65", art: "65568", lib: "Contributions aux organismes de regroupement", bp25: 0, real25: 0, montant: 3000, cat: "SCO", com: "3 enfants école Guillon (dérogation) – 1 000 €/enfant" },
    { id: "d65888", sens: "dep", chap: "65", art: "65888", lib: "Autres charges de gestion courante", bp25: 10, real25: 0.66, montant: 5, cat: "ADM", com: "PAS" },
    { id: "d673", sens: "dep", chap: "67", art: "673", lib: "Titres annulés (exercices antérieurs)", bp25: 100, real25: 0, montant: 0, cat: "FIN", com: "" },

    // ----- Recettes -----
    { id: "r002", sens: "rec", chap: "002", art: "002", lib: "Résultat de fonctionnement reporté", bp25: 18505.12, real25: 0, montant: 0, cat: "FIN", nature: "report", com: "Calculé : fonds de roulement de l'année précédente" },
    { id: "r7067", sens: "rec", chap: "70", art: "7067", lib: "Redevances services périscolaires (cantine)", bp25: 19500, real25: 20665.8, montant: 23000, montants: { 2026: 23000, 2027: 26745.0, 2028: 26745.0, 2029: 26745.0 }, cat: "RES", com: "repas vendu 5 € (4,30 € au BP 2026) × 5349 repas à partir de 2027" },
    { id: "r70878", sens: "rec", chap: "70", art: "70878", lib: "Remboursements de frais par des tiers", bp25: 4135, real25: 4526.46, montant: 9500, cat: "ADM", com: "CCS bus, bâtiment, Coutarnoux et Marmeaux – à ventiler" },
    { id: "r7472", sens: "rec", chap: "74", art: "7472", lib: "Participation Région", bp25: 44000, real25: 26226.3, montant: 2300, cat: "TRA", com: "30 % de l\u2019accompagnement dans le bus scolaire" },
    { id: "r74748", sens: "rec", chap: "74", art: "74748", lib: "Participation des communes membres", bp25: 67925, real25: 67925, montant: 107250, cat: "FIN", nature: "cotisations", com: "Calculé : clé population / enfants" },
    { id: "r74888", sens: "rec", chap: "74", art: "74888", lib: "Autres dotations et participations", bp25: 0, real25: 282, montant: 280, cat: "ADM", com: "" },
    { id: "r75888", sens: "rec", chap: "75", art: "75888", lib: "Autres produits de gestion courante", bp25: 5, real25: 0.35, montant: 5, cat: "ADM", com: "PAS" },
    { id: "r773", sens: "rec", chap: "77", art: "773", lib: "Mandats annulés (exercices antérieurs)", bp25: 100, real25: 0, montant: 0, cat: "FIN", com: "" },
    { id: "r6419", sens: "rec", chap: "013", art: "6419", lib: "Remboursements rémunérations personnel", bp25: 0, real25: 462.98, montant: 1100, cat: "PER", nature: "ponctuel", com: "IJ Monnot" },
  ],

  /* ---------------- Communes ---------------- */
  // Population : BANATIC (population totale regroupée en vigueur, 971 hab.).
  // budgetCommune : produits de fonctionnement annuels de la commune (budget principal),
  // pour afficher le poids de la cotisation. Source : CFU 2025 de chaque commune.
  // Enfants : effectifs 2026 communiqués par le syndicat (31 enfants des communes
  // membres + 6 enfants hors syndicat). 2027-2029 : recopiés de 2026, à ajuster.
  communes: [
    { id: "c1", nom: "Blacy", insee: "89043", pop: 100, enfants: { 2026: 8, 2027: 8, 2028: 8, 2029: 8 }, tendance: 0, budgetCommune: 124000, budgetSource: "CFU 2025 – recettes réelles de fonctionnement", statut: "membre" },
    { id: "c2", nom: "Marmeaux", insee: "89244", pop: 88, enfants: { 2026: 2, 2027: 2, 2028: 2, 2029: 2 }, tendance: 0, budgetCommune: 121129, budgetSource: "CFU 2025 – recettes réelles de fonctionnement", statut: "membre" },
    { id: "c3", nom: "Massangis", insee: "89246", pop: 339, enfants: { 2026: 3, 2027: 3, 2028: 3, 2029: 3 }, tendance: 0, budgetCommune: 597000, budgetSource: "CFU 2025 – recettes réelles de fonctionnement", statut: "membre" },
    { id: "c4", nom: "Montréal", insee: "89267", pop: 168, enfants: { 2026: 7, 2027: 7, 2028: 7, 2029: 7 }, tendance: 0, budgetCommune: 247000, budgetSource: "CFU 2025 – recettes réelles de fonctionnement", statut: "membre" },
    { id: "c5", nom: "Talcy", insee: "89406", pop: 84, enfants: { 2026: 1, 2027: 1, 2028: 1, 2029: 1 }, tendance: 0, budgetCommune: 91000, budgetSource: "CFU 2025 – recettes réelles de fonctionnement", statut: "membre" },
    { id: "c6", nom: "Thizy", insee: "89412", pop: 192, enfants: { 2026: 10, 2027: 10, 2028: 10, 2029: 10 }, tendance: 0, budgetCommune: 155000, budgetSource: "CFU 2025 – recettes réelles de fonctionnement", statut: "membre" },
  ],

  /* ---------------- Communes hors membre ---------------- */
  // Communes d'origine d'enfants scolarisés au syndicat sans en être membres.
  // Leurs enfants pèsent sur les dépenses (repas, fournitures…) mais elles ne
  // cotisent pas selon la clé ; si « facturée », elles paient le tarif par enfant.
  // Angely et Coutarnoux facturées (4 enfants × 1 400 € en 2027) ; Guillon non refacturée (effectif à confirmer).
  horsMembres: [
    { id: "h1", nom: "Angely", enfants: { 2026: 2, 2027: 2, 2028: 2, 2029: 2 }, tendance: 0, facturee: true },
    { id: "h2", nom: "Coutarnoux", enfants: { 2026: 2, 2027: 2, 2028: 2, 2029: 2 }, tendance: 0, facturee: true },
    { id: "h3", nom: "Guillon", enfants: { 2026: 4, 2027: 4, 2028: 4, 2029: 4 }, tendance: 0, facturee: false },
  ],

  /* ---------------- Clé de répartition ---------------- */
  cle: { pop: 50, enf: 50 },

  /* ---------------- Paramètres ---------------- */
  hyp: {
    // Participation par enfant facturée aux communes hors membre (€/enfant/an).
    // 2027 : 1 400 € (4 enfants facturés = 5 600 €). 2026 : rien de prévu au BP
    // en dehors des remboursements déjà inscrits en 70878 (Coutarnoux…).
    tarifHors: { 2026: 0, 2027: 1400, 2028: 1400, 2029: 1400 },
    fdr: { 2025: 0, 2026: 8054.87, 2027: 8054.87, 2028: 8054.87, 2029: 8054.87 },
  },

  /* ---------------- Postes ---------------- */
  // Sert à répartir les charges de personnel (012) entre services, au prorata
  // des heures hebdomadaires. HEURES À SAISIR : valeurs provisoires.
  postes: [
    // Activités réelles des agents du syndicat (la garderie est assurée par la CC du Serein).
    // HEURES HEBDOMADAIRES PROVISOIRES, sauf indication.
    { id: "p1", lib: "ATSEM", cat: "SCO", heures: 30 },
    { id: "p5", lib: "Aide en classe (3 demi-journées/semaine)", cat: "SCO", heures: 9 },
    { id: "p6", lib: "Cantine (service et surveillance)", cat: "RES", heures: 8 },
    { id: "p4", lib: "Ménage des écoles", cat: "BAT", heures: 10 },
    { id: "p2", lib: "Conduite du bus du midi (≈ 30 min/jour)", cat: "TRA", heures: 2 },
    // ≈ 7 700 €/an : la Région en finance 30 % (2 300 € au BP 2026)
    { id: "p7", lib: "Accompagnement dans le bus scolaire", cat: "TRA", heures: 6 },
  ],

};

// Pré-remplissage des années suivantes : même montant qu'en 2026 (0 pour les lignes ponctuelles).
(function () {
  const S = window.DEFAULT_STATE;
  for (const l of S.lignes) {
    if (l.montants) continue;
    l.montants = {};
    for (const y of S.meta.years) l.montants[y] = y === S.meta.baseYear || l.nature !== "ponctuel" ? l.montant : 0;
  }
})();
