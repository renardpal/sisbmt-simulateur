/* =====================================================================
   Interface du simulateur (vanilla JS, aucune dépendance)
   ===================================================================== */
(function () {
  const M = window.Model;
  const LS_KEY = "sisbmt-simulateur-v1";
  const LS_SCEN = "sisbmt-simulateur-scenarios";
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------------- État ---------------- */
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY));
      if (s && s.version === window.DEFAULT_STATE.version) return s;
    } catch (e) {}
    const s = clone(window.DEFAULT_STATE);
    s.nomScenario = "Scénario 1";
    return s;
  }
  let state = load();
  if (!state.nomScenario) state.nomScenario = "Scénario 1";
  let R = M.compute(state);
  const YEARS = () => state.meta.years;
  const BASE = () => state.meta.baseYear;
  const ui = { tab: "synthese", year: 2027, view: "scen", commune: state.communes[0].id, trYear: 2027 };

  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }
  function commit() { save(); R = M.compute(state); scheduleRender(); }

  /* ---------------- Formatage ---------------- */
  const nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nfp = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const eur = (v) => (v == null || isNaN(v) ? "–" : nf0.format(Math.round(v)) + " €");
  const eur2 = (v) => (v == null || isNaN(v) ? "–" : nf2.format(v) + " €");
  const pct = (v) => (isFinite(v) ? nfp.format(v * 100) + " %" : "–");
  const delta = (v, inverse) => {
    if (Math.abs(v) < 0.5) return `<span class="muted">=</span>`;
    const cls = (v > 0) !== !!inverse ? "up" : "down";
    return `<span class="${cls}">${v > 0 ? "+" : "−"}${nf0.format(Math.abs(Math.round(v)))} €</span>`;
  };
  const dpct = (a, b) => (b ? (a - b) / Math.abs(b) : 0);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const parseNum = (s) => {
    const v = parseFloat(String(s).replace(/\s| | |€|%/g, "").replace(",", "."));
    return isFinite(v) ? v : 0;
  };
  const fmtIn = (v, dec = 2) => (v == null || v === "" ? "" : Number(v).toLocaleString("fr-FR", { maximumFractionDigits: dec, useGrouping: true }));

  /* ---------------- Champs ---------------- */
  const numIn = (p, v, cls = "", dec = 2) => `<input class="num ${cls}" inputmode="decimal" data-p="${p}" data-t="n" value="${fmtIn(v, dec)}">`;
  const txtIn = (p, v, cls = "") => `<input class="txt ${cls}" data-p="${p}" data-t="s" value="${esc(v)}">`;
  const selIn = (p, v, opts, t = "s") =>
    `<select class="sel" data-p="${p}" data-t="${t}">${Object.entries(opts).map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  const chkIn = (p, v) => `<input type="checkbox" data-p="${p}" data-t="b" ${v ? "checked" : ""}>`;
  const yearOpts = () => Object.fromEntries(YEARS().map((y) => [y, y]));
  const catOpts = () => Object.fromEntries(Object.entries(M.CATS).filter(([k]) => k !== "FDR").map(([k, c]) => [k, c.lib]));

  function getPath(p) { return p.split(".").reduce((o, k) => (o == null ? o : o[k]), state); }
  function setPath(p, v) {
    const ks = p.split("."); let o = state;
    for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = v;
  }

  /* ---------------- Graphiques SVG ---------------- */
  function groupedBars(labels, series, opt = {}) {
    const W = 640, H = opt.h || 240, pl = 64, pr = 10, pt = 18, pb = 30;
    const all = series.flatMap((s) => s.values);
    const max = Math.max(1, ...all) * 1.12;
    const gw = (W - pl - pr) / labels.length;
    const bw = Math.min(46, (gw * 0.72) / series.length);
    const y = (v) => pt + (H - pt - pb) * (1 - v / max);
    let g = "";
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = (max / ticks) * i, yy = y(v);
      g += `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" stroke="#eceae3"/>`;
      g += `<text x="${pl - 6}" y="${yy + 4}" font-size="10" text-anchor="end" fill="#888">${nf0.format(Math.round(v / 1000))} k€</text>`;
    }
    labels.forEach((lab, i) => {
      const x0 = pl + gw * i + (gw - bw * series.length) / 2;
      series.forEach((s, j) => {
        const v = s.values[i], x = x0 + j * bw, yy = y(Math.max(0, v));
        g += `<rect x="${x + 2}" y="${yy}" width="${bw - 4}" height="${Math.max(0, H - pb - yy)}" fill="${s.color}" rx="2"><title>${esc(s.name)} ${lab} : ${eur(v)}</title></rect>`;
        g += `<text x="${x + bw / 2}" y="${yy - 4}" font-size="9.5" text-anchor="middle" fill="#444">${nf0.format(Math.round(v / 100) / 10)}k</text>`;
      });
      g += `<text x="${pl + gw * i + gw / 2}" y="${H - 10}" font-size="11" text-anchor="middle" fill="#444">${lab}</text>`;
    });
    const legend = `<div class="legend">${series.map((s) => `<span><span class="sw" style="background:${s.color}"></span>${esc(s.name)}</span>`).join("")}</div>`;
    return `${legend}<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">${g}</svg></div>`;
  }

  function lineChart(labels, series, opt = {}) {
    const W = 640, H = opt.h || 240, pl = 64, pr = 150, pt = 14, pb = 28;
    const all = series.flatMap((s) => s.values);
    const max = Math.max(1, ...all) * 1.08, min = 0;
    const x = (i) => pl + ((W - pl - pr) * i) / Math.max(1, labels.length - 1);
    const y = (v) => pt + (H - pt - pb) * (1 - (v - min) / (max - min));
    let g = "";
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i, yy = y(v);
      g += `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" stroke="#eceae3"/><text x="${pl - 6}" y="${yy + 4}" font-size="10" text-anchor="end" fill="#888">${nf0.format(Math.round(v / 1000))} k€</text>`;
    }
    labels.forEach((l, i) => (g += `<text x="${x(i)}" y="${H - 8}" font-size="11" text-anchor="middle" fill="#444">${l}</text>`));
    const lastY = [];
    series.forEach((s) => {
      g += `<polyline fill="none" stroke="${s.color}" stroke-width="2" ${s.dash ? 'stroke-dasharray="4 3"' : ""} points="${s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}"/>`;
      s.values.forEach((v, i) => (g += `<circle cx="${x(i)}" cy="${y(v)}" r="2.6" fill="${s.color}"><title>${esc(s.name)} ${labels[i]} : ${eur(v)}</title></circle>`));
      if (!s.dash) {
        let ly = y(s.values[s.values.length - 1]) + 4;
        while (lastY.some((p) => Math.abs(p - ly) < 11)) ly += 11;
        lastY.push(ly);
        const nm = s.name.length > 24 ? s.name.slice(0, 23) + "…" : s.name;
        g += `<text x="${W - pr + 6}" y="${ly}" font-size="10.5" fill="${s.color}">${esc(nm)}</text>`;
      }
    });
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">${g}</svg></div>`;
  }

  const PALETTE = ["#1f4e79", "#d08a2c", "#3c9a74", "#8a6bb8", "#c4566b", "#2f9bb3", "#a3a03a", "#6b7a8f", "#d4663a", "#5a8f29"];

  /* ---------------- Descriptif du scénario ---------------- */
  function scenarioChanges() {
    const out = [];
    state.transport.forEach((t) => {
      if (t.modeScenario !== t.modeActuel)
        out.push(`<b>Transport</b> – ${esc(t.nom)} : ${M.MODES[t.modeActuel]} → <b>${M.MODES[t.modeScenario]}</b> à partir de ${t.prorata ? "sept. " : ""}${t.anneeEffet}`);
    });
    state.communes.filter((c) => c.statut !== "membre" && c.actif).forEach((c) => {
      const extras = [];
      const km = Object.entries(c.km || {}).filter(([, v]) => +v > 0);
      if (km.length) extras.push(km.map(([k, v]) => `+${v} km/j ${((state.transport.find((t) => t.id === k) || {}).nom || k).split("(")[0].trim().toLowerCase()}`).join(", "));
      if (c.ouvreClasse) extras.push("ouverture d'une classe");
      if (c.posteSupp) extras.push("1 poste supplémentaire");
      out.push(`<b>Adhésion</b> – ${esc(c.nom)} en ${c.annee} (${nf0.format(c.pop)} hab., ${nf0.format(c.enfants[c.annee] ?? 0)} enfants${extras.length ? " ; " + extras.join(" ; ") : ""})`);
    });
    const aj = state.ajustements.filter((a) => a.portee === "scenario");
    if (aj.length) out.push(`<b>Ajustements propres au scénario</b> : ${aj.map((a) => esc(a.lib)).join(", ")}`);
    const pj = state.invest.projets.filter((p) => p.scenarioSeul);
    if (pj.length) out.push(`<b>Investissements propres au scénario</b> : ${pj.map((p) => esc(p.lib) + " (" + p.annee + ")").join(", ")}`);
    return out;
  }

  /* =====================================================================
     ONGLET : SYNTHÈSE
     ===================================================================== */
  function tabSynthese() {
    const y = ui.year, s = R.scen[y], r = R.ref[y], b = R.scen[BASE()];
    const ch = scenarioChanges();
    const yrs = YEARS();
    const comms = state.communes.filter((c) => c.statut === "membre" || c.actif);

    let h = `<h2>Synthèse</h2>
    <p class="lead">Comparaison entre la <b>référence</b> (budget 2026 prolongé avec les hypothèses d'évolution) et le <b>scénario</b> (référence + changements de transport, adhésions et ajustements que vous paramétrez dans les autres onglets).</p>`;

    h += `<div class="card"><h3>Ce que contient le scénario « ${esc(state.nomScenario)} »</h3>${
      ch.length ? `<ul style="margin:0;padding-left:18px">${ch.map((c) => `<li>${c}</li>`).join("")}</ul>` : `<p class="muted" style="margin:0">Aucun changement : le scénario est identique à la référence. Modifiez un mode de transport, activez une commune candidate ou ajoutez un ajustement.</p>`
    }</div>`;

    h += `<div class="bar"><span class="muted small">Année affichée</span><div class="seg">${yrs.map((yy) => `<button data-act="year" data-arg="${yy}" class="${yy === y ? "on" : ""}">${yy}</button>`).join("")}</div></div>`;

    const dTot = s.besoin - r.besoin;
    h += `<div class="kpis">
      <div class="kpi"><div class="l">Cotisations des communes ${y}</div><div class="v">${eur(s.besoin)}</div><div class="d">${delta(dTot)} vs référence · ${y !== BASE() ? delta(s.besoin - b.besoin) + " vs " + BASE() : "budget de base"}</div></div>
      <div class="kpi"><div class="l">Dépenses de fonctionnement</div><div class="v">${eur(s.dep)}</div><div class="d">${delta(s.dep - r.dep)} vs référence</div></div>
      <div class="kpi"><div class="l">Recettes hors cotisations</div><div class="v">${eur(s.recAutres)}</div><div class="d">${delta(s.recAutres - r.recAutres, true)} vs référence</div></div>
      <div class="kpi"><div class="l">Coût par enfant scolarisé</div><div class="v">${eur(s.besoin / (s.enf || 1))}</div><div class="d">${nf0.format(s.enf)} enfants · ${s.classes} classes</div></div>
      <div class="kpi"><div class="l">Cotisation par habitant</div><div class="v">${eur2(s.besoin / (s.popTot || 1))}</div><div class="d">${nf0.format(s.popTot)} habitants</div></div>
    </div>`;

    h += `<div class="grid g2">
      <div class="card"><h3>Cotisations totales – référence vs scénario</h3>${groupedBars(yrs, [
        { name: "Référence", values: yrs.map((yy) => R.ref[yy].besoin), color: "#9aa5b4" },
        { name: "Scénario", values: yrs.map((yy) => R.scen[yy].besoin), color: "#1f4e79" },
      ])}
      <p class="small muted" style="margin:6px 0 0">2026 inclut la constitution d'un fonds de roulement de ${eur(state.hyp.fdr[2026] - (state.hyp.fdr[2025] || 0))} et des éléments ponctuels (déficit reporté, IJ) : la baisse apparente en 2027 vient de là.</p></div>
      <div class="card"><h3>Cotisation par commune – scénario</h3>${lineChart(yrs, comms.map((c, i) => ({ name: c.nom, color: PALETTE[i % PALETTE.length], values: yrs.map((yy) => (R.scen[yy].communes.find((x) => x.id === c.id) || {}).cotis || 0) })))}</div>
    </div>`;

    // Tableau des cotisations
    h += `<div class="card"><h3>Cotisations par commune (scénario) et écart avec la référence en ${y}</h3><div class="scroll"><table>
      <thead><tr><th>Commune</th><th class="n">Pop.</th><th class="n">Enfants ${y}</th>${yrs.map((yy) => `<th class="n">${yy}</th>`).join("")}<th class="n">Écart réf. ${y}</th><th class="n">Évol. ${yrs[0]}→${yrs[yrs.length - 1]}</th><th class="n">€/hab. ${y}</th></tr></thead><tbody>`;
    comms.forEach((c) => {
      const vals = yrs.map((yy) => (R.scen[yy].communes.find((x) => x.id === c.id) || {}).cotis);
      const cr = (r.communes.find((x) => x.id === c.id) || {}).cotis || 0;
      const cs = (s.communes.find((x) => x.id === c.id) || {}).cotis || 0;
      const first = vals.find((v) => v != null), last = vals[vals.length - 1];
      h += `<tr class="${c.statut !== "membre" ? "cand" : ""}"><td><a href="#" data-act="goCommune" data-arg="${c.id}">${esc(c.nom)}</a> ${c.statut !== "membre" ? '<span class="pill c">candidate</span>' : ""}</td>
        <td class="n">${nf0.format(c.pop)}</td><td class="n">${nf0.format(c.enfants[y] ?? 0)}</td>
        ${vals.map((v) => `<td class="n">${v == null ? '<span class="muted">–</span>' : eur(v)}</td>`).join("")}
        <td class="n">${c.statut !== "membre" && !cr ? '<span class="muted">nouvelle</span>' : delta(cs - cr)}</td>
        <td class="n">${first ? pct(dpct(last, first)) : "–"}</td><td class="n">${cs ? eur2(cs / c.pop) : "–"}</td></tr>`;
    });
    h += `<tr class="tot"><td>Total</td><td class="n">${nf0.format(s.popTot)}</td><td class="n">${nf0.format(s.enf)}</td>${yrs.map((yy) => `<td class="n">${eur(R.scen[yy].besoin)}</td>`).join("")}<td class="n">${delta(dTot)}</td><td class="n">${pct(dpct(R.scen[yrs[yrs.length - 1]].besoin, R.scen[yrs[0]].besoin))}</td><td class="n">${eur2(s.besoin / s.popTot)}</td></tr>`;
    h += `</tbody></table></div></div>`;

    // Coût net par service
    h += `<div class="grid g2"><div class="card"><h3>À quoi servent les cotisations en ${y} ? (coût net par service, scénario)</h3>${hbars(s.analytiqueVentile)}
      <p class="small muted">Le personnel est ventilé entre services selon la clé définie dans l'onglet Projection (hypothèse à confirmer).</p></div>
      <div class="card"><h3>Écart scénario − référence en ${y}, par service</h3>${deltaTable(s.analytiqueVentile, r.analytiqueVentile)}</div></div>`;
    return h;
  }

  function hbars(an) {
    const rows = Object.entries(an).filter(([, v]) => Math.abs(v) > 0.5).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...rows.map(([, v]) => Math.abs(v)));
    return `<div class="hbars">${rows.map(([k, v]) => `<div class="row"><div><span class="sw" style="background:${M.CATS[k].color}"></span>${M.CATS[k].lib}</div><div class="track"><div class="fill" style="width:${(Math.abs(v) / max) * 100}%;background:${M.CATS[k].color};opacity:${v < 0 ? 0.4 : 1}"></div></div><div class="n" style="text-align:right">${eur(v)}</div></div>`).join("")}</div>`;
  }
  function deltaTable(a, b) {
    const ks = Object.keys(M.CATS).filter((k) => Math.abs((a[k] || 0) - (b[k] || 0)) > 0.5 || Math.abs(a[k] || 0) > 0.5);
    return `<table><thead><tr><th>Service</th><th class="n">Référence</th><th class="n">Scénario</th><th class="n">Écart</th></tr></thead><tbody>${ks
      .map((k) => `<tr><td><span class="sw" style="background:${M.CATS[k].color}"></span>${M.CATS[k].lib}</td><td class="n">${eur(b[k])}</td><td class="n">${eur(a[k])}</td><td class="n">${delta((a[k] || 0) - (b[k] || 0))}</td></tr>`)
      .join("")}</tbody></table>`;
  }

  /* =====================================================================
     ONGLET : COMMUNES & COTISATIONS
     ===================================================================== */
  function tabCommunes() {
    const yrs = YEARS();
    let h = `<h2>Communes & cotisations</h2>
    <p class="lead">Les cotisations couvrent le <b>besoin de financement</b> du syndicat (dépenses − recettes propres − résultat reporté + fonds de roulement visé). Elles sont réparties selon une clé mixte population / enfants scolarisés.</p>`;

    h += `<div class="note"><b>Effectifs par commune à saisir.</b> Le budget ne donne pas le nombre d'enfants par commune : les valeurs surlignées sont des estimations (≈ 40 enfants répartis selon la population). Les populations viennent de BANATIC (971 hab. au total).</div>`;

    h += `<div class="card"><h3>Clé de répartition</h3><div class="bar">
      <label class="inl">Part population ${numIn("cle.pop", state.cle.pop, "s", 1)} %</label>
      <label class="inl">Part enfants scolarisés ${numIn("cle.enf", state.cle.enf, "s", 1)} %</label>
      <span class="small muted">(les deux parts totalisent toujours 100 %)</span></div></div>`;

    // Membres
    const ehead = yrs.map((y) => `<th class="n">Enfants ${y}</th>`).join("");
    h += `<div class="card"><h3>Communes membres</h3><div class="scroll"><table><thead><tr><th>Commune</th><th>INSEE</th><th class="n">Population</th>${ehead}<th></th></tr></thead><tbody>`;
    state.communes.forEach((c, i) => {
      if (c.statut !== "membre") return;
      h += `<tr><td>${txtIn(`communes.${i}.nom`, c.nom)}</td><td style="width:80px">${txtIn(`communes.${i}.insee`, c.insee)}</td><td class="n">${numIn(`communes.${i}.pop`, c.pop, "", 0)}</td>
        ${yrs.map((y) => `<td class="n">${numIn(`communes.${i}.enfants.${y}`, c.enfants[y], state.checklist.enfants ? "s" : "s est", 0)}</td>`).join("")}
        <td><button class="btn small" data-act="toCand" data-arg="${i}" title="Passer en commune candidate (scénario)">→ candidate</button></td></tr>`;
    });
    const mem = state.communes.filter((c) => c.statut === "membre");
    h += `<tr class="tot"><td>Total membres</td><td></td><td class="n">${nf0.format(mem.reduce((s, c) => s + +c.pop, 0))}</td>${yrs.map((y) => `<td class="n">${nf0.format(mem.reduce((s, c) => s + (+c.enfants[y] || 0), 0))}</td>`).join("")}<td></td></tr>`;
    h += `</tbody></table></div><div class="bar" style="margin:10px 0 0"><button class="btn" data-act="addCommune" data-arg="membre">+ Ajouter une commune membre</button>
      <label class="inl">${chkIn("checklist.enfants", state.checklist.enfants)} Effectifs vérifiés</label></div></div>`;

    // Candidates
    h += `<div class="card"><h3>Communes candidates (simulation d'adhésion)</h3>
      <p class="small muted" style="margin-top:-4px">Une commune candidate cochée « active » entre dans le <b>scénario</b> à partir de son année d'adhésion : ses enfants s'ajoutent aux effectifs (repas, fournitures…), elle cotise selon la clé, et vous pouvez indiquer les kilomètres de transport supplémentaires, une ouverture de classe et un poste supplémentaire.</p>
      <div class="scroll"><table><thead><tr><th>Active</th><th>Commune</th><th class="n">Population</th>${ehead}<th>Adhésion</th>${state.transport.map((t) => `<th class="n" title="${esc(t.nom)}">+ km/jour<br>${esc(t.nom.split("(")[0].trim())}</th>`).join("")}<th>Ouvre une classe</th><th>Poste suppl.</th><th></th></tr></thead><tbody>`;
    let nc = 0;
    state.communes.forEach((c, i) => {
      if (c.statut === "membre") return;
      nc++;
      h += `<tr class="cand"><td>${chkIn(`communes.${i}.actif`, c.actif)}</td><td style="min-width:200px">${txtIn(`communes.${i}.nom`, c.nom)}</td><td class="n">${numIn(`communes.${i}.pop`, c.pop, "", 0)}</td>
        ${yrs.map((y) => `<td class="n">${numIn(`communes.${i}.enfants.${y}`, c.enfants[y], "s", 0)}</td>`).join("")}
        <td>${selIn(`communes.${i}.annee`, c.annee, yearOpts(), "n")}</td>
        ${state.transport.map((t) => `<td class="n">${numIn(`communes.${i}.km.${t.id}`, (c.km || {})[t.id] || 0, "s", 1)}</td>`).join("")}
        <td>${chkIn(`communes.${i}.ouvreClasse`, c.ouvreClasse)}</td><td>${chkIn(`communes.${i}.posteSupp`, c.posteSupp)}</td>
        <td style="white-space:nowrap"><button class="btn small" data-act="toMembre" data-arg="${i}" title="Intégrer comme membre (référence)">→ membre</button> <button class="btn small danger" data-act="delCommune" data-arg="${i}">✕</button></td></tr>`;
    });
    if (!nc) h += `<tr><td colspan="20" class="muted">Aucune commune candidate.</td></tr>`;
    h += `</tbody></table></div><div class="bar" style="margin:10px 0 0"><button class="btn primary" data-act="addCommune" data-arg="candidate">+ Simuler l'adhésion d'une commune</button>
      <span class="small muted">Coût d'un poste supplémentaire : ${numIn("hyp.coutPoste", state.hyp.coutPoste, "", 0)} €/an (chargé)</span></div></div>`;

    h += detailCommune();
    return h;
  }

  function detailCommune() {
    const yrs = YEARS();
    const pool = state.communes.filter((c) => c.statut === "membre" || c.actif);
    if (!pool.find((c) => c.id === ui.commune)) ui.commune = pool[0] && pool[0].id;
    const y = ui.year, v = ui.view, d = (v === "scen" ? R.scen : R.ref)[y];
    const c = d.communes.find((x) => x.id === ui.commune);
    const prev = y > BASE() ? (v === "scen" ? R.scen : R.ref)[y - 1].communes.find((x) => x.id === ui.commune) : null;
    const other = (v === "scen" ? R.ref : R.scen)[y].communes.find((x) => x.id === ui.commune);
    const wP = state.cle.pop / 100, wE = state.cle.enf / 100;

    let h = `<div class="card" id="detail"><h3>Détail du calcul de la cotisation</h3><div class="bar">
      <select class="sel" data-ui="commune">${pool.map((x) => `<option value="${x.id}" ${x.id === ui.commune ? "selected" : ""}>${esc(x.nom)}</option>`).join("")}</select>
      <div class="seg">${yrs.map((yy) => `<button data-act="year" data-arg="${yy}" class="${yy === y ? "on" : ""}">${yy}</button>`).join("")}</div>
      <div class="seg"><button data-act="view" data-arg="ref" class="${v === "ref" ? "on" : ""}">Référence</button><button data-act="view" data-arg="scen" class="${v === "scen" ? "on" : ""}">Scénario</button></div></div>`;

    if (!c) {
      return h + `<p class="muted">Cette commune ne cotise pas en ${y} dans la vue « ${v === "ref" ? "référence" : "scénario"} » (adhésion ultérieure ou commune candidate).</p></div>`;
    }

    h += `<div class="grid g2"><div class="steps">
      <div class="step"><div class="k">1</div><div class="f"><b>Besoin de financement du syndicat</b><br>
        Dépenses de fonctionnement <code>${eur(d.dep)}</code> − recettes hors cotisations <code>${eur(d.recAutres)}</code> − résultat reporté <code>${eur(d.report)}</code> + fonds de roulement visé <code>${eur(d.fdr)}</code></div><div class="r">${eur(d.besoin)}</div></div>
      <div class="step"><div class="k">2</div><div class="f"><b>Part population (${nfp.format(state.cle.pop)} %)</b><br>
        ${esc(c.nom)} : <code>${nf0.format(c.pop)} hab.</code> sur <code>${nf0.format(d.popTot)}</code> = <code>${pct(c.sp)}</code><br>
        <code>${eur(d.besoin)}</code> × ${nfp.format(state.cle.pop)} % × ${pct(c.sp)}</div><div class="r">${eur2(c.partPop)}</div></div>
      <div class="step"><div class="k">3</div><div class="f"><b>Part enfants scolarisés (${nfp.format(state.cle.enf)} %)</b><br>
        ${esc(c.nom)} : <code>${nf0.format(c.enf)} enfants</code> sur <code>${nf0.format(d.enf)}</code> = <code>${pct(c.se)}</code><br>
        <code>${eur(d.besoin)}</code> × ${nfp.format(state.cle.enf)} % × ${pct(c.se)}</div><div class="r">${eur2(c.partEnf)}</div></div>
      <div class="step total"><div class="k">=</div><div class="f"><b>Cotisation ${y} – ${esc(c.nom)}</b><br>soit ${pct(c.share)} du total · ${eur2(c.cotis / (c.pop || 1))} par habitant · ${c.enf ? eur(c.cotis / c.enf) + " par enfant" : "aucun enfant"}</div><div class="r">${eur2(c.cotis)}</div></div>
      <div class="small muted">${prev ? `Année précédente : ${eur2(prev.cotis)} (${delta(c.cotis - prev.cotis)}). ` : ""}${other ? `En ${v === "scen" ? "référence" : "scénario"} : ${eur2(other.cotis)} (écart ${delta((v === "scen" ? 1 : -1) * (c.cotis - other.cotis))}).` : ""}</div>
    </div>
    <div><h3 style="margin-top:0">Ce que finance la cotisation de ${esc(c.nom)}</h3><table><thead><tr><th>Service</th><th class="n">Coût net syndicat</th><th class="n">Part de la commune</th></tr></thead><tbody>
    ${Object.entries(d.analytiqueVentile).filter(([, x]) => Math.abs(x) > 0.5).sort((a, b) => b[1] - a[1]).map(([k, x]) => `<tr><td><span class="sw" style="background:${M.CATS[k].color}"></span>${M.CATS[k].lib}</td><td class="n">${eur(x)}</td><td class="n">${eur(x * c.share)}</td></tr>`).join("")}
    <tr class="tot"><td>Total</td><td class="n">${eur(d.besoin)}</td><td class="n">${eur(c.cotis)}</td></tr></tbody></table></div></div>`;

    // Tableau complet de répartition
    h += `<h3 style="margin-top:20px">Répartition ${y} entre toutes les communes (${v === "scen" ? "scénario" : "référence"})</h3><div class="scroll"><table><thead><tr><th>Commune</th><th class="n">Population</th><th class="n">% pop.</th><th class="n">Part population</th><th class="n">Enfants</th><th class="n">% enfants</th><th class="n">Part enfants</th><th class="n">Cotisation</th><th class="n">% du total</th><th class="n">€/hab.</th><th class="n">€/enfant</th></tr></thead><tbody>`;
    d.communes.forEach((x) => {
      h += `<tr class="${x.id === c.id ? "sub" : ""}"><td>${esc(x.nom)}</td><td class="n">${nf0.format(x.pop)}</td><td class="n">${pct(x.sp)}</td><td class="n">${eur(x.partPop)}</td><td class="n">${nf0.format(x.enf)}</td><td class="n">${pct(x.se)}</td><td class="n">${eur(x.partEnf)}</td><td class="n"><b>${eur(x.cotis)}</b></td><td class="n">${pct(x.share)}</td><td class="n">${eur2(x.cotis / (x.pop || 1))}</td><td class="n">${x.enf ? eur(x.cotis / x.enf) : "–"}</td></tr>`;
    });
    h += `<tr class="tot"><td>Total</td><td class="n">${nf0.format(d.popTot)}</td><td class="n">100 %</td><td class="n">${eur(d.besoin * wP)}</td><td class="n">${nf0.format(d.enf)}</td><td class="n">100 %</td><td class="n">${eur(d.besoin * wE)}</td><td class="n">${eur(d.besoin)}</td><td class="n">100 %</td><td class="n">${eur2(d.besoin / d.popTot)}</td><td class="n">${eur(d.besoin / (d.enf || 1))}</td></tr></tbody></table></div></div>`;
    return h;
  }

  /* =====================================================================
     ONGLET : TRANSPORT
     ===================================================================== */
  const PARAMS = {
    commun: [["jours", "Jours de service / an"], ["km", "Km par jour"], ["eleves", "Élèves transportés"]],
    regie: [["conso", "Conso. (L/100 km)"], ["prixCarb", "Prix carburant (€/L)"], ["entretien", "Entretien (€/an)"], ["assurance", "Assurance véhicule (€/an)"], ["hCond", "Heures conducteur / jour"], ["hAcc", "Heures accompagnateur / jour"], ["coutH", "Coût horaire chargé (€)"], ["provision", "Provision renouvellement (€/an)"], ["recettes", "Recettes liées (€/an)"]],
    prestataire: [["forfaitJour", "Forfait par jour (€)"], ["prixKm", "Prix au km (€)"], ["hAcc", "Heures accompagnateur / jour"], ["coutH", "Coût horaire chargé (€)"], ["recettes", "Recettes liées (€/an)"]],
    region: [["partEleve", "Participation par élève (€/an)"], ["hAcc", "Heures accompagnateur / jour"], ["coutH", "Coût horaire chargé (€)"], ["recettes", "Recettes Région (€/an)"]],
  };

  function tabTransport() {
    const yrs = YEARS(), ty = ui.trYear;
    let h = `<h2>Transport</h2>
    <p class="lead">Chaque service a un <b>mode actuel</b> (référence) et un <b>mode simulé</b> (scénario). Le simulateur calcule le coût de chaque mode avec vos paramètres et ajoute au budget l'<b>écart</b> entre les deux, à partir de l'année d'effet (au prorata de septembre si coché). Les lignes du budget 2026 (carburant, entretien du bus, participation Région) restent la base.</p>`;
    h += `<div class="note"><b>À confirmer :</b> l'organisation exacte du transport n'apparaît pas dans le budget. Les paramètres par défaut sont des hypothèses plausibles. Point marquant : la <b>participation de la Région passe de 44 000 € (BP 2025) à 2 300 € (2026)</b>, et les cotisations de 67 925 € à 107 250 € (+39 325 €). C'est le premier facteur de hausse.</div>`;

    h += `<div class="bar"><span class="muted small">Année du détail</span><div class="seg">${yrs.map((yy) => `<button data-act="trYear" data-arg="${yy}" class="${yy === ty ? "on" : ""}">${yy}</button>`).join("")}</div></div>`;

    state.transport.forEach((t, i) => {
      const res = R.scen[ty].transport.find((x) => x.id === t.id);
      h += `<div class="card"><div class="svc-head">${txtIn(`transport.${i}.nom`, t.nom)}
        <label class="inl">Mode actuel ${selIn(`transport.${i}.modeActuel`, t.modeActuel, M.MODES)}</label>
        <label class="inl">Mode simulé ${selIn(`transport.${i}.modeScenario`, t.modeScenario, M.MODES)}</label>
        <label class="inl">À partir de ${selIn(`transport.${i}.anneeEffet`, t.anneeEffet, yearOpts(), "n")}</label>
        <label class="inl">${chkIn(`transport.${i}.prorata`, t.prorata)} rentrée de septembre (4/12 la 1re année)</label>
        <button class="btn small danger" data-act="delService" data-arg="${i}" style="margin-left:auto">Supprimer</button></div>
        <div class="kv" style="grid-template-columns:repeat(3, auto auto);justify-content:start;gap:6px 14px;margin-bottom:12px">${PARAMS.commun.map(([k, l]) => `<span>${l}</span>${numIn(`transport.${i}.commun.${k}`, t.commun[k])}`).join("")}</div>
        <div class="modes">${["regie", "prestataire", "region"].map((m) => {
          const cls = m === t.modeScenario && m === t.modeActuel ? "scn" : m === t.modeScenario ? "scn" : m === t.modeActuel ? "cur" : "";
          const tag = [m === t.modeActuel ? "actuel" : "", m === t.modeScenario ? "simulé" : ""].filter(Boolean).join(" · ");
          const cost = M.coutService(state, t, m, ty, 0);
          return `<div class="mode ${cls}"><h4>${M.MODES[m]}${tag ? `<span class="tag muted">(${tag})</span>` : ""}</h4><div class="kv">${PARAMS[m].map(([k, l]) => `<span>${l}</span>${numIn(`transport.${i}.${m}.${k}`, t[m][k])}`).join("")}
            <b style="margin-top:6px">Coût net ${ty}</b><b style="margin-top:6px;text-align:right">${eur(cost.net)}</b></div></div>`;
        }).join("")}</div>`;

      // Tableau pluriannuel
      h += `<div class="grid g2" style="margin-top:14px"><div><table><thead><tr><th>Coût net du service</th>${yrs.map((yy) => `<th class="n">${yy}</th>`).join("")}</tr></thead><tbody>
        <tr><td>Référence (${M.MODES[t.modeActuel].split(" (")[0]})</td>${yrs.map((yy) => `<td class="n">${eur(R.scen[yy].transport[i].ref.net)}</td>`).join("")}</tr>
        <tr><td>Scénario</td>${yrs.map((yy) => `<td class="n">${eur(R.scen[yy].transport[i].scen.net)}</td>`).join("")}</tr>
        <tr class="tot"><td>Écart ajouté au budget</td>${yrs.map((yy) => `<td class="n">${delta(R.scen[yy].transport[i].delta.net)}</td>`).join("")}</tr></tbody></table></div>
        <div><table><thead><tr><th>Détail ${ty}</th><th class="n">Référence</th><th class="n">Scénario</th></tr></thead><tbody>${compRows(res)}</tbody></table></div></div></div>`;
    });
    h += `<button class="btn" data-act="addService">+ Ajouter un service de transport</button>`;

    // Calage
    const b = R.ref[BASE()];
    const ln = (id) => (b.lignes.find((l) => l.id === id) || {}).v || 0;
    const modRef = R.ref[BASE()].transport.reduce((s, t) => s + t.ref.net, 0);
    h += `<div class="card" style="margin-top:18px"><h3>Contrôle de cohérence avec le budget 2026</h3>
      <table style="max-width:640px"><tbody>
      <tr><td>Carburants (60622)</td><td class="n">${eur(ln("d60622"))}</td></tr>
      <tr><td>Entretien matériel roulant (61551)</td><td class="n">${eur(ln("d61551"))}</td></tr>
      <tr><td>Participation Région (7472)</td><td class="n">−${eur(ln("r7472"))}</td></tr>
      <tr class="sub"><td>Coût net transport visible au budget (hors personnel et assurance)</td><td class="n">${eur(ln("d60622") + ln("d61551") - ln("r7472"))}</td></tr>
      <tr class="sub"><td>Coût net modélisé, situation actuelle (avec personnel et assurance)</td><td class="n">${eur(modRef)}</td></tr></tbody></table>
      <p class="small muted">Les deux montants n'ont pas à être égaux (le personnel et l'assurance du bus sont inclus dans les lignes 012 et 6168). Ajustez les paramètres « actuels » pour qu'ils reflètent la réalité : seul l'écart avec le mode simulé modifie le budget.</p></div>`;
    return h;
  }
  function compRows(res) {
    const keys = {};
    [...res.ref.comps, ...res.scen.comps].forEach((c) => (keys[c.sens + "|" + c.lib] = c));
    return Object.keys(keys).map((k) => {
      const [sens, lib] = k.split("|");
      const a = (res.ref.comps.find((c) => c.sens + "|" + c.lib === k) || {}).montant || 0;
      const b = (res.scen.comps.find((c) => c.sens + "|" + c.lib === k) || {}).montant || 0;
      if (Math.abs(a) < 0.5 && Math.abs(b) < 0.5) return "";
      const sg = sens === "rec" ? "−" : "";
      return `<tr><td>${esc(lib)}</td><td class="n">${a ? sg + eur(a) : "–"}</td><td class="n">${b ? sg + eur(b) : "–"}</td></tr>`;
    }).join("") + `<tr class="tot"><td>Coût net</td><td class="n">${eur(res.ref.net)}</td><td class="n">${eur(res.scen.net)}</td></tr>`;
  }

  /* =====================================================================
     ONGLET : BUDGET 2026
     ===================================================================== */
  function tabBudget() {
    const b = R.ref[BASE()];
    let h = `<h2>Budget de base ${BASE()}</h2>
    <p class="lead">Les lignes de la proposition ${BASE()}, avec pour chacune : le <b>service</b> auquel elle se rattache (pour l'analyse et le détail des cotisations), sa <b>nature</b> (fixe, proportionnelle aux enfants ou aux classes, ponctuelle) et l'<b>indice</b> qui la fait évoluer. Tout est modifiable.</p>`;
    h += `<div class="info">Contrôle : dépenses ${eur2(b.dep)} (document : 135 380,13 €) · recettes totales ${eur2(b.recTotal)} (document : 143 435,00 €) · participation des communes calculée ${eur2(b.besoin)} (document : 107 250,00 €).</div>`;
    h += lignesTable("dep", "Dépenses de fonctionnement") + lignesTable("rec", "Recettes de fonctionnement");

    // Récap par service
    h += `<div class="card"><h3>Budget ${BASE()} par service (coût net, personnel non ventilé)</h3>${hbars(b.analytique)}</div>`;

    // Investissement
    const inv = state.invest;
    h += `<div class="card"><h3>Section d'investissement</h3>
      <p class="small muted" style="margin-top:-4px">Le virement de la section de fonctionnement (023/021) est calculé : dépenses d'équipement − subventions − FCTVA − solde reporté. Un projet coché « scénario » n'existe que dans le scénario (ex. achat d'un bus).</p>
      <div class="scroll"><table><thead><tr><th>Année</th><th>Projet</th><th class="n">Montant TTC</th><th class="n">Subvention</th><th>Scénario seul</th><th></th></tr></thead><tbody>
      ${inv.projets.map((p, i) => `<tr><td>${selIn(`invest.projets.${i}.annee`, p.annee, yearOpts(), "n")}</td><td>${txtIn(`invest.projets.${i}.lib`, p.lib)}</td><td class="n">${numIn(`invest.projets.${i}.montant`, p.montant)}</td><td class="n">${numIn(`invest.projets.${i}.subv`, p.subv)}</td><td>${chkIn(`invest.projets.${i}.scenarioSeul`, p.scenarioSeul)}</td><td><button class="btn small danger" data-act="delProjet" data-arg="${i}">✕</button></td></tr>`).join("")}
      </tbody></table></div><div class="bar" style="margin-top:10px"><button class="btn" data-act="addProjet">+ Ajouter un investissement</button>
      <label class="inl">Taux FCTVA ${numIn("invest.fctvaTaux", inv.fctvaTaux, "s", 3)} %</label>
      <label class="inl">Versé en N+ ${numIn("invest.fctvaDecalage", inv.fctvaDecalage, "s", 0)}</label>
      <label class="inl">Équipement réalisé 2024 ${numIn("invest.depensesPassees.2024", inv.depensesPassees[2024])} €</label>
      <label class="inl">2025 ${numIn("invest.depensesPassees.2025", inv.depensesPassees[2025])} €</label>
      <label class="inl">Solde reporté 001 (2026) ${numIn("invest.solde001", inv.solde001)} €</label></div>
      <table style="margin-top:10px"><thead><tr><th>Scénario</th>${YEARS().map((y) => `<th class="n">${y}</th>`).join("")}</tr></thead><tbody>
      ${[["Dépenses d'équipement", "dep"], ["Subventions", "subv"], ["FCTVA", "fctva"], ["Solde reporté", "solde"], ["Virement du fonctionnement (023)", "virement"]].map(([l, k]) => `<tr class="${k === "virement" ? "sub" : ""}"><td>${l}</td>${YEARS().map((y) => `<td class="n">${eur(R.scen[y].invest[k])}</td>`).join("")}</tr>`).join("")}
      </tbody></table></div>`;
    return h;
  }

  function lignesTable(sens, titre) {
    const b = R.ref[BASE()];
    let h = `<div class="card"><h3>${titre}</h3><div class="scroll scroll-y"><table><thead><tr><th>Chap.</th><th>Article</th><th>Libellé</th><th class="n">BP 2025</th><th class="n">Réalisé 2025</th><th class="n">${BASE()}</th><th>Service</th><th>Nature</th><th>Évolution</th><th>Commentaire</th><th></th></tr></thead><tbody>`;
    let tot = 0, totBp = 0, totReal = 0, lastChap = null;
    state.lignes.forEach((l, i) => {
      if (l.sens !== sens) return;
      if (l.chap !== lastChap) { h += `<tr class="grp"><td colspan="11">${l.chap} – ${M.CHAP_LIB[l.chap] || ""}</td></tr>`; lastChap = l.chap; }
      const calc = ["virement", "report", "cotisations"].includes(l.nature);
      let val = l.montant;
      if (l.nature === "virement") val = b.invest.virement;
      if (l.nature === "report") val = b.report;
      if (l.nature === "cotisations") val = b.besoin;
      tot += +val || 0; totBp += +l.bp25 || 0; totReal += +l.real25 || 0;
      h += `<tr class="${calc ? "calc" : ""}"><td>${esc(l.chap)}</td><td style="width:80px">${txtIn(`lignes.${i}.art`, l.art)}</td><td style="min-width:240px">${txtIn(`lignes.${i}.lib`, l.lib)}</td>
        <td class="n">${eur2(l.bp25)}</td><td class="n">${eur2(l.real25)}</td>
        <td class="n">${calc ? eur2(val) : numIn(`lignes.${i}.montant`, l.montant)}</td>
        <td>${calc ? "—" : selIn(`lignes.${i}.cat`, l.cat, catOpts())}</td>
        <td>${calc ? M.NATURES[l.nature] : selIn(`lignes.${i}.nature`, l.nature, Object.fromEntries(Object.entries(M.NATURES).filter(([k]) => !["virement", "report", "cotisations"].includes(k))))}</td>
        <td>${calc ? "—" : selIn(`lignes.${i}.index`, l.index, M.INDEXES)}</td>
        <td style="min-width:200px">${txtIn(`lignes.${i}.com`, l.com)}</td>
        <td>${calc ? "" : `<button class="btn small danger" data-act="delLigne" data-arg="${i}">✕</button>`}</td></tr>`;
    });
    h += `<tr class="tot"><td colspan="3">Total ${sens === "dep" ? "dépenses" : "recettes"}</td><td class="n">${eur2(totBp)}</td><td class="n">${eur2(totReal)}</td><td class="n">${eur2(tot)}</td><td colspan="5"></td></tr>`;
    h += `</tbody></table></div><div class="bar" style="margin:10px 0 0"><button class="btn" data-act="addLigne" data-arg="${sens}">+ Ajouter une ligne</button></div></div>`;
    return h;
  }

  /* =====================================================================
     ONGLET : PROJECTION
     ===================================================================== */
  function tabProjection() {
    const yrs = YEARS(), fut = yrs.filter((y) => y > BASE());
    const T = state.hyp.taux;
    let h = `<h2>Projection ${yrs[0]}–${yrs[yrs.length - 1]}</h2>
    <p class="lead">Chaque ligne du budget ${BASE()} évolue selon son indice et sa nature. Ajoutez ici les événements connus (recrutement, fin de contrat, nouvelle dépense…) sous forme d'ajustements.</p>`;

    h += `<div class="grid g2"><div class="card"><h3>Hypothèses d'évolution annuelle</h3><table><thead><tr><th>Indice</th>${fut.map((y) => `<th class="n">${y}</th>`).join("")}</tr></thead><tbody>
      ${Object.keys(T).map((k) => `<tr><td>${M.INDEXES[k]} (%)</td>${fut.map((y) => `<td class="n">${numIn(`hyp.taux.${k}.${y}`, T[k][y], "s", 2)}</td>`).join("")}</tr>`).join("")}
      </tbody></table>
      <table style="margin-top:14px"><thead><tr><th>Paramètre</th>${yrs.map((y) => `<th class="n">${y}</th>`).join("")}</tr></thead><tbody>
      <tr><td>Nombre de classes (référence)</td>${yrs.map((y) => `<td class="n">${numIn(`hyp.classes.${y}`, state.hyp.classes[y], "s", 0)}</td>`).join("")}</tr>
      <tr><td>Fonds de roulement visé en fin d'année (€)</td>${yrs.map((y) => `<td class="n">${numIn(`hyp.fdr.${y}`, state.hyp.fdr[y], "", 0)}</td>`).join("")}</tr>
      <tr><td class="muted small">→ excédent à dégager dans l'année</td>${yrs.map((y) => `<td class="n small">${eur(R.scen[y].variationFdr)}</td>`).join("")}</tr>
      <tr><td>Enfants scolarisés (scénario)</td>${yrs.map((y) => `<td class="n">${nf0.format(R.scen[y].enf)}</td>`).join("")}</tr>
      </tbody></table>
      <p class="small muted">Fonds de roulement : en ${BASE()}, le budget prévoit de constituer ${eur2(state.hyp.fdr[BASE()])}. Ce montant revient l'année suivante en résultat reporté (002) ; pour le conserver, laissez le même objectif.</p></div>

      <div class="card"><h3>Clé de ventilation du personnel par service</h3><p class="small muted" style="margin-top:-4px">Sert uniquement à l'analyse « à quoi servent les cotisations ». Le budget ne détaille pas les postes (3 agents) : à ajuster.</p>
      <div class="kv" style="max-width:360px">${Object.keys(state.hyp.cleCalculPersonnel).map((k) => `<span><span class="sw" style="background:${M.CATS[k].color}"></span>${M.CATS[k].lib} (%)</span>${numIn(`hyp.cleCalculPersonnel.${k}`, state.hyp.cleCalculPersonnel[k], "s", 1)}`).join("")}</div></div></div>`;

    // Ajustements
    h += `<div class="card"><h3>Ajustements (événements connus ou envisagés)</h3><div class="scroll"><table><thead><tr><th>Libellé</th><th>Sens</th><th>Service</th><th class="n">Montant annuel</th><th>De</th><th>À</th><th>Évolution</th><th>Portée</th><th></th></tr></thead><tbody>
      ${state.ajustements.length ? state.ajustements.map((a, i) => `<tr><td>${txtIn(`ajustements.${i}.lib`, a.lib)}</td><td>${selIn(`ajustements.${i}.sens`, a.sens, { dep: "Dépense", rec: "Recette" })}</td><td>${selIn(`ajustements.${i}.cat`, a.cat, catOpts())}</td><td class="n">${numIn(`ajustements.${i}.montant`, a.montant)}</td><td>${selIn(`ajustements.${i}.de`, a.de, yearOpts(), "n")}</td><td>${selIn(`ajustements.${i}.a`, a.a, yearOpts(), "n")}</td><td>${selIn(`ajustements.${i}.index`, a.index, M.INDEXES)}</td><td>${selIn(`ajustements.${i}.portee`, a.portee, { tous: "Référence + scénario", scenario: "Scénario seulement" })}</td><td><button class="btn small danger" data-act="delAjust" data-arg="${i}">✕</button></td></tr>`).join("") : `<tr><td colspan="9" class="muted">Aucun ajustement. Exemples : recrutement d'une ATSEM, fin d'un contrat aidé, hausse du prix du repas EHPAD, classe découverte…</td></tr>`}
      </tbody></table></div><div class="bar" style="margin:10px 0 0"><button class="btn" data-act="addAjust">+ Ajouter un ajustement</button></div></div>`;

    // Résultats par chapitre
    const rowsDep = ["011", "012", "65", "67", "002", "023"];
    const rowsRec = ["70", "74", "75", "77", "013"];
    const cell = (y, f) => `<td class="n">${eur(f(R.ref[y]))}</td><td class="n" style="background:#f3f7fb">${eur(f(R.scen[y]))}</td>`;
    h += `<div class="card"><h3>Budget de fonctionnement projeté</h3><div class="scroll"><table><thead><tr><th rowspan="2">Chapitre</th>${yrs.map((y) => `<th class="n" colspan="2" style="text-align:center">${y}</th>`).join("")}</tr><tr>${yrs.map(() => `<th class="n">Réf.</th><th class="n">Scén.</th>`).join("")}</tr></thead><tbody>
      <tr class="grp"><td colspan="${1 + yrs.length * 2}">Dépenses</td></tr>
      ${rowsDep.map((c) => `<tr><td>${c} – ${M.CHAP_LIB[c]}</td>${yrs.map((y) => cell(y, (d) => d.chapitres.dep[c] || 0)).join("")}</tr>`).join("")}
      <tr class="sub"><td>Total dépenses</td>${yrs.map((y) => cell(y, (d) => d.dep)).join("")}</tr>
      <tr class="grp"><td colspan="${1 + yrs.length * 2}">Recettes</td></tr>
      ${rowsRec.map((c) => `<tr><td>${c} – ${M.CHAP_LIB[c]}${c === "74" ? " (hors cotisations)" : ""}</td>${yrs.map((y) => cell(y, (d) => d.chapitres.rec[c] || 0)).join("")}</tr>`).join("")}
      <tr><td>002 – Résultat reporté</td>${yrs.map((y) => cell(y, (d) => d.report)).join("")}</tr>
      <tr class="sub"><td>Recettes hors cotisations</td>${yrs.map((y) => cell(y, (d) => d.recAutres + d.report)).join("")}</tr>
      <tr><td>Excédent visé (fonds de roulement)</td>${yrs.map((y) => cell(y, (d) => d.variationFdr)).join("")}</tr>
      <tr class="tot"><td>74748 – Cotisations des communes</td>${yrs.map((y) => cell(y, (d) => d.besoin)).join("")}</tr>
      </tbody></table></div></div>`;

    // Analytique
    h += `<div class="card"><h3>Coût net par service (personnel ventilé)</h3><div class="scroll"><table><thead><tr><th rowspan="2">Service</th>${yrs.map((y) => `<th class="n" colspan="2" style="text-align:center">${y}</th>`).join("")}</tr><tr>${yrs.map(() => `<th class="n">Réf.</th><th class="n">Scén.</th>`).join("")}</tr></thead><tbody>
      ${Object.keys(M.CATS).filter((k) => yrs.some((y) => Math.abs(R.scen[y].analytiqueVentile[k]) > 0.5 || Math.abs(R.ref[y].analytiqueVentile[k]) > 0.5)).map((k) => `<tr><td><span class="sw" style="background:${M.CATS[k].color}"></span>${M.CATS[k].lib}</td>${yrs.map((y) => cell(y, (d) => d.analytiqueVentile[k])).join("")}</tr>`).join("")}
      <tr class="tot"><td>Total = cotisations</td>${yrs.map((y) => cell(y, (d) => d.besoin)).join("")}</tr></tbody></table></div></div>`;

    // Détail des lignes
    h += `<details class="card"><summary><b>Détail ligne par ligne (scénario)</b></summary><div class="scroll scroll-y" style="margin-top:10px"><table><thead><tr><th>Sens</th><th>Art.</th><th>Libellé</th><th>Service</th>${yrs.map((y) => `<th class="n">${y}</th>`).join("")}</tr></thead><tbody>`;
    const keys = [];
    yrs.forEach((y) => R.scen[y].lignes.forEach((l) => { const k = l.sens + "|" + (l.id || l.lib); if (!keys.find((x) => x.k === k)) keys.push({ k, l }); }));
    keys.forEach(({ k, l }) => {
      h += `<tr><td>${l.sens === "dep" ? "D" : "R"}</td><td>${esc(l.art)}</td><td>${esc(l.lib)}</td><td>${M.CATS[l.cat] ? M.CATS[l.cat].lib : ""}</td>${yrs.map((y) => { const x = R.scen[y].lignes.find((z) => z.sens + "|" + (z.id || z.lib) === k); return `<td class="n">${x ? eur2(x.v) : "–"}</td>`; }).join("")}</tr>`;
    });
    h += `</tbody></table></div></details>`;
    return h;
  }

  /* =====================================================================
     ONGLET : DONNÉES À COMPLÉTER
     ===================================================================== */
  const CHECKS = [
    ["enfants", "Effectifs par commune et par année", "Le budget ne donne aucun effectif. Saisir les enfants scolarisés par commune de résidence (rentrée 2026 et prévisions 2027-2029, ex. à partir des naissances). C'est la moitié de la clé de cotisation.", "communes"],
    ["cle", "Clé de répartition statutaire", "Vérifier dans les statuts / délibérations : 50 % population – 50 % enfants ? Quelle population (municipale ou totale, millésime) ? Quel effectif (rentrée N-1 ou N) ?", "communes"],
    ["transportOrga", "Organisation du transport", "Qui fait quoi : navette méridienne vers la cantine (bus du syndicat ?), ramassage matin/soir (Région Mobigo ? régie ?), sorties, centre de loisirs d'Isle. Indiquer le mode actuel de chaque service.", "transport"],
    ["transportCouts", "Paramètres de coût du transport", "Km par jour, jours de service, consommation, heures de conduite et d'accompagnement, devis autocariste éventuel, âge et valeur du bus.", "transport"],
    ["region", "Participation de la Région", "Pourquoi 44 000 € prévus en 2025, 26 226 € réalisés et 2 300 € en 2026 ? Convention d'AO2 terminée ? Que couvre « RC » ?", "transport"],
    ["personnel", "Postes et temps de travail", "Les 3 agents : fonction (ATSEM, cantine, accompagnement bus, conduite, secrétariat), quotité, statut. Permet de ventiler le personnel par service et d'isoler le coût du transport.", "projection"],
    ["assuranceBus", "Assurance du bus", "La ligne 6168 (3 200 €) contient-elle l'assurance du véhicule ? Si oui, elle est économisée en cas d'abandon de la régie.", "budget"],
    ["remboursements", "Remboursements de tiers (70878 : 9 500 €)", "Ventiler : CC du Serein (bus), bâtiment, Coutarnoux et Marmeaux (élèves hors syndicat ?). Ces recettes peuvent dépendre du mode de transport.", "budget"],
    ["classes", "Évolution du nombre de classes", "Prévisions d'ouverture / fermeture (l'académie). Les fournitures (1 500 €/classe) et les sorties suivent ce nombre.", "projection"],
    ["fdr", "Fonds de roulement", "Montant cible voté (8 054,87 € créés en 2026) et politique pour les années suivantes.", "projection"],
  ];
  function tabACompleter() {
    let h = `<h2>Données à compléter</h2><p class="lead">Ce qui manque au budget pour fiabiliser la simulation. Cochez au fur et à mesure ; l'état est enregistré avec le scénario.</p><div class="card">`;
    CHECKS.forEach(([k, t, d, tab]) => {
      const ok = state.checklist[k];
      h += `<div class="check ${ok ? "done" : ""}">${chkIn(`checklist.${k}`, ok)}<div><span class="t">${t}</span> <a href="#" class="small" data-act="tab" data-arg="${tab}">→ ouvrir</a></div><div class="d">${d}</div></div>`;
    });
    h += `</div><div class="card"><h3>Hypothèses utilisées par défaut</h3><ul class="small" style="margin:0;padding-left:18px;line-height:1.7">
      <li>Populations BANATIC (population totale en vigueur) : Blacy 100, Marmeaux 88, Massangis 339, Montréal 168, Talcy 84, Thizy 192.</li>
      <li>Enfants : ~40 répartis au prorata de la population (≈ 37 demi-pensionnaires déduits des recettes cantine à 4,30 €/repas sur 140 jours).</li>
      <li>2 classes (fournitures scolaires 3 000 € = 1 500 €/classe).</li>
      <li>Indices : inflation 2 %, masse salariale 2,5 % (GVT + revalorisations), carburant 3 %, alimentation 3 %, tarif cantine gelé.</li>
      <li>FCTVA 16,404 % perçu en N+2 ; pas de nouvel investissement après 2026.</li>
      <li>Les recettes et dépenses ponctuelles de 2026 (déficit reporté 105,19 €, IJ 1 100 €) ne se répètent pas.</li></ul></div>`;
    return h;
  }

  /* ---------------- Navigation & rendu ---------------- */
  const TABS = [
    ["synthese", "Synthèse", tabSynthese],
    ["communes", "Communes & cotisations", tabCommunes],
    ["transport", "Transport", tabTransport],
    ["budget", "Budget 2026", tabBudget],
    ["projection", "Projection", tabProjection],
    ["completer", "Données à compléter", tabACompleter],
  ];
  function renderNav() {
    const missing = Object.values(state.checklist).filter((v) => !v).length;
    document.getElementById("tabs").innerHTML = TABS.map(([k, l]) => `<button data-act="tab" data-arg="${k}" class="${ui.tab === k ? "active" : ""}">${l}${k === "completer" && missing ? `<span class="dot" title="${missing} points à vérifier"></span>` : ""}</button>`).join("");
    document.getElementById("scenName").value = state.nomScenario || "";
    const list = savedScenarios();
    document.getElementById("scenList").innerHTML = `<option value="">Scénarios enregistrés (${Object.keys(list).length})</option>` + Object.keys(list).map((k) => `<option value="${esc(k)}">${esc(k)}</option>`).join("") + (Object.keys(list).length ? `<option value="__del__">— Supprimer le scénario courant de la liste</option>` : "");
  }
  function render() {
    renderNav();
    const t = TABS.find((x) => x[0] === ui.tab) || TABS[0];
    document.getElementById("main").innerHTML = t[2]();
  }
  let pending = false;
  function scheduleRender() {
    if (pending) return;
    pending = true;
    setTimeout(() => {
      pending = false;
      const ae = document.activeElement, p = ae && ae.dataset && ae.dataset.p;
      const sx = window.scrollX, sy = window.scrollY;
      render();
      window.scrollTo(sx, sy);
      if (p) { const el = document.querySelector(`[data-p="${CSS.escape(p)}"]`); if (el) { el.focus(); if (el.select) try { el.select(); } catch (e) {} } }
    }, 0);
  }

  /* ---------------- Scénarios enregistrés ---------------- */
  function savedScenarios() { try { return JSON.parse(localStorage.getItem(LS_SCEN)) || {}; } catch (e) { return {}; } }
  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const slug = (s) => String(s || "scenario").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  function exportCsv() {
    const yrs = YEARS(), c = (v) => (typeof v === "number" ? v.toFixed(2).replace(".", ",") : `"${String(v).replace(/"/g, '""')}"`);
    const L = [];
    L.push([`Simulateur SISBMT – ${state.nomScenario}`].map(c).join(";"));
    L.push("");
    L.push(["Cotisations par commune", ...yrs.flatMap((y) => [`${y} réf.`, `${y} scén.`])].map(c).join(";"));
    state.communes.filter((x) => x.statut === "membre" || x.actif).forEach((x) => {
      L.push([x.nom, ...yrs.flatMap((y) => [(R.ref[y].communes.find((z) => z.id === x.id) || {}).cotis || 0, (R.scen[y].communes.find((z) => z.id === x.id) || {}).cotis || 0])].map(c).join(";"));
    });
    L.push(["Total", ...yrs.flatMap((y) => [R.ref[y].besoin, R.scen[y].besoin])].map(c).join(";"));
    L.push("");
    L.push(["Synthèse", ...yrs.flatMap((y) => [`${y} réf.`, `${y} scén.`])].map(c).join(";"));
    [["Dépenses de fonctionnement", "dep"], ["Recettes hors cotisations", "recAutres"], ["Résultat reporté", "report"], ["Excédent visé", "variationFdr"], ["Cotisations", "besoin"], ["Enfants", "enf"], ["Classes", "classes"]].forEach(([l, k]) => L.push([l, ...yrs.flatMap((y) => [R.ref[y][k], R.scen[y][k]])].map(c).join(";")));
    L.push("");
    L.push(["Coût net par service", ...yrs.flatMap((y) => [`${y} réf.`, `${y} scén.`])].map(c).join(";"));
    Object.keys(M.CATS).forEach((k) => L.push([M.CATS[k].lib, ...yrs.flatMap((y) => [R.ref[y].analytiqueVentile[k] || 0, R.scen[y].analytiqueVentile[k] || 0])].map(c).join(";")));
    L.push("");
    L.push(["Sens", "Article", "Libellé", "Service", ...yrs.map((y) => `${y} scén.`)].map(c).join(";"));
    const keys = [];
    yrs.forEach((y) => R.scen[y].lignes.forEach((l) => { const k = l.sens + "|" + (l.id || l.lib); if (!keys.find((x) => x.k === k)) keys.push({ k, l }); }));
    keys.forEach(({ k, l }) => L.push([l.sens === "dep" ? "Dépense" : "Recette", l.art, l.lib, (M.CATS[l.cat] || {}).lib || "", ...yrs.map((y) => { const x = R.scen[y].lignes.find((z) => z.sens + "|" + (z.id || z.lib) === k); return x ? x.v : 0; })].map(c).join(";")));
    download(`sisbmt-${slug(state.nomScenario)}.csv`, "﻿" + L.join("\r\n"), "text/csv;charset=utf-8");
  }

  /* ---------------- Actions ---------------- */
  const uid = (p) => p + Math.random().toString(36).slice(2, 8);
  const ACTIONS = {
    tab: (a) => { ui.tab = a; render(); window.scrollTo(0, 0); },
    year: (a) => { ui.year = +a; render(); },
    trYear: (a) => { ui.trYear = +a; render(); },
    view: (a) => { ui.view = a; render(); },
    goCommune: (a) => { ui.commune = a; ui.tab = "communes"; render(); const d = document.getElementById("detail"); if (d) d.scrollIntoView({ behavior: "smooth" }); },
    addCommune: (a) => {
      const enf = Object.fromEntries(YEARS().map((y) => [y, 0]));
      state.communes.push({ id: uid("c"), nom: a === "membre" ? "Nouvelle commune membre" : "Commune candidate", insee: "", pop: 100, enfants: enf, statut: a, actif: a !== "membre", annee: BASE() + 1, km: {}, ouvreClasse: false, posteSupp: false });
      commit();
    },
    delCommune: (a) => { if (confirm(`Supprimer « ${state.communes[+a].nom} » ?`)) { state.communes.splice(+a, 1); commit(); } },
    toCand: (a) => { const c = state.communes[+a]; if (state.communes.filter((x) => x.statut === "membre").length <= 1) return alert("Il faut au moins une commune membre."); c.statut = "candidate"; c.actif = true; c.annee = c.annee > BASE() ? c.annee : BASE(); commit(); },
    toMembre: (a) => { const c = state.communes[+a]; c.statut = "membre"; c.actif = true; commit(); },
    addService: () => {
      state.transport.push({ id: uid("t"), nom: "Nouveau service", modeActuel: "aucun", modeScenario: "prestataire", anneeEffet: BASE() + 1, prorata: true,
        commun: { jours: 140, km: 20, eleves: 20 }, regie: { conso: 25, prixCarb: 1.8, entretien: 2000, assurance: 1000, hCond: 1, hAcc: 0, coutH: 24, provision: 0, recettes: 0 },
        prestataire: { forfaitJour: 100, prixKm: 0, hAcc: 0, coutH: 24, recettes: 0 }, region: { partEleve: 0, hAcc: 0, coutH: 24, recettes: 0 } });
      commit();
    },
    delService: (a) => { if (confirm("Supprimer ce service de transport ?")) { state.transport.splice(+a, 1); commit(); } },
    addLigne: (a) => {
      const after = state.lignes.map((l) => l.sens).lastIndexOf(a);
      state.lignes.splice(after + 1, 0, { id: uid("l"), sens: a, chap: a === "dep" ? "011" : "70", art: "", lib: "Nouvelle ligne", bp25: 0, real25: 0, montant: 0, cat: "ADM", nature: "fixe", index: "inflation", com: "" });
      commit();
    },
    delLigne: (a) => { if (confirm(`Supprimer la ligne « ${state.lignes[+a].lib} » ?`)) { state.lignes.splice(+a, 1); commit(); } },
    addProjet: () => { state.invest.projets.push({ id: uid("p"), annee: BASE() + 1, lib: "Nouvel investissement", montant: 0, subv: 0, scenarioSeul: false }); commit(); },
    delProjet: (a) => { state.invest.projets.splice(+a, 1); commit(); },
    addAjust: () => { state.ajustements.push({ id: uid("a"), lib: "Nouvel ajustement", sens: "dep", cat: "SCO", montant: 0, de: BASE() + 1, a: YEARS()[YEARS().length - 1], index: "inflation", portee: "scenario" }); commit(); },
    delAjust: (a) => { state.ajustements.splice(+a, 1); commit(); },
    saveScen: () => {
      const name = (document.getElementById("scenName").value || "").trim() || "Scénario";
      state.nomScenario = name;
      const all = savedScenarios(); all[name] = clone(state);
      localStorage.setItem(LS_SCEN, JSON.stringify(all)); save(); renderNav();
      toast(`Scénario « ${name} » enregistré dans ce navigateur.`);
    },
    exportJson: () => download(`sisbmt-${slug(state.nomScenario)}.json`, JSON.stringify(state, null, 2), "application/json"),
    importJson: () => document.getElementById("fileIn").click(),
    exportCsv,
    print: () => window.print(),
    reset: () => { if (confirm("Revenir aux données d'origine du budget 2026 ? Le scénario en cours sera remplacé (les scénarios enregistrés sont conservés).")) { state = clone(window.DEFAULT_STATE); state.nomScenario = "Scénario 1"; commit(); } },
  };

  function toast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    Object.assign(t.style, { position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)", background: "#1d2433", color: "#fff", padding: "10px 16px", borderRadius: "8px", fontSize: ".9rem", zIndex: 99 });
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }

  /* ---------------- Événements ---------------- */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    e.preventDefault();
    const f = ACTIONS[el.dataset.act];
    if (f) f(el.dataset.arg);
  });
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.ui === "commune") { ui.commune = el.value; render(); return; }
    if (el.id === "scenName") { state.nomScenario = el.value; save(); return; }
    if (el.id === "scenList") {
      const v = el.value;
      if (v === "__del__") {
        const all = savedScenarios();
        if (all[state.nomScenario] && confirm(`Retirer « ${state.nomScenario} » de la liste ?`)) { delete all[state.nomScenario]; localStorage.setItem(LS_SCEN, JSON.stringify(all)); }
        renderNav(); return;
      }
      if (v) { const all = savedScenarios(); if (all[v]) { state = clone(all[v]); commit(); toast(`Scénario « ${v} » chargé.`); } }
      return;
    }
    if (el.id === "fileIn") {
      const f = el.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const s = JSON.parse(rd.result);
          if (!s.lignes || !s.communes) throw new Error("format");
          state = s; commit(); toast("Scénario importé.");
        } catch (err) { alert("Fichier non reconnu : il doit s'agir d'un export JSON du simulateur."); }
      };
      rd.readAsText(f); el.value = "";
      return;
    }
    const p = el.dataset.p;
    if (!p) return;
    const t = el.dataset.t;
    let v = t === "n" ? parseNum(el.value) : t === "b" ? el.checked : el.value;
    setPath(p, v);
    if (p === "cle.pop") state.cle.enf = Math.round((100 - v) * 100) / 100;
    if (p === "cle.enf") state.cle.pop = Math.round((100 - v) * 100) / 100;
    // Une commune candidate qui adhère en N garde ses effectifs ; rien d'autre à faire.
    commit();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("input.num, input.txt")) e.target.blur();
  });

  render();
})();
