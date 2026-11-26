/* =====================================================================
   Moteur de calcul – aucune dépendance au DOM.
   compute(state) → { ref: {années…}, scen: {années…} }
   ===================================================================== */
(function (root) {
  const CATS = {
    SCO: { lib: "Scolaire & pédagogie", color: "#2f6fab" },
    RES: { lib: "Restauration scolaire", color: "#d08a2c" },
    TRA: { lib: "Transport", color: "#3c9a74" },
    BAT: { lib: "Bâtiments & entretien", color: "#8a6bb8" },
    ADM: { lib: "Administration générale", color: "#6b7a8f" },
    PER: { lib: "Personnel (non ventilé)", color: "#c4566b" },
    ELU: { lib: "Élus", color: "#a3a03a" },
    FIN: { lib: "Opérations financières", color: "#999999" },
    FDR: { lib: "Fonds de roulement", color: "#cfcfcf" },
  };
  const NATURES = {
    fixe: "Fixe (indexé)", enfant: "Par enfant", classe: "Par classe", ponctuel: "Ponctuel 2026",
    virement: "Virement invest. (calculé)", report: "Report (calculé)", cotisations: "Cotisations (calculé)",
  };
  const INDEXES = {
    aucun: "Aucune", inflation: "Inflation", salaires: "Masse salariale", energie: "Carburant / énergie",
    alimentation: "Alimentation", tarif: "Tarif cantine",
  };
  const MODES = { regie: "Régie (bus + agents du syndicat)", prestataire: "Prestataire (autocariste)", region: "Organisé par la Région", aucun: "Service supprimé" };
  const CHAP_LIB = {
    "002": "Résultat reporté", "023": "Virement à l'investissement", "011": "Charges à caractère général",
    "012": "Charges de personnel", "65": "Autres charges de gestion", "67": "Charges spécifiques",
    "70": "Produits des services", "74": "Dotations et participations", "75": "Autres produits", "77": "Produits spécifiques", "013": "Atténuations de charges",
  };

  const n = (v) => (typeof v === "number" && isFinite(v) ? v : parseFloat(v) || 0);

  function indexFactor(state, type, y) {
    const base = state.meta.baseYear;
    if (!type || type === "aucun" || y <= base) return 1;
    const t = state.hyp.taux[type] || {};
    let f = 1;
    for (let k = base + 1; k <= y; k++) f *= 1 + n(t[k]) / 100;
    return f;
  }

  /* ---------- Communes actives ---------- */
  function communesActives(state, y, scen) {
    return state.communes.filter((c) => {
      if (c.statut === "membre") return true;
      return scen && c.actif && y >= n(c.annee);
    });
  }
  const enfantsDe = (c, y) => n(c.enfants && c.enfants[y] != null ? c.enfants[y] : c.enfants && c.enfants[2026]);

  /* ---------- Transport ---------- */
  function coutService(state, svc, mode, y, kmExtra) {
    const c = svc.commun, jours = n(c.jours), km = n(c.km) + n(kmExtra);
    const I = (t) => indexFactor(state, t, y);
    const comps = [];
    const add = (lib, montant, idx, perso, sens = "dep") => comps.push({ lib, montant: montant * I(idx), perso: !!perso, sens });
    if (mode === "regie") {
      const p = svc.regie;
      add("Carburant", jours * km * n(p.conso) / 100 * n(p.prixCarb), "energie");
      add("Entretien véhicule", n(p.entretien), "inflation");
      add("Assurance véhicule", n(p.assurance), "inflation");
      add("Conducteur", jours * n(p.hCond) * n(p.coutH), "salaires", true);
      add("Accompagnateur", jours * n(p.hAcc) * n(p.coutH), "salaires", true);
      add("Provision renouvellement véhicule", n(p.provision), "aucun");
      add("Recettes liées (Région, mise à dispo…)", n(p.recettes), "aucun", false, "rec");
    } else if (mode === "prestataire") {
      const p = svc.prestataire;
      add("Contrat prestataire", jours * (n(p.forfaitJour) + km * n(p.prixKm)), "inflation");
      add("Accompagnateur", jours * n(p.hAcc) * n(p.coutH), "salaires", true);
      add("Recettes liées", n(p.recettes), "aucun", false, "rec");
    } else if (mode === "region") {
      const p = svc.region;
      add("Participation versée à la Région", n(c.eleves) * n(p.partEleve), "inflation");
      add("Accompagnateur", jours * n(p.hAcc) * n(p.coutH), "salaires", true);
      add("Recettes Région", n(p.recettes), "aucun", false, "rec");
    }
    const dep = comps.filter((x) => x.sens === "dep").reduce((s, x) => s + x.montant, 0);
    const rec = comps.filter((x) => x.sens === "rec").reduce((s, x) => s + x.montant, 0);
    const perso = comps.filter((x) => x.perso).reduce((s, x) => s + x.montant, 0);
    return { comps, dep, rec, perso, net: dep - rec };
  }

  function blend(a, b, p) {
    // a*(1-p) + b*p, composante par composante (par libellé)
    const map = {};
    const push = (x, w) => {
      const k = x.sens + "|" + x.lib;
      if (!map[k]) map[k] = { ...x, montant: 0 };
      map[k].montant += x.montant * w;
    };
    a.comps.forEach((x) => push(x, 1 - p));
    b.comps.forEach((x) => push(x, p));
    const comps = Object.values(map);
    const dep = comps.filter((x) => x.sens === "dep").reduce((s, x) => s + x.montant, 0);
    const rec = comps.filter((x) => x.sens === "rec").reduce((s, x) => s + x.montant, 0);
    const perso = comps.filter((x) => x.perso).reduce((s, x) => s + x.montant, 0);
    return { comps, dep, rec, perso, net: dep - rec };
  }

  function transportAnnee(state, y, scen) {
    const res = [];
    for (const svc of state.transport) {
      const ref = coutService(state, svc, svc.modeActuel, y, 0);
      let sc = ref, part = 0;
      if (scen) {
        const kmExtra = communesActives(state, y, true)
          .filter((c) => c.statut !== "membre")
          .reduce((s, c) => s + n(c.km && c.km[svc.id]), 0);
        const eff = n(svc.anneeEffet);
        const changed = svc.modeScenario !== svc.modeActuel;
        part = !changed || y < eff ? 0 : y === eff && svc.prorata ? 4 / 12 : 1;
        const cur = coutService(state, svc, svc.modeActuel, y, kmExtra);
        const nw = coutService(state, svc, svc.modeScenario, y, kmExtra);
        sc = part === 0 ? cur : part === 1 ? nw : blend(cur, nw, part);
      }
      res.push({ id: svc.id, nom: svc.nom, ref, scen: sc, part, delta: { dep: sc.dep - ref.dep, rec: sc.rec - ref.rec, perso: sc.perso - ref.perso, net: sc.net - ref.net } });
    }
    return res;
  }

  /* ---------- Investissement ---------- */
  function investAnnee(state, y, scen) {
    const inv = state.invest;
    const projets = inv.projets.filter((p) => n(p.annee) === y && (scen || !p.scenarioSeul));
    const dep = projets.reduce((s, p) => s + n(p.montant), 0);
    const subv = projets.reduce((s, p) => s + n(p.subv), 0);
    const yRef = y - n(inv.fctvaDecalage);
    let base = 0;
    if (inv.depensesPassees && inv.depensesPassees[yRef] != null) base = n(inv.depensesPassees[yRef]);
    else base = inv.projets.filter((p) => n(p.annee) === yRef && (scen || !p.scenarioSeul)).reduce((s, p) => s + n(p.montant), 0);
    const fctva = y === state.meta.baseYear ? 0 : base * n(inv.fctvaTaux) / 100; // 2026 : FCTVA non inscrit au BP
    const solde = y === state.meta.baseYear ? n(inv.solde001) : 0;
    const virement = Math.max(0, dep - subv - fctva - solde);
    return { projets, dep, subv, fctva, solde, virement, excedent: Math.max(0, subv + fctva + solde - dep) };
  }

  /* ---------- Une année ---------- */
  function computeYear(state, y, scen) {
    const base = state.meta.baseYear;
    const actives = communesActives(state, y, scen);
    const membresBase = communesActives(state, base, false);
    const enfBase = membresBase.reduce((s, c) => s + enfantsDe(c, base), 0) || 1;
    const enf = actives.reduce((s, c) => s + enfantsDe(c, y), 0);
    const classesBase = n(state.hyp.classes[base]) || 1;
    const nouvellesClasses = scen ? actives.filter((c) => c.statut !== "membre" && c.ouvreClasse).length : 0;
    const classes = n(state.hyp.classes[y]) + nouvellesClasses;
    const postesSupp = scen ? actives.filter((c) => c.statut !== "membre" && c.posteSupp).length : 0;

    const lignes = [];
    const push = (l) => lignes.push(l);

    // Lignes du budget
    for (const l of state.lignes) {
      if (["virement", "report", "cotisations"].includes(l.nature)) continue;
      let v;
      if (l.nature === "ponctuel") v = y === base ? n(l.montant) : 0;
      else {
        v = n(l.montant) * indexFactor(state, l.index, y);
        if (l.nature === "enfant") v *= enf / enfBase;
        if (l.nature === "classe") v *= classes / classesBase;
      }
      push({ src: "ligne", id: l.id, sens: l.sens, chap: l.chap, art: l.art, lib: l.lib, cat: l.cat, v });
    }

    // Investissement → virement
    const inv = investAnnee(state, y, scen);
    push({ src: "virement", sens: "dep", chap: "023", art: "023", lib: "Virement à la section d'investissement", cat: "FIN", v: inv.virement });

    // Transport (écart scénario / référence)
    const tr = transportAnnee(state, y, scen);
    if (scen) {
      const dPerso = tr.reduce((s, t) => s + t.delta.perso, 0);
      const dAutres = tr.reduce((s, t) => s + t.delta.dep - t.delta.perso, 0);
      const dRec = tr.reduce((s, t) => s + t.delta.rec, 0);
      if (Math.abs(dAutres) > 0.005) push({ src: "transport", sens: "dep", chap: "011", art: "Δ", lib: "Transport – écart scénario (charges)", cat: "TRA", v: dAutres });
      if (Math.abs(dPerso) > 0.005) push({ src: "transport", sens: "dep", chap: "012", art: "Δ", lib: "Transport – écart scénario (personnel)", cat: "TRA", v: dPerso });
      if (Math.abs(dRec) > 0.005) push({ src: "transport", sens: "rec", chap: "74", art: "Δ", lib: "Transport – écart scénario (recettes)", cat: "TRA", v: dRec });
    }

    // Postes supplémentaires (ouverture de classe liée à une adhésion)
    if (postesSupp > 0) {
      push({ src: "poste", sens: "dep", chap: "012", art: "Δ", lib: `Poste(s) supplémentaire(s) ×${postesSupp}`, cat: "SCO", v: postesSupp * n(state.hyp.coutPoste) * indexFactor(state, "salaires", y) });
    }

    // Ajustements libres
    for (const a of state.ajustements) {
      if (y < n(a.de) || y > n(a.a)) continue;
      if (a.portee === "scenario" && !scen) continue;
      const v = n(a.montant) * indexFactor(state, a.index || "aucun", y);
      push({ src: "ajust", sens: a.sens, chap: a.sens === "dep" ? (a.cat === "PER" ? "012" : "011") : "70", art: "+", lib: a.lib || "Ajustement", cat: a.cat || "ADM", v });
    }

    const dep = lignes.filter((l) => l.sens === "dep").reduce((s, l) => s + l.v, 0);
    const recAutres = lignes.filter((l) => l.sens === "rec").reduce((s, l) => s + l.v, 0);
    const fdrPrev = y === base ? 0 : n(state.hyp.fdr[y - 1]);
    const report = y === base ? n((state.lignes.find((l) => l.nature === "report") || {}).montant) : fdrPrev;
    const fdr = n(state.hyp.fdr[y]);
    const variationFdr = fdr - report;
    const besoin = dep - recAutres - report + fdr;

    // Répartition entre communes
    const popTot = actives.reduce((s, c) => s + n(c.pop), 0) || 1;
    const enfTot = enf || 1;
    const wP = n(state.cle.pop) / 100, wE = n(state.cle.enf) / 100;
    const communes = actives.map((c) => {
      const sp = n(c.pop) / popTot, se = enfantsDe(c, y) / enfTot;
      const partPop = besoin * wP * sp, partEnf = besoin * wE * se;
      return { id: c.id, nom: c.nom, statut: c.statut, pop: n(c.pop), enf: enfantsDe(c, y), sp, se, share: wP * sp + wE * se, partPop, partEnf, cotis: partPop + partEnf };
    });

    // Analytique (coût net par service)
    const analytique = {};
    Object.keys(CATS).forEach((k) => (analytique[k] = 0));
    for (const l of lignes) analytique[l.cat] = (analytique[l.cat] || 0) + (l.sens === "dep" ? l.v : -l.v);
    analytique.FDR = variationFdr;
    const analytiqueVentile = { ...analytique };
    const key = state.hyp.cleCalculPersonnel || {};
    const keyTot = Object.values(key).reduce((s, v) => s + n(v), 0);
    if (keyTot > 0) {
      const per = analytiqueVentile.PER;
      analytiqueVentile.PER = 0;
      for (const k in key) analytiqueVentile[k] += per * n(key[k]) / keyTot;
    }

    // Chapitres
    const chapitres = { dep: {}, rec: {} };
    for (const l of lignes) chapitres[l.sens][l.chap] = (chapitres[l.sens][l.chap] || 0) + l.v;
    chapitres.rec["002"] = (chapitres.rec["002"] || 0) + report;
    chapitres.rec["74748"] = besoin;

    return {
      y, scen, lignes, dep, recAutres, report, fdr, variationFdr, besoin,
      recTotal: recAutres + report + besoin,
      enf, enfBase, classes, popTot, communes, transport: tr, invest: inv, analytique, analytiqueVentile, chapitres, postesSupp,
    };
  }

  function compute(state) {
    const out = { ref: {}, scen: {} };
    for (const y of state.meta.years) {
      out.ref[y] = computeYear(state, y, false);
      out.scen[y] = computeYear(state, y, true);
    }
    return out;
  }

  const api = { compute, computeYear, coutService, indexFactor, CATS, NATURES, INDEXES, MODES, CHAP_LIB };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Model = api;
})(typeof window !== "undefined" ? window : globalThis);
