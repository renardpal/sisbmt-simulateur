/* =====================================================================
   Moteur de calcul – aucune dépendance au DOM.
   compute(state) → { 2026: {…}, 2027: {…}, … }
   Chaque année utilise ses propres montants (modifiables dans l'onglet
   de l'année) ; seules les cotisations et le résultat reporté sont calculés.
   ===================================================================== */
(function (root) {
  const CATS = {
    SCO: { lib: "Scolaire & pédagogie", color: "#2f6fab" },
    RES: { lib: "Restauration scolaire", color: "#d08a2c" },
    TRA: { lib: "Transport", color: "#3c9a74" },
    GAR: { lib: "Garderie / périscolaire", color: "#2f9bb3" },
    BAT: { lib: "Bâtiments & entretien", color: "#8a6bb8" },
    ADM: { lib: "Administration générale", color: "#6b7a8f" },
    PER: { lib: "Personnel (non ventilé)", color: "#c4566b" },
    ELU: { lib: "Élus", color: "#a3a03a" },
    FIN: { lib: "Opérations financières", color: "#999999" },
    FDR: { lib: "Fonds de roulement", color: "#cfcfcf" },
  };
  const CHAP_LIB = {
    "002": "Résultat reporté", "023": "Virement à l'investissement", "011": "Charges à caractère général",
    "012": "Charges de personnel", "65": "Autres charges de gestion", "67": "Charges spécifiques",
    "70": "Produits des services", "74": "Dotations et participations", "75": "Autres produits", "77": "Produits spécifiques", "013": "Atténuations de charges",
  };

  const n = (v) => (typeof v === "number" && isFinite(v) ? v : parseFloat(v) || 0);
  const enfantsDe = (c, y) => n(c.enfants && c.enfants[y] != null ? c.enfants[y] : c.enfants && c.enfants[2026]);
  const montantDe = (l, y) => n(l.montants && l.montants[y] != null ? l.montants[y] : l.montant);

  /* ---------- Une année ---------- */
  function computeYear(state, y) {
    const base = state.meta.baseYear;
    const membres = state.communes.filter((c) => c.statut === "membre");
    const horsListe = Array.isArray(state.horsMembres) ? state.horsMembres : [];
    const enf = membres.reduce((s, c) => s + enfantsDe(c, y), 0);
    const enfHors = horsListe.reduce((s, h) => s + enfantsDe(h, y), 0);
    const enfTotal = enf + enfHors;

    const lignes = [];
    for (const l of state.lignes) {
      if (l.nature === "report" || l.nature === "cotisations") continue;
      lignes.push({ src: "ligne", id: l.id, sens: l.sens, chap: l.chap, art: l.art, lib: l.lib, cat: l.cat, v: montantDe(l, y) });
    }

    // Participation des communes hors membre
    const tarif = n((state.hyp.tarifHors || {})[y]);
    const horsDetail = horsListe.map((h) => {
      const e = enfantsDe(h, y);
      return { id: h.id, nom: h.nom, enf: e, facturee: !!h.facturee, participation: h.facturee ? e * tarif : 0 };
    });
    for (const h of horsDetail)
      if (h.participation > 0.005) lignes.push({ src: "hors", sens: "rec", chap: "74", art: "74748", lib: `Participation ${h.nom} (${h.enf} enfant${h.enf > 1 ? "s" : ""} × ${tarif} €)`, cat: "FIN", v: h.participation });

    const dep = lignes.filter((l) => l.sens === "dep").reduce((s, l) => s + l.v, 0);
    const recAutres = lignes.filter((l) => l.sens === "rec").reduce((s, l) => s + l.v, 0);
    const report = y === base ? montantDe(state.lignes.find((l) => l.nature === "report") || {}, y) : n(state.hyp.fdr[y - 1]);
    const fdr = n(state.hyp.fdr[y]);
    const variationFdr = fdr - report;
    const besoin = dep - recAutres - report + fdr;

    // Répartition entre communes membres
    const popTot = membres.reduce((s, c) => s + n(c.pop), 0) || 1;
    const wP = n(state.cle.pop) / 100, wE = n(state.cle.enf) / 100;
    const communes = membres.map((c) => {
      const e = enfantsDe(c, y);
      const sp = n(c.pop) / popTot, se = e / (enf || 1);
      const partPop = besoin * wP * sp, partEnf = besoin * wE * se;
      return { id: c.id, nom: c.nom, pop: n(c.pop), enf: e, sp, se, share: wP * sp + wE * se, partPop, partEnf, cotis: partPop + partEnf };
    });

    // Coût net par service
    const analytique = {};
    Object.keys(CATS).forEach((k) => (analytique[k] = 0));
    for (const l of lignes) analytique[l.cat] = (analytique[l.cat] || 0) + (l.sens === "dep" ? l.v : -l.v);
    analytique.FDR = variationFdr;
    const analytiqueVentile = { ...analytique };
    // Répartition du personnel : au prorata des heures des postes (sinon ancienne clé en %)
    const key = {};
    if (Array.isArray(state.postes) && state.postes.length) state.postes.forEach((p) => (key[p.cat] = (key[p.cat] || 0) + n(p.heures)));
    else Object.assign(key, (state.hyp && state.hyp.cleCalculPersonnel) || {});
    const keyTot = Object.values(key).reduce((s, v) => s + n(v), 0);
    if (keyTot > 0) {
      const per = analytiqueVentile.PER;
      analytiqueVentile.PER = 0;
      for (const k in key) analytiqueVentile[k] += per * n(key[k]) / keyTot;
    }

    // Coûts moyens par enfant accueilli (membres + hors membre)
    const recHors = horsDetail.reduce((s, h) => s + h.participation, 0);
    const coutNet = dep - (recAutres - recHors);
    const coutBrutEnfant = dep / (enfTotal || 1);
    const coutNetEnfant = coutNet / (enfTotal || 1);
    const horsCharge = coutNetEnfant * enfHors;
    const horsResteMembres = horsCharge - recHors;

    const chapitres = { dep: {}, rec: {} };
    for (const l of lignes) chapitres[l.sens][l.chap] = (chapitres[l.sens][l.chap] || 0) + l.v;

    return {
      y, lignes, dep, recAutres, report, fdr, variationFdr, besoin, recTotal: recAutres + report + besoin,
      enf, enfHors, enfTotal, popTot, communes, horsDetail, tarifHors: tarif, recHors, coutNet, coutBrutEnfant, coutNetEnfant, horsCharge, horsResteMembres,
      analytique, analytiqueVentile, chapitres,
    };
  }

  /* ---------- Année passée (BP 2025, lecture seule) ----------
     Cotisations totales et équilibre tirés du document (colonne « Prévu BP »).
     Répartition par commune : montant saisi (cotis2025) sinon estimation avec
     la clé actuelle et les effectifs 2026 (effectifs 2025 inconnus). */
  function computeHisto(state) {
    const y = state.meta.histYear, base = state.meta.baseYear;
    if (!y) return null;
    const bp = (l) => n(l.bp25);
    const dep = state.lignes.filter((l) => l.sens === "dep").reduce((s, l) => s + bp(l), 0);
    const recAutres = state.lignes.filter((l) => l.sens === "rec" && l.nature !== "report" && l.nature !== "cotisations").reduce((s, l) => s + bp(l), 0);
    const report = bp(state.lignes.find((l) => l.nature === "report") || {});
    const besoin = bp(state.lignes.find((l) => l.nature === "cotisations") || {});
    const fdr = besoin - dep + recAutres + report; // excédent prévu au BP
    const membres = state.communes.filter((c) => c.statut === "membre");
    const popTot = membres.reduce((s, c) => s + n(c.pop), 0) || 1;
    const enf = membres.reduce((s, c) => s + enfantsDe(c, base), 0);
    const wP = n(state.cle.pop) / 100, wE = n(state.cle.enf) / 100;
    const communes = membres.map((c) => {
      const e = enfantsDe(c, base), share = wP * n(c.pop) / popTot + wE * e / (enf || 1);
      const saisi = c.cotis2025 != null && c.cotis2025 !== "";
      return { id: c.id, nom: c.nom, pop: n(c.pop), enf: e, share, cotis: saisi ? n(c.cotis2025) : besoin * share, estime: !saisi };
    });
    const chap = (sens, f) => state.lignes.filter((l) => l.sens === sens && f(l)).reduce((s, l) => s + bp(l), 0);
    return { y, histo: true, dep, recAutres, report, fdr, variationFdr: fdr - report, besoin, popTot, enf, communes, chap };
  }

  function compute(state) {
    const out = {};
    const h = computeHisto(state);
    if (h) out[h.y] = h;
    for (const y of state.meta.years) out[y] = computeYear(state, y);
    return out;
  }

  const api = { compute, computeYear, computeHisto, CATS, CHAP_LIB };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Model = api;
})(typeof window !== "undefined" ? window : globalThis);
