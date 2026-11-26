/* =====================================================================
   Interface du simulateur (vanilla JS, aucune dépendance)
   Onglets : Synthèse · Communes & cotisations · un onglet par année ·
   (les postes du personnel sont dans « Communes & cotisations »)
   ===================================================================== */
(function () {
  const M = window.Model;
  const LS_KEY = "sisbmt-simulateur-v1";
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------------- État ---------------- */
  let migre = false;
  // Mise à niveau d'une sauvegarde v5 (conserve les saisies) : ajout des postes
  function migrer(s) {
    if (s && s.version === 5) {
      s.postes = clone(window.DEFAULT_STATE.postes);
      if (s.hyp) delete s.hyp.cleCalculPersonnel;
      s.version = 6;
    }
    if (s && s.version === 6) {
      const def = window.DEFAULT_STATE.communes;
      (s.communes || []).forEach((c) => {
        const d = def.find((x) => x.id === c.id || x.nom === c.nom);
        if (c.budgetCommune == null) { c.budgetCommune = d ? d.budgetCommune : Math.round((+c.pop || 0) * 1000); c.budgetSource = d ? d.budgetSource : "Estimation : 1 000 €/hab."; }
      });
      s.version = 7;
    }
    if (s && s.version === 7) {
      // Remplace les communes hors membre provisoires par Angely, Coutarnoux, Guillon
      if (!Array.isArray(s.horsMembres) || s.horsMembres.every((h) => /^Commune hors membre/.test(h.nom))) s.horsMembres = clone(window.DEFAULT_STATE.horsMembres);
      s.version = 8;
    }
    if (s && s.version === 8) {
      // Prix du repas mis à jour (achat 4,05 €, vente 5 €) pour 2027-2029, si non modifiés
      const def = window.DEFAULT_STATE.lignes;
      ["d6288", "r7067"].forEach((id) => {
        const l = (s.lignes || []).find((x) => x.id === id), d = def.find((x) => x.id === id);
        if (!l || !d) return;
        [2027, 2028, 2029].forEach((y) => { if (l.montants && +l.montants[y] === +l.montant) l.montants[y] = d.montants[y]; });
        l.com = d.com;
      });
      s.version = 9;
    }
    if (s && s.version === 9) {
      // Conductrice : 30 min de conduite par jour, le reste en classe / cantine
      const ps = s.postes || [];
      const i = ps.findIndex((p) => p.id === "p2" && p.cat === "TRA" && +p.heures === 15);
      if (i >= 0) ps.splice(i, 1, ...clone(window.DEFAULT_STATE.postes.filter((p) => ["p2", "p5", "p6"].includes(p.id))));
      s.version = 10;
    }
    return s;
  }
  function load() {
    try {
      const s = migrer(JSON.parse(localStorage.getItem(LS_KEY)));
      if (s && s.version === window.DEFAULT_STATE.version) return s;
      if (s) migre = true;
    } catch (e) {}
    return clone(window.DEFAULT_STATE);
  }
  let state = load();
  let R = M.compute(state);
  const YEARS = () => state.meta.years;
  const BASE = () => state.meta.baseYear;
  const ui = { tab: "synthese", ceYear: BASE() + 1, ceTab: "moy", year: BASE() + 1, commune: (state.communes[0] || {}).id, matrice: "eur", hausse: 2 };

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
  const dpctTxt = (a, b) => {
    if (!b || Math.abs(a - b) < 0.5) return `<span class="muted">=</span>`;
    const v = (a - b) / Math.abs(b);
    return `<span class="${v > 0 ? "up" : "down"}">${v > 0 ? "+" : "−"}${nfp.format(Math.abs(v) * 100)} %</span>`;
  };
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
  const catOpts = () => Object.fromEntries(Object.entries(M.CATS).filter(([k]) => k !== "FDR" && k !== "HORS").map(([k, c]) => [k, c.lib]));
  const yearSeg = (cur, act = "year") => `<div class="seg">${YEARS().map((yy) => `<button data-act="${act}" data-arg="${yy}" class="${yy === cur ? "on" : ""}">${yy}</button>`).join("")}</div>`;

  function setPath(p, v) {
    const ks = p.split("."); let o = state;
    for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = v;
  }

  /* ---------------- Graphiques SVG ---------------- */
  function bars(labels, values, color = "#1f4e79", H = 220) {
    const colorOf = (i) => (Array.isArray(color) ? color[i] : color);
    const W = 640, pl = 64, pr = 10, pt = 22, pb = 30;
    const max = Math.max(1, ...values) * 1.12;
    const gw = (W - pl - pr) / labels.length, bw = Math.min(70, gw * 0.55);
    const y = (v) => pt + (H - pt - pb) * (1 - v / max);
    let g = "";
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i, yy = y(v);
      g += `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" stroke="#eceae3"/><text x="${pl - 6}" y="${yy + 4}" font-size="10" text-anchor="end" fill="#888">${nf0.format(Math.round(v / 1000))} k€</text>`;
    }
    labels.forEach((lab, i) => {
      const v = values[i], x = pl + gw * i + (gw - bw) / 2, yy = y(Math.max(0, v));
      g += `<rect x="${x}" y="${yy}" width="${bw}" height="${Math.max(0, H - pb - yy)}" fill="${colorOf(i)}" rx="2"><title>${lab} : ${eur(v)}</title></rect>`;
      g += `<text x="${x + bw / 2}" y="${yy - 6}" font-size="11" font-weight="600" text-anchor="middle" fill="#333">${eur(v)}</text>`;
      g += `<text x="${x + bw / 2}" y="${H - 10}" font-size="11" text-anchor="middle" fill="#444">${lab}</text>`;
    });
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">${g}</svg></div>`;
  }
  function lineChart(labels, series, H = 240) {
    const W = 640, pl = 64, pr = 150, pt = 14, pb = 28;
    const max = Math.max(1, ...series.flatMap((s) => s.values)) * 1.08;
    const x = (i) => pl + ((W - pl - pr) * i) / Math.max(1, labels.length - 1);
    const y = (v) => pt + (H - pt - pb) * (1 - v / max);
    let g = "";
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i, yy = y(v);
      g += `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" stroke="#eceae3"/><text x="${pl - 6}" y="${yy + 4}" font-size="10" text-anchor="end" fill="#888">${nf0.format(Math.round(v / 1000))} k€</text>`;
    }
    labels.forEach((l, i) => (g += `<text x="${x(i)}" y="${H - 8}" font-size="11" text-anchor="middle" fill="#444">${l}</text>`));
    const lastY = [];
    series.forEach((s) => {
      g += `<polyline fill="none" stroke="${s.color}" stroke-width="2" points="${s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}"/>`;
      s.values.forEach((v, i) => (g += `<circle cx="${x(i)}" cy="${y(v)}" r="2.6" fill="${s.color}"><title>${esc(s.name)} ${labels[i]} : ${eur(v)}</title></circle>`));
      let ly = y(s.values[s.values.length - 1]) + 4;
      while (lastY.some((p) => Math.abs(p - ly) < 11)) ly += 11;
      lastY.push(ly);
      const nm = s.name.length > 24 ? s.name.slice(0, 23) + "…" : s.name;
      g += `<text x="${W - pr + 6}" y="${ly}" font-size="10.5" fill="${s.color}">${esc(nm)}</text>`;
    });
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">${g}</svg></div>`;
  }
  const PALETTE = ["#1f4e79", "#d08a2c", "#3c9a74", "#8a6bb8", "#c4566b", "#2f9bb3", "#a3a03a", "#6b7a8f", "#d4663a", "#5a8f29"];
  function hbars(an) {
    const rows = Object.entries(an).filter(([, v]) => Math.abs(v) > 0.5).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...rows.map(([, v]) => Math.abs(v)));
    return `<div class="hbars">${rows.map(([k, v]) => `<div class="row"><div><span class="sw" style="background:${M.CATS[k].color}"></span>${M.CATS[k].lib}</div><div class="track"><div class="fill" style="width:${(Math.abs(v) / max) * 100}%;background:${M.CATS[k].color};opacity:${v < 0 ? 0.4 : 1}"></div></div><div class="n" style="text-align:right">${eur(v)}</div></div>`).join("")}</div>`;
  }
  // Camembert (anneau) : slices = [{ label, value, color }] (valeurs positives)
  function donut(slices, opt = {}) {
    const S = opt.size || 170, r = S / 2 - 4, ri = r * (opt.inner ?? 0.6), cx = S / 2, cy = S / 2;
    const pos = slices.filter((s) => s.value > 0.5);
    const tot = pos.reduce((a, s) => a + s.value, 0) || 1;
    let a0 = -Math.PI / 2, g = "";
    const pt = (rad, a) => `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
    pos.forEach((s) => {
      const f = s.value / tot, a1 = a0 + f * 2 * Math.PI;
      if (f > 0.9999) {
        g += `<circle cx="${cx}" cy="${cy}" r="${(r + ri) / 2}" fill="none" stroke="${s.color}" stroke-width="${r - ri}"><title>${esc(s.label)} : ${eur(s.value)}</title></circle>`;
      } else {
        const large = f > 0.5 ? 1 : 0;
        g += `<path d="M${pt(r, a0)} A${r},${r} 0 ${large} 1 ${pt(r, a1)} L${pt(ri, a1)} A${ri},${ri} 0 ${large} 0 ${pt(ri, a0)} Z" fill="${s.color}" stroke="#fff" stroke-width="1.5"><title>${esc(s.label)} : ${eur(s.value)} (${pct(f)})</title></path>`;
        if (opt.labels !== false && f >= 0.07) {
          const am = (a0 + a1) / 2, rm = (r + ri) / 2;
          g += `<text x="${cx + rm * Math.cos(am)}" y="${cy + rm * Math.sin(am) + 3.5}" font-size="${S > 200 ? 11 : 9.5}" font-weight="600" text-anchor="middle" fill="#fff">${Math.round(f * 100)} %</text>`;
        }
      }
      a0 = a1;
    });
    if (opt.center) g += `<text x="${cx}" y="${cy + (opt.sub ? -1 : 5)}" font-size="${S > 200 ? 20 : 15}" font-weight="700" text-anchor="middle" fill="#1d2433">${opt.center}</text>`;
    if (opt.sub) g += `<text x="${cx}" y="${cy + 15}" font-size="${S > 200 ? 11 : 9.5}" text-anchor="middle" fill="#6b7280">${opt.sub}</text>`;
    return `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" style="max-width:100%">${g}</svg>`;
  }
  const legend = (slices, fmt = eur) => {
    const tot = slices.filter((s) => s.value > 0.5).reduce((a, s) => a + s.value, 0) || 1;
    return `<div class="pie-legend">${slices.filter((s) => s.value > 0.5).map((s) => `<div><span class="sw" style="background:${s.color}"></span>${esc(s.label)}<b>${fmt(s.value)}</b><span class="muted">${pct(s.value / tot)}</span></div>`).join("")}</div>`;
  };

  const membres = () => state.communes.filter((c) => c.statut === "membre");
  // Poids de la cotisation dans le budget de fonctionnement de la commune
  const poids = (y, c) => (+c.budgetCommune > 0 ? cotisDe(y, c.id) / +c.budgetCommune : null);
  const poidsTxt = (v) => (v == null ? "–" : `<span style="color:${v >= 0.15 ? "#b4232f" : v >= 0.08 ? "#b8660b" : "inherit"}">${pct(v)}</span>`);
  const cotisDe = (y, id) => (R[y].communes.find((x) => x.id === id) || {}).cotis || 0;

  /* =====================================================================
     SYNTHÈSE
     ===================================================================== */
  function tabSynthese() {
    const yrs = YEARS(), H = state.meta.histYear, ALL = H ? [H, ...yrs] : yrs;
    const first = ALL[0], last = ALL[ALL.length - 1];
    const estime = H && R[H].communes.some((c) => c.estime);
    const lib = (y) => (y === H ? `${y} <span class="small muted">(BP)</span>` : y === BASE() ? `${y} <span class="small muted">(budget)</span>` : `${y} <span class="small muted">(projection)</span>`);
    let h = `<h2>Synthèse ${first}–${last}</h2>
    <p class="lead">Évolution des cotisations des communes membres : ${H ? `${H} (budget primitif), ` : ""}${BASE()} (budget) et la projection ${yrs[1]}–${last}. Les montants de chaque année se modifient dans les onglets ${yrs.join(", ")} ; les effectifs et la clé dans « Communes & cotisations ».</p>`;

    h += `<div class="kpis">${ALL.map((y, i) => `<div class="kpi"><div class="l">Cotisations ${y}${y === H ? " (BP)" : y > BASE() ? " (projection)" : ""}</div><div class="v">${eur(R[y].besoin)}</div><div class="d">${i ? `${delta(R[y].besoin - R[ALL[i - 1]].besoin)} (${dpctTxt(R[y].besoin, R[ALL[i - 1]].besoin)}) vs ${ALL[i - 1]}` : "budget primitif " + y}</div></div>`).join("")}</div>`;

    const colors = ALL.map((y) => (y === H ? "#9aa5b4" : y === BASE() ? "#b4232f" : "#1f4e79"));
    h += `<div class="grid g2">
      <div class="card"><h3>Cotisations totales par année</h3>${bars(ALL, ALL.map((y) => R[y].besoin), colors)}
        <div class="legend" style="margin-top:6px"><span><span class="sw" style="background:#9aa5b4"></span>${H || ""} budget primitif</span><span><span class="sw" style="background:#b4232f"></span>${BASE()} budget</span><span><span class="sw" style="background:#1f4e79"></span>projection</span></div></div>
      <div class="card"><h3>Cotisation par commune</h3>${lineChart(ALL, membres().map((c, i) => ({ name: c.nom, color: PALETTE[i % PALETTE.length], values: ALL.map((y) => cotisDe(y, c.id)) })))}
        ${estime ? `<p class="small muted">${H} par commune : estimation (clé actuelle, effectifs ${BASE()}) – saisissez les montants réels dans « Communes & cotisations ».</p>` : ""}</div></div>`;

    if (H) h += hausseCard(H, BASE());

    // Évolution de la cotisation par commune
    h += `<div class="card"><h3>Évolution de la cotisation par commune</h3><div class="scroll"><table><thead><tr><th>Commune</th>${ALL.map((y, i) => `<th class="n">${lib(y)}</th>${i ? `<th class="n">Évol. ${ALL[i - 1]}→${y}</th>` : ""}`).join("")}<th class="n">${BASE()}→${last}</th></tr></thead><tbody>`;
    const row = (label, f, cls = "", est) => `<tr class="${cls}"><td>${label}</td>${ALL.map((y, i) => `<td class="n"><b class="${y === H && est ? "histo" : ""}">${eur(f(y))}</b>${y === H && est ? "*" : ""}</td>${i ? `<td class="n small">${delta(f(y) - f(ALL[i - 1]))} · ${dpctTxt(f(y), f(ALL[i - 1]))}</td>` : ""}`).join("")}<td class="n">${dpctTxt(f(last), f(BASE()))}</td></tr>`;
    membres().forEach((c) => {
      const est = H && (R[H].communes.find((x) => x.id === c.id) || {}).estime;
      h += row(`<a href="#" data-act="goCommune" data-arg="${c.id}">${esc(c.nom)}</a>`, (y) => cotisDe(y, c.id), "", est);
    });
    h += row("Total", (y) => R[y].besoin, "tot");
    h += `</tbody></table></div>${estime ? `<p class="small muted">* ${H} : répartition estimée avec la clé et les effectifs actuels (total exact : ${eur(R[H].besoin)}). À remplacer par les montants réellement appelés.</p>` : ""}</div>`;

    // Poids dans le budget communal
    h += `<div class="card"><h3>Poids de la cotisation dans le budget de chaque commune</h3><div class="scroll"><table><thead><tr><th>Commune</th><th class="n">Budget de fonctionnement</th>${ALL.map((y) => `<th class="n">${y}</th>`).join("")}<th class="n">Évol. ${first}→${last}</th></tr></thead><tbody>
      ${membres().map((c) => `<tr><td>${esc(c.nom)}</td><td class="n">${eur(+c.budgetCommune)} <span class="small muted" title="${esc(c.budgetSource || "")}">${/estim/i.test(c.budgetSource || "") ? "(estim.)" : /2017/.test(c.budgetSource || "") ? "(2017)" : ""}</span></td>${ALL.map((y) => `<td class="n">${poidsTxt(poids(y, c))}</td>`).join("")}<td class="n">${poids(first, c) != null ? `${(poids(last, c) - poids(first, c)) >= 0 ? "+" : "−"}${nfp.format(Math.abs(poids(last, c) - poids(first, c)) * 100)} pt` : "–"}</td></tr>`).join("")}
      </tbody></table></div><p class="small muted">Cotisation au syndicat ÷ produits de fonctionnement annuels de la commune (budget constant sur la période). Budgets : recettes réelles de fonctionnement des CFU 2025. En orange au-delà de 8 %, en rouge au-delà de 15 %.</p></div>`;

    // Par enfant
    h += `<div class="card"><h3>Cotisation par enfant scolarisé</h3><div class="scroll"><table><thead><tr><th>Commune</th>${yrs.map((y) => `<th class="n">${y}</th>`).join("")}</tr></thead><tbody>
      ${membres().map((c) => `<tr><td>${esc(c.nom)}</td>${yrs.map((y) => { const x = R[y].communes.find((z) => z.id === c.id); return `<td class="n">${x && x.enf ? eur(x.cotis / x.enf) : "–"} <span class="small muted">(${x ? x.enf : 0} enf.)</span></td>`; }).join("")}</tr>`).join("")}
      <tr class="sub"><td>Cotisation moyenne par enfant des communes membres</td>${yrs.map((y) => `<td class="n">${eur(R[y].besoin / (R[y].enf || 1))}</td>`).join("")}</tr>
      <tr class="sub"><td>Coût net moyen d'un enfant accueilli</td>${yrs.map((y) => `<td class="n">${eur(R[y].coutNetEnfant)}</td>`).join("")}</tr>
      </tbody></table></div></div>`;

    // Équilibre
    h += `<div class="grid g2"><div class="card"><h3>Ce qui détermine les cotisations</h3><div class="scroll"><table><thead><tr><th></th>${ALL.map((y) => `<th class="n">${y}</th>`).join("")}</tr></thead><tbody>
      <tr><td>Dépenses de fonctionnement</td>${ALL.map((y) => `<td class="n">${eur(R[y].dep)}</td>`).join("")}</tr>
      <tr><td>− Recettes (hors cotisations des membres)</td>${ALL.map((y) => `<td class="n">${eur(R[y].recAutres)}</td>`).join("")}</tr>
      <tr><td>− Résultat reporté</td>${ALL.map((y) => `<td class="n">${eur(R[y].report)}</td>`).join("")}</tr>
      <tr><td>+ Excédent / fonds de roulement visé</td>${ALL.map((y) => `<td class="n">${eur(R[y].fdr)}</td>`).join("")}</tr>
      <tr class="tot"><td>= Cotisations des membres</td>${ALL.map((y) => `<td class="n">${eur(R[y].besoin)}</td>`).join("")}</tr>
      </tbody></table></div>
      <p class="small muted">${BASE()} comprend des montants ponctuels (déficit reporté, virement à l'investissement, indemnités journalières) et la création d'un fonds de roulement de ${eur(R[BASE()].variationFdr)}.</p></div>
      <div class="card"><h3>À quoi servent les cotisations ? (${BASE() + 1})</h3>${pieServices(R[BASE() + 1], 1, "par an")}</div></div>`;
    return h;
  }

  // D'où vient la hausse entre l'année passée (BP) et l'année de base
  function hausseCard(H, B) {
    const a = R[H], b = R[B];
    const L = state.lignes;
    const bpSum = (f) => L.filter(f).reduce((s, l) => s + (+l.bp25 || 0), 0);
    const mtSum = (f) => L.filter(f).reduce((s, l) => s + (+((l.montants || {})[B] ?? l.montant) || 0), 0);
    const dLines = (f) => mtSum(f) - bpSum(f);
    const reg = (l) => l.id === "r7472";
    // Transport : Région + carburant / entretien du bus (service Transport) + personnel contractuel (64131, 6454)
    const trDep = (l) => l.sens === "dep" && l.cat === "TRA";
    const contract = (l) => l.sens === "dep" && ["64131", "6454"].includes(l.art);
    const dReg = -dLines(reg), dTrDep = dLines(trDep), dContr = dLines(contract);
    const items = [
      ["Transport : baisse de la Région, en partie compensée", dReg + dTrDep + dContr,
        `Région ${delta(dReg)} · carburant et entretien du bus ${delta(dTrDep)} · personnel contractuel (64131, 6454) ${delta(dContr)}`],
      ["Fin du résultat reporté de 2024", a.report - b.report, `${eur(a.report)} de report avaient réduit les cotisations ${H}`],
      ["Autres recettes (cantine, remboursements…)", -dLines((l) => l.sens === "rec" && !l.nature && !reg(l)) - dLines((l) => l.sens === "rec" && l.nature === "ponctuel"), ""],
      ["Autres charges de personnel", dLines((l) => l.sens === "dep" && l.chap === "012" && !contract(l)), ""],
      ["Autres dépenses", dLines((l) => l.sens === "dep" && l.chap !== "012" && !trDep(l)), ""],
      ["Excédent / fonds de roulement visé", b.fdr - a.fdr, `${eur(a.fdr)} en ${H} → ${eur(b.fdr)} en ${B}`],
    ];
    const reste = b.besoin - a.besoin - items.reduce((s, x) => s + x[1], 0);
    if (Math.abs(reste) > 0.5) items.push(["Autres (communes hors membre…)", reste, ""]);
    const tot = items.reduce((s, x) => s + x[1], 0);
    const max = Math.max(...items.map((x) => Math.abs(x[1])), 1);
    return `<div class="card"><h3>D'où vient la hausse de ${H} à ${B} ? <span class="muted" style="font-weight:400">(${delta(b.besoin - a.besoin)}, ${dpctTxt(b.besoin, a.besoin)})</span></h3>
      <table style="max-width:960px"><tbody>
      <tr class="sub"><td>Cotisations ${H} (BP)</td><td></td><td class="n">${eur(a.besoin)}</td><td></td></tr>
      ${items.map(([l, v, c]) => `<tr><td>${l}${c ? `<div class="small muted">${c}</div>` : ""}</td><td style="width:34%"><div class="track" style="height:12px;background:#f0eee8;border-radius:3px;position:relative"><div style="position:absolute;${v >= 0 ? "left:50%" : "right:50%"};width:${(Math.abs(v) / max) * 50}%;height:100%;background:${v >= 0 ? "#b4232f" : "#2a7a4f"};border-radius:3px"></div></div></td><td class="n">${delta(v)}</td><td></td></tr>`).join("")}
      <tr class="tot"><td>Cotisations ${B}</td><td></td><td class="n">${eur(a.besoin + tot)}</td><td></td></tr></tbody></table>
      <p class="small muted">En rouge ce qui fait monter les cotisations, en vert ce qui les fait baisser. Comparaison BP ${H} / budget ${B}.</p></div>`;
  }

  // Camembert du coût net par service (div = diviseur, ex. nombre d'enfants)
  // Camembert par service à partir d'une table { catégorie: montant }.
  // Les services négatifs (recettes > dépenses) sont listés en déduction ; total au centre = somme.
  function pieMap(map, div, unite, exclude = ["FDR", "HORS"], note = "") {
    const ent = Object.entries(map).filter(([k, v]) => Math.abs(v) > 0.5 && !exclude.includes(k)).sort((a, b) => b[1] - a[1]);
    const slices = ent.filter(([, v]) => v > 0).map(([k, v]) => ({ label: M.CATS[k].lib, value: v / div, color: M.CATS[k].color }));
    const neg = ent.filter(([, v]) => v < 0);
    const tot = ent.reduce((s, [, v]) => s + v / div, 0);
    const why = { RES: "recettes cantine > coût des repas", ADM: "remboursements de tiers > frais d'administration", TRA: "participation Région > frais de transport", HORS: "payé par les communes hors membre", FDR: "utilisation de l'excédent des années précédentes" };
    const negHtml = neg.length ? `<div class="pie-legend" style="margin-top:6px;border-top:1px dashed var(--line);padding-top:6px">${neg.map(([k, v]) => `<div><span class="sw" style="background:transparent;border:1px solid ${M.CATS[k].color}"></span>${M.CATS[k].lib} <span class="small muted">(${why[k] || "recettes > dépenses"})</span><b class="down">${eur(v / div)}</b><span></span></div>`).join("")}<div><span></span><b style="text-align:left">Total</b><b>${eur(tot)}</b><span></span></div></div>` : "";
    return `<div class="pie-main">${donut(slices, { size: 240, center: eur(tot), sub: unite })}<div>${legend(slices)}${negHtml}</div></div>${note ? `<p class="small muted">${note}</p>` : ""}`;
  }
  function pieServices(d, div, unite) {
    return pieMap(d.analytiqueVentile, div, unite, ["FDR", "HORS"], "Coût net de chaque service (dépenses − recettes propres), personnel réparti selon les heures des postes. Hors fonds de roulement et participations des communes hors membre.");
  }



  /* =====================================================================
     COMMUNES & COTISATIONS
     ===================================================================== */
  function tabCommunes() {
    let h = `<h2>Communes & cotisations</h2>
    <p class="lead">Les cotisations couvrent le <b>besoin de financement</b> du syndicat (dépenses − recettes − résultat reporté + fonds de roulement visé). Elles sont réparties entre les communes membres selon une clé population / enfants scolarisés.</p>`;
    h += `<div class="note"><b>Effectifs ${BASE()} : 31 enfants des communes membres + 8 enfants de communes hors membre</b> (Angely 2, Coutarnoux 2, Guillon 4). Les années suivantes (surlignées) reprennent ${BASE()} : ajustez-les. Populations : BANATIC (971 hab.).</div>`;
    h += `<div class="card"><h3>Clé de répartition</h3><div class="bar">
      <label class="inl">Part population ${numIn("cle.pop", state.cle.pop, "s", 1)} %</label>
      <label class="inl">Part enfants scolarisés ${numIn("cle.enf", state.cle.enf, "s", 1)} %</label>
      <span class="small muted">(les deux parts totalisent toujours 100 %)</span></div></div>`;
    h += `<div class="card"><h3>Communes et effectifs</h3>${effectifsTable()}
      <div class="bar" style="margin:10px 0 0"><button class="btn" data-act="addCommune">+ Ajouter une commune membre</button>
      <button class="btn" data-act="addHors">+ Ajouter une commune hors membre</button></div></div>`;
    {
      const ALL = state.meta.histYear ? [state.meta.histYear, ...YEARS()] : YEARS();
      h += `<div class="card"><h3>Budget des communes et poids de la cotisation</h3><p class="small muted" style="margin-top:-4px">Recettes réelles de fonctionnement de chaque commune (budget principal, hors résultat reporté), d'après les CFU 2025. Budget supposé constant de 2025 à 2029.</p>
        <div class="scroll"><table><thead><tr><th>Commune</th><th class="n">Budget de fonctionnement (€)</th><th>Source</th>${ALL.map((y) => `<th class="n">${y}</th>`).join("")}</tr></thead><tbody>
        ${state.communes.map((c, i) => c.statut !== "membre" ? "" : `<tr><td>${esc(c.nom)}</td><td class="n">${numIn(`communes.${i}.budgetCommune`, c.budgetCommune, /estim|2017/i.test(c.budgetSource || "") ? "est" : "", 0)}</td><td style="min-width:240px">${txtIn(`communes.${i}.budgetSource`, c.budgetSource)}</td>${ALL.map((y) => `<td class="n">${poidsTxt(poids(y, c))}</td>`).join("")}</tr>`).join("")}
        </tbody></table></div></div>`;
    }
    const H = state.meta.histYear;
    if (H) {
      h += `<div class="card"><h3>Cotisations ${H} réellement appelées</h3><p class="small muted" style="margin-top:-4px">Pour comparer avec ${H} dans la synthèse. Laissez vide pour utiliser une estimation (clé actuelle × total ${H} de ${eur(R[H].besoin)}).</p>
        <table style="max-width:560px"><thead><tr><th>Commune</th><th class="n">Montant ${H} (€)</th><th class="n">Estimation</th></tr></thead><tbody>
        ${state.communes.map((c, i) => c.statut !== "membre" ? "" : `<tr><td>${esc(c.nom)}</td><td class="n"><input class="num" inputmode="decimal" data-p="communes.${i}.cotis2025" data-t="n" data-vide="null" value="${c.cotis2025 == null || c.cotis2025 === "" ? "" : fmtIn(c.cotis2025)}" placeholder="—"></td><td class="n muted">${eur(R[H].besoin * ((R[H].communes.find((x) => x.id === c.id) || {}).share || 0))}</td></tr>`).join("")}
        <tr class="tot"><td>Total</td><td class="n">${eur(R[H].communes.reduce((s, c) => s + c.cotis, 0))}</td><td class="n">${eur(R[H].besoin)}</td></tr></tbody></table></div>`;
    }
    h += postesCard();
    h += coutParEnfant();
    h += detailCommune();
    return h;
  }

  // Modifier l'année de base ou « Évol./an » recalcule les années suivantes :
  // enfants(N) = enfants(base) + évol × (N − base). Chaque année reste modifiable ensuite.
  function effectifsTable() {
    const yrs = YEARS(), nxt = yrs.slice(1);
    const est = (y) => (y === BASE() ? "s" : "s est");
    const ncol = 5 + nxt.length + 1;
    let h = `<p class="small muted" style="margin-top:-4px">Saisissez les effectifs ${BASE()} puis une <b>évolution par an</b> (ex. +1, −2) pour projeter ${nxt[0]}–${nxt[nxt.length - 1]} d'un coup ; corrigez ensuite chaque année si besoin (modifier ${BASE()} ou l'évolution recalcule les années suivantes).</p>
      <div class="scroll"><table><thead><tr><th>Commune</th><th>INSEE</th><th class="n">Population</th><th class="n">Enfants ${BASE()}</th><th class="n" title="Enfants en plus ou en moins chaque année">Évol./an</th>${nxt.map((y) => `<th class="n">Enfants ${y}</th>`).join("")}<th></th></tr></thead><tbody>`;
    state.communes.forEach((c, i) => {
      if (c.statut !== "membre") return;
      h += `<tr><td>${txtIn(`communes.${i}.nom`, c.nom)}</td><td style="width:80px">${txtIn(`communes.${i}.insee`, c.insee)}</td><td class="n">${numIn(`communes.${i}.pop`, c.pop, "", 0)}</td>
        <td class="n">${numIn(`communes.${i}.enfants.${BASE()}`, c.enfants[BASE()], "s", 0)}</td><td class="n">${numIn(`communes.${i}.tendance`, c.tendance || 0, "s", 1)}</td>
        ${nxt.map((y) => `<td class="n">${numIn(`communes.${i}.enfants.${y}`, c.enfants[y], est(y), 0)}</td>`).join("")}
        <td><button class="btn small danger" data-act="delCommune" data-arg="${i}" title="Supprimer">✕</button></td></tr>`;
    });
    const mem = membres(), hl = state.horsMembres || [];
    const sumMem = (y) => mem.reduce((s, c) => s + (+c.enfants[y] || 0), 0);
    const sumHors = (y) => hl.reduce((s, c) => s + (+c.enfants[y] || 0), 0);
    h += `<tr class="sub"><td>Total communes membres</td><td></td><td class="n">${nf0.format(mem.reduce((s, c) => s + +c.pop, 0))}</td><td class="n">${nf0.format(sumMem(BASE()))}</td><td></td>${nxt.map((y) => `<td class="n">${nf0.format(sumMem(y))}</td>`).join("")}<td></td></tr>`;

    h += `<tr class="grp"><td colspan="${ncol}">Communes hors membre <span style="font-weight:400">– leurs enfants comptent dans les dépenses mais pas dans la clé ; si « facturée », la commune paie la participation par enfant</span></td></tr>`;
    hl.forEach((c, i) => {
      h += `<tr><td>${txtIn(`horsMembres.${i}.nom`, c.nom)}</td><td colspan="2"><label class="inl">${chkIn(`horsMembres.${i}.facturee`, c.facturee)} facturée</label></td>
        <td class="n">${numIn(`horsMembres.${i}.enfants.${BASE()}`, c.enfants[BASE()], "s", 0)}</td><td class="n">${numIn(`horsMembres.${i}.tendance`, c.tendance || 0, "s", 1)}</td>
        ${nxt.map((y) => `<td class="n">${numIn(`horsMembres.${i}.enfants.${y}`, c.enfants[y], est(y), 0)}</td>`).join("")}
        <td><button class="btn small danger" data-act="delHors" data-arg="${i}" title="Supprimer">✕</button></td></tr>`;
    });
    if (!hl.length) h += `<tr><td colspan="${ncol}" class="muted small">Aucune commune hors membre.</td></tr>`;
    const tarif = state.hyp.tarifHors || {};
    h += `<tr><td colspan="3" class="small">Participation par enfant facturé (€)</td>${yrs.map((y, j) => `<td class="n">${numIn(`hyp.tarifHors.${y}`, tarif[y] || 0, "s", 0)}</td>${j === 0 ? "<td></td>" : ""}`).join("")}<td></td></tr>`;
    h += `<tr class="sub"><td colspan="3">Total hors membre <span class="small muted">· recette encaissée</span></td>${yrs.map((y, j) => `<td class="n">${nf0.format(sumHors(y))} <span class="small muted">· ${eur(R[y].recHors)}</span></td>${j === 0 ? "<td></td>" : ""}`).join("")}<td></td></tr>`;
    h += `<tr class="tot"><td colspan="3">Total enfants accueillis</td><td class="n">${nf0.format(sumMem(BASE()) + sumHors(BASE()))}</td><td></td>${nxt.map((y) => `<td class="n">${nf0.format(sumMem(y) + sumHors(y))}</td>`).join("")}<td></td></tr>`;
    return h + `</tbody></table></div>`;
  }
  function projeterEffectifs(obj, tendance) {
    const b = +obj[BASE()] || 0;
    YEARS().forEach((y) => { if (y > BASE()) obj[y] = Math.max(0, Math.round(b + (+tendance || 0) * (y - BASE()))); });
  }

  function coutParEnfant() {
    const H = state.meta.histYear, ALL = H ? [H, ...YEARS()] : YEARS();
    if (!ALL.includes(ui.ceYear)) ui.ceYear = BASE() + 1;
    const y = ui.ceYear, d = R[y], moy = d.coutNetEnfant;
    if (ui.ceTab !== "moy" && !d.communes.find((c) => c.id === ui.ceTab)) ui.ceTab = "moy";
    let h = `<div class="card" id="coutenfant"><h3>Coût par enfant</h3>
      <div class="bar"><div class="seg">${ALL.map((yy) => `<button data-act="ceYear" data-arg="${yy}" class="${yy === y ? "on" : ""}">${yy}${yy === H ? " (BP)" : ""}</button>`).join("")}</div></div>
      ${y === H ? `<p class="small muted" style="margin-top:-6px">${H} : budget primitif ; effectifs ${H} inconnus, ceux de ${BASE()} sont utilisés${d.communes.some((c) => c.estime) ? " ; répartition entre communes estimée" : ""}.</p>` : ""}
      <div class="kpis">
      <div class="kpi"><div class="l">Coût brut par enfant</div><div class="v">${eur(d.coutBrutEnfant)}</div><div class="d">${eur(d.dep)} de dépenses ÷ ${nf0.format(d.enfTotal)} enfants</div></div>
      <div class="kpi"><div class="l">Coût net moyen par enfant</div><div class="v">${eur(moy)}</div><div class="d">après recettes propres (cantine, Région…), hors fonds de roulement</div></div>
      <div class="kpi"><div class="l">Cotisation moyenne par enfant membre</div><div class="v">${eur(d.besoin / (d.enf || 1))}</div><div class="d">${eur(d.besoin)} ÷ ${nf0.format(d.enf)} enfants des communes membres</div></div>
      <div class="kpi"><div class="l">Enfants hors membre</div><div class="v">${eur(d.horsResteMembres)}</div><div class="d">${nf0.format(d.enfHors)} enfants × ${eur(moy)}${d.recHors ? " − " + eur(d.recHors) + " facturés" : ""} : reste à la charge des membres</div></div></div>`;

    // Onglets : moyenne / chaque commune membre
    h += `<div class="bar"><div class="seg" style="flex-wrap:wrap">
      <button data-act="ceTab" data-arg="moy" class="${ui.ceTab === "moy" ? "on" : ""}">En moyenne</button>
      ${d.communes.map((c) => `<button data-act="ceTab" data-arg="${c.id}" class="${ui.ceTab === c.id ? "on" : ""}">${esc(c.nom)}</button>`).join("")}</div></div>`;

    if (ui.ceTab === "moy") {
      h += `<h3>Ce que coûte un enfant en ${y}, en moyenne</h3>${pieServices(d, d.enfTotal || 1, "par enfant")}`;
    } else {
      const c = d.communes.find((x) => x.id === ui.ceTab);
      const cc = state.communes.find((x) => x.id === c.id) || {};
      const pe = c.enf ? c.cotis / c.enf : null;
      const share = d.besoin ? c.cotis / d.besoin : 0;
      const map = Object.fromEntries(Object.entries(d.analytiqueVentile).map(([k, v]) => [k, v * share]));
      h += `<h3>${esc(c.nom)} en ${y} : ${pe == null ? "aucun enfant scolarisé" : eur(pe) + " de cotisation par enfant"}${c.estime ? ' <span class="small muted">(estimation)</span>' : ""}</h3>`;
      if (pe == null) h += `<p class="muted">Pas d'enfant scolarisé cette année : la commune ne paie que sa part population (${eur(c.partPop)}).</p>`;
      else h += `<div class="grid g2" style="align-items:start"><div>${pieMap(map, c.enf, "par enfant", [], "Ce que finance la cotisation de la commune, ramenée à chacun de ses enfants. Elle inclut sa part du fonds de roulement et déduit sa part des participations des communes hors membre.")}</div>
        <div><table><tbody>
          <tr><td>Enfants scolarisés</td><td class="n">${nf0.format(c.enf)}</td></tr>
          <tr><td>Cotisation ${y}</td><td class="n"><b>${eur(c.cotis)}</b></td></tr>
          <tr><td>Cotisation par enfant</td><td class="n"><b>${eur(pe)}</b></td></tr>
          <tr><td>Coût net moyen d'un enfant</td><td class="n">${eur(moy)}</td></tr>
          <tr class="sub"><td>Écart avec la moyenne</td><td class="n"><span class="${pe > moy ? "up" : "down"}">${pe >= moy ? "+" : ""}${pct(pe / moy - 1)}</span></td></tr>
          ${+cc.budgetCommune > 0 ? `<tr><td>Poids dans le budget de la commune</td><td class="n">${poidsTxt(c.cotis / cc.budgetCommune)}</td></tr>` : ""}
        </tbody></table>
        <h4 style="margin:14px 0 6px">Pourquoi ce montant par enfant ?</h4>
        <div class="pie-main" style="gap:14px">${donut([{ label: "Part population", value: c.partPop, color: "#8a9bb0" }, { label: "Part enfants", value: c.partEnf, color: "#1f4e79" }], { size: 130, center: pct(c.partPop / (c.cotis || 1)), sub: "population" })}
          <div class="small">La cotisation se compose de la <b>part population</b> (${eur(c.partPop)}, selon ses ${nf0.format(c.pop)} habitants) et de la <b>part enfants</b> (${eur(c.partEnf)}). Plus la part population est grande par rapport au nombre d'enfants, plus le coût par enfant est élevé.</div></div></div></div>`;
    }
    h += `</div>`;
    return h;
  }

  function detailCommune() {
    const y = ui.year, d = R[y];
    let h = `<div class="card" id="detail"><h3>Détail du calcul des cotisations</h3><div class="bar">${yearSeg(y)}</div>
      <div class="steps" style="max-width:980px">
      <div class="step"><div class="k">1</div><div class="f"><b>Besoin de financement du syndicat</b><br>
        Dépenses <code>${eur(d.dep)}</code> − recettes hors cotisations <code>${eur(d.recAutres)}</code> − résultat reporté <code>${eur(d.report)}</code> + fonds de roulement visé <code>${eur(d.fdr)}</code></div><div class="r">${eur(d.besoin)}</div></div>
      <div class="step"><div class="k">2</div><div class="f"><b>Part population (${nfp.format(state.cle.pop)} %)</b> : ${eur(d.besoin)} × ${nfp.format(state.cle.pop)} % = <code>${eur(d.besoin * state.cle.pop / 100)}</code>, réparti selon les habitants de chaque commune (${nf0.format(d.popTot)} au total).</div><div class="r"></div></div>
      <div class="step"><div class="k">3</div><div class="f"><b>Part enfants (${nfp.format(state.cle.enf)} %)</b> : ${eur(d.besoin)} × ${nfp.format(state.cle.enf)} % = <code>${eur(d.besoin * state.cle.enf / 100)}</code>, réparti selon les enfants scolarisés de chaque commune membre (${nf0.format(d.enf)} au total).</div><div class="r"></div></div>
      <div class="step total"><div class="k">=</div><div class="f"><b>Cotisation d'une commune</b> = part population + part enfants</div><div class="r">${eur(d.besoin)}</div></div></div>
      <h3 style="margin-top:20px">Calcul ${y} pour chaque commune</h3>${repartitionTable(y, true)}</div>`;
    return h;
  }
  function repartitionTable(y, compact) {
    const d = R[y], wP = state.cle.pop / 100, wE = state.cle.enf / 100;
    let h = `<div class="scroll"><table><thead><tr><th>Commune</th><th class="n">Population</th><th class="n">% pop.</th><th class="n">Part population</th><th class="n">Enfants</th><th class="n">% enfants</th><th class="n">Part enfants</th><th class="n">Cotisation</th>${y > BASE() ? `<th class="n">vs ${y - 1}</th>` : ""}<th class="n">€/hab.</th><th class="n">€/enfant</th></tr></thead><tbody>`;
    d.communes.forEach((x) => {
      const p = y > BASE() ? cotisDe(y - 1, x.id) : null;
      h += `<tr class="${!compact && x.id === ui.commune ? "sub" : ""}"><td>${esc(x.nom)}</td><td class="n">${nf0.format(x.pop)}</td><td class="n">${pct(x.sp)}</td><td class="n">${eur(x.partPop)}</td><td class="n">${nf0.format(x.enf)}</td><td class="n">${pct(x.se)}</td><td class="n">${eur(x.partEnf)}</td><td class="n"><b>${eur(x.cotis)}</b></td>${p != null ? `<td class="n">${delta(x.cotis - p)}</td>` : ""}<td class="n">${eur2(x.cotis / (x.pop || 1))}</td><td class="n">${x.enf ? eur(x.cotis / x.enf) : "–"}</td></tr>`;
    });
    h += `<tr class="tot"><td>Total</td><td class="n">${nf0.format(d.popTot)}</td><td class="n">100 %</td><td class="n">${eur(d.besoin * wP)}</td><td class="n">${nf0.format(d.enf)}</td><td class="n">100 %</td><td class="n">${eur(d.besoin * wE)}</td><td class="n">${eur(d.besoin)}</td>${y > BASE() ? `<td class="n">${delta(d.besoin - R[y - 1].besoin)}</td>` : ""}<td class="n">${eur2(d.besoin / d.popTot)}</td><td class="n">${eur(d.besoin / (d.enf || 1))}</td></tr></tbody></table></div>`;
    return h;
  }

  /* =====================================================================
     ONGLET D'UNE ANNÉE
     ===================================================================== */
  function tabAnnee(y) {
    const d = R[y], isBase = y === BASE(), p = isBase ? null : R[y - 1];
    let h = `<h2>Budget ${y}</h2>
    <p class="lead">${isBase ? "Proposition 2026, telle que dans le document de départ." : `Pré-rempli avec les montants de ${BASE()} (lignes ponctuelles à 0). Modifiez directement les montants de ${y} ; les cotisations se recalculent.`}</p>`;
    h += `<div class="kpis">
      <div class="kpi"><div class="l">Dépenses ${y}</div><div class="v">${eur(d.dep)}</div><div class="d">${p ? delta(d.dep - p.dep) + " vs " + (y - 1) : "proposition 2026"}</div></div>
      <div class="kpi"><div class="l">Recettes hors cotisations</div><div class="v">${eur(d.recAutres)}</div><div class="d">${p ? delta(d.recAutres - p.recAutres, true) + " vs " + (y - 1) : ""}</div></div>
      <div class="kpi"><div class="l">Cotisations des membres</div><div class="v">${eur(d.besoin)}</div><div class="d">${p ? delta(d.besoin - p.besoin) + " (" + dpctTxt(d.besoin, p.besoin) + ") vs " + (y - 1) : "document : 107 250 €"}</div></div>
      <div class="kpi"><div class="l">Enfants accueillis</div><div class="v">${nf0.format(d.enfTotal)}</div><div class="d">${nf0.format(d.enf)} des communes membres · ${nf0.format(d.enfHors)} hors membre</div></div></div>`;
    if (!isBase) {
      h += `<div class="bar noprint"><button class="btn" data-act="copyPrev" data-arg="${y}">Recopier les montants de ${y - 1}</button>
        <span class="muted small">ou</span> <label class="inl">appliquer ${numIn("__hausse", ui.hausse, "s", 1)} %</label> <button class="btn" data-act="hausse" data-arg="${y}">aux dépenses de ${y} (sur la base de ${y - 1})</button></div>`;
    }
    h += lignesAnnee(y, "dep", "Dépenses de fonctionnement") + lignesAnnee(y, "rec", "Recettes de fonctionnement");

    h += `<div class="grid g2"><div class="card"><h3>Équilibre ${y}</h3><table><tbody>
      <tr><td>Dépenses de fonctionnement</td><td class="n">${eur2(d.dep)}</td></tr>
      <tr><td>− Recettes hors cotisations des membres</td><td class="n">${eur2(d.recAutres)}</td></tr>
      <tr><td>− Résultat reporté (002)${isBase ? "" : ` <span class="small muted">= fonds de roulement visé fin ${y - 1}</span>`}</td><td class="n">${eur2(d.report)}</td></tr>
      <tr><td>+ Fonds de roulement visé en fin d'année</td><td class="n">${numIn(`hyp.fdr.${y}`, state.hyp.fdr[y], "", 2)}</td></tr>
      <tr class="tot"><td>= Cotisations des communes membres (74748)</td><td class="n">${eur2(d.besoin)}</td></tr></tbody></table>
      <p class="small muted">${isBase ? "Le budget 2026 crée un fonds de roulement de 8 054,87 €." : `Garder le même fonds de roulement que l'année précédente ne coûte rien de plus ; l'augmenter fait monter les cotisations d'autant.`}</p></div>
      <div class="card"><h3>Coût net par service ${y}</h3>${hbars(d.analytique)}</div></div>`;
    h += `<div class="card"><h3>Cotisations ${y} par commune</h3>${repartitionTable(y, true)}<p class="small muted"><a href="#" data-act="goDetail" data-arg="${y}">Voir le détail du calcul →</a></p></div>`;
    return h;
  }

  function lignesAnnee(y, sens, titre) {
    const isBase = y === BASE(), d = R[y], dp = isBase ? null : R[y - 1];
    const cols = isBase ? `<th class="n">BP 2025</th><th class="n">Réalisé 2025</th>` : `<th class="n">${y - 1}</th>`;
    let h = `<div class="card"><h3>${titre} ${y}</h3><div class="scroll"><table><thead><tr><th>Article</th><th>Libellé</th><th>Service</th>${cols}<th class="n">${y}</th><th class="n">Écart</th><th>Commentaire</th><th></th></tr></thead><tbody>`;
    let lastChap = null, tot = 0, totPrev = 0, totBp = 0, totReal = 0;
    const ncol = isBase ? 9 : 8;
    state.lignes.forEach((l, i) => {
      if (l.sens !== sens || l.nature === "cotisations") return;
      if (l.chap !== lastChap) { h += `<tr class="grp"><td colspan="${ncol}">${l.chap} – ${M.CHAP_LIB[l.chap] || ""}</td></tr>`; lastChap = l.chap; }
      if (l.nature === "report") {
        tot += d.report; totPrev += dp ? dp.report : 0; totBp += +l.bp25 || 0; totReal += +l.real25 || 0;
        h += `<tr class="calc"><td>${esc(l.art)}</td><td>${esc(l.lib)}</td><td>—</td>${isBase ? `<td class="n">${eur2(l.bp25)}</td><td class="n">${eur2(l.real25)}</td>` : `<td class="n">${eur2(dp.report)}</td>`}<td class="n">${eur2(d.report)}</td><td class="n">${dp ? delta(d.report - dp.report, true) : ""}</td><td class="small">${isBase ? "" : "calculé : fonds de roulement de l'année précédente"}</td><td></td></tr>`;
        return;
      }
      const v = l.montants ? l.montants[y] : l.montant, pv = dp && l.montants ? l.montants[y - 1] : null;
      tot += +v || 0; totPrev += +pv || 0; totBp += +l.bp25 || 0; totReal += +l.real25 || 0;
      h += `<tr><td style="width:80px">${txtIn(`lignes.${i}.art`, l.art)}</td><td style="min-width:230px">${txtIn(`lignes.${i}.lib`, l.lib)}</td><td>${selIn(`lignes.${i}.cat`, l.cat, catOpts())}</td>
        ${isBase ? `<td class="n">${eur2(l.bp25)}</td><td class="n">${eur2(l.real25)}</td>` : `<td class="n">${eur2(pv)}</td>`}
        <td class="n">${numIn(`lignes.${i}.montants.${y}`, v)}</td><td class="n">${dp ? delta((+v || 0) - (+pv || 0), sens === "rec") : ""}</td>
        <td style="min-width:200px">${txtIn(`lignes.${i}.com`, l.com)}</td><td><button class="btn small danger" data-act="delLigne" data-arg="${i}" title="Supprimer cette ligne (toutes les années)">✕</button></td></tr>`;
    });
    const extra = d.lignes.filter((l) => l.src !== "ligne" && l.sens === sens);
    if (extra.length) {
      h += `<tr class="grp"><td colspan="${ncol}">Calculé automatiquement</td></tr>`;
      extra.forEach((l) => {
        const pv = dp ? (dp.lignes.find((x) => x.src === l.src && x.lib === l.lib) || {}).v || 0 : null;
        tot += l.v; totPrev += pv || 0;
        h += `<tr class="calc"><td>${esc(l.art)}</td><td>${esc(l.lib)}</td><td>${M.CATS[l.cat].lib}</td>${isBase ? `<td></td><td></td>` : `<td class="n">${eur2(pv)}</td>`}<td class="n">${eur2(l.v)}</td><td class="n">${dp ? delta(l.v - pv, sens === "rec") : ""}</td><td class="small">onglet Communes</td><td></td></tr>`;
      });
    }
    if (sens === "rec") {
      const c = state.lignes.find((l) => l.nature === "cotisations");
      h += `<tr class="sub"><td>${c ? esc(c.art) : "74748"}</td><td>Cotisations des communes membres (calculées)</td><td>—</td>${isBase ? `<td class="n">${eur2(c && c.bp25)}</td><td class="n">${eur2(c && c.real25)}</td>` : `<td class="n">${eur2(dp.besoin)}</td>`}<td class="n">${eur2(d.besoin)}</td><td class="n">${dp ? delta(d.besoin - dp.besoin) : ""}</td><td></td><td></td></tr>`;
      tot += d.besoin; totPrev += dp ? dp.besoin : 0; totBp += c ? +c.bp25 || 0 : 0; totReal += c ? +c.real25 || 0 : 0;
    }
    h += `<tr class="tot"><td colspan="3">Total ${sens === "dep" ? "dépenses" : "recettes"}</td>${isBase ? `<td class="n">${eur2(totBp)}</td><td class="n">${eur2(totReal)}</td>` : `<td class="n">${eur2(totPrev)}</td>`}<td class="n">${eur2(tot)}</td><td class="n">${dp ? delta(tot - totPrev, sens === "rec") : ""}</td><td colspan="2"></td></tr>`;
    h += `</tbody></table></div><div class="bar noprint" style="margin:10px 0 0"><button class="btn" data-act="addLigne" data-arg="${sens}">+ Ajouter une ligne</button><span class="small muted">Une nouvelle ligne apparaît dans toutes les années (montant 0 à compléter).</span></div></div>`;
    return h;
  }

  /* ---------------- Postes du personnel ---------------- */
  function postesCard() {
    let h = "";
    // Postes : répartition du personnel
    const ps = state.postes || [];
    const totH = ps.reduce((x, p) => x + (+p.heures || 0), 0) || 1;
    const perso = R[BASE() + 1].analytique.PER;
    const catPoste = Object.fromEntries(Object.entries(catOpts()).filter(([k]) => !["PER", "FIN"].includes(k)));
    h += `<div class="card" id="postes"><h3>Postes du syndicat</h3><p class="small muted" style="margin-top:-4px">Les charges de personnel (${eur(perso)} en ${BASE() + 1}) sont réparties entre services au prorata des heures hebdomadaires de chaque poste. Un même agent peut occuper plusieurs lignes (ex. garderie + ménage). <b>Heures provisoires : à remplacer par les vraies.</b></p>
      <table style="max-width:820px"><thead><tr><th>Poste</th><th>Service</th><th class="n">Heures / semaine</th><th class="n">Part</th><th class="n">Coût réparti ${BASE() + 1}</th><th></th></tr></thead><tbody>
      ${ps.map((p, i) => `<tr><td>${txtIn(`postes.${i}.lib`, p.lib)}</td><td>${selIn(`postes.${i}.cat`, p.cat, catPoste)}</td><td class="n">${numIn(`postes.${i}.heures`, p.heures, "s est", 1)}</td><td class="n">${pct((+p.heures || 0) / totH)}</td><td class="n">${eur(perso * (+p.heures || 0) / totH)}</td><td><button class="btn small danger" data-act="delPoste" data-arg="${i}">✕</button></td></tr>`).join("")}
      <tr class="tot"><td colspan="2">Total</td><td class="n">${nfp.format(totH)} h</td><td class="n">100 %</td><td class="n">${eur(perso)}</td><td></td></tr></tbody></table>
      <div class="bar" style="margin-top:10px"><button class="btn" data-act="addPoste">+ Ajouter un poste</button></div></div>`;
    return h;
  }

  /* ---------------- Navigation & rendu ---------------- */
  const TABS = () => [
    ["synthese", "Synthèse", tabSynthese],
    ["communes", "Communes & cotisations", tabCommunes],
    ...YEARS().map((y) => ["y" + y, String(y), () => tabAnnee(y)]),
  ];
  function renderNav() {
    document.getElementById("tabs").innerHTML = TABS().map(([k, l]) => `<button data-act="tab" data-arg="${k}" class="${ui.tab === k ? "active" : ""}">${l}</button>`).join("");
  }
  function render() {
    renderNav();
    const t = TABS().find((x) => x[0] === ui.tab) || TABS()[0];
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

  /* ---------------- Export ---------------- */
  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function exportCsv() {
    const yrs = YEARS(), c = (v) => (typeof v === "number" ? v.toFixed(2).replace(".", ",") : `"${String(v ?? "").replace(/"/g, '""')}"`);
    const L = [], line = (a) => L.push(a.map(c).join(";"));
    line(["Simulateur SISBMT"]); L.push("");
    line(["Cotisations par commune", ...yrs]);
    membres().forEach((x) => line([x.nom, ...yrs.map((y) => cotisDe(y, x.id))]));
    line(["Total", ...yrs.map((y) => R[y].besoin)]); L.push("");
    line(["Équilibre", ...yrs]);
    [["Dépenses", "dep"], ["Recettes hors cotisations", "recAutres"], ["Résultat reporté", "report"], ["Fonds de roulement visé", "fdr"], ["Cotisations", "besoin"], ["Enfants communes membres", "enf"], ["Enfants hors membre", "enfHors"], ["Coût net moyen par enfant", "coutNetEnfant"]].forEach(([l, k]) => line([l, ...yrs.map((y) => R[y][k])]));
    L.push("");
    line(["Sens", "Article", "Libellé", "Service", ...yrs]);
    const keys = [];
    yrs.forEach((y) => R[y].lignes.forEach((l) => { const k = l.sens + "|" + (l.id || l.lib); if (!keys.find((x) => x.k === k)) keys.push({ k, l }); }));
    keys.forEach(({ k, l }) => line([l.sens === "dep" ? "Dépense" : "Recette", l.art, l.lib, (M.CATS[l.cat] || {}).lib || "", ...yrs.map((y) => { const x = R[y].lignes.find((z) => z.sens + "|" + (z.id || z.lib) === k); return x ? x.v : 0; })]));
    download("sisbmt-simulation.csv", "﻿" + L.join("\r\n"), "text/csv;charset=utf-8");
  }

  /* ---------------- Actions ---------------- */
  const uid = (p) => p + Math.random().toString(36).slice(2, 8);
  const scrollTo = (id) => { const d = document.getElementById(id); if (d) d.scrollIntoView({ behavior: "smooth" }); };
  const ACTIONS = {
    tab: (a) => { ui.tab = a; render(); window.scrollTo(0, 0); },
    year: (a) => { ui.year = +a; render(); },
    matrice: (a) => { ui.matrice = a; render(); },
    ceYear: (a) => { ui.ceYear = +a; render(); },
    ceTab: (a) => { ui.ceTab = a; render(); },
    goCommune: (a) => { ui.ceTab = a; ui.tab = "communes"; render(); scrollTo("coutenfant"); },
    goDetail: (a) => { ui.year = +a; ui.tab = "communes"; render(); scrollTo("detail"); },
    addCommune: () => { state.communes.push({ id: uid("c"), nom: "Nouvelle commune membre", insee: "", pop: 100, enfants: Object.fromEntries(YEARS().map((y) => [y, 0])), tendance: 0, budgetCommune: 100000, budgetSource: "Estimation : 1 000 €/hab.", statut: "membre" }); commit(); },
    delCommune: (a) => {
      if (membres().length <= 1) return alert("Il faut au moins une commune membre.");
      if (confirm(`Supprimer « ${state.communes[+a].nom} » ?`)) { state.communes.splice(+a, 1); commit(); }
    },
    addHors: () => {
      if (!Array.isArray(state.horsMembres)) state.horsMembres = [];
      state.horsMembres.push({ id: uid("h"), nom: "Nouvelle commune hors membre", enfants: Object.fromEntries(YEARS().map((y) => [y, 1])), tendance: 0, facturee: true });
      commit();
    },
    delHors: (a) => { if (confirm(`Supprimer « ${state.horsMembres[+a].nom} » ?`)) { state.horsMembres.splice(+a, 1); commit(); } },
    addLigne: (a) => {
      const after = state.lignes.map((l) => l.sens).lastIndexOf(a);
      state.lignes.splice(after + 1, 0, { id: uid("l"), sens: a, chap: a === "dep" ? "011" : "70", art: "", lib: "Nouvelle ligne", bp25: 0, real25: 0, montant: 0, montants: Object.fromEntries(YEARS().map((y) => [y, 0])), cat: "ADM", com: "" });
      commit();
    },
    delLigne: (a) => { if (confirm(`Supprimer la ligne « ${state.lignes[+a].lib} » dans toutes les années ?`)) { state.lignes.splice(+a, 1); commit(); } },
    copyPrev: (a) => {
      const y = +a;
      if (!confirm(`Remplacer tous les montants de ${y} par ceux de ${y - 1} ?`)) return;
      state.lignes.forEach((l) => { if (l.montants) l.montants[y] = l.montants[y - 1]; });
      commit();
    },
    hausse: (a) => {
      const y = +a, t = ui.hausse;
      if (!confirm(`Dépenses de ${y} = dépenses de ${y - 1} + ${nfp.format(t)} % ?`)) return;
      state.lignes.forEach((l) => { if (l.sens === "dep" && l.montants && !l.nature) l.montants[y] = Math.round((+l.montants[y - 1] || 0) * (1 + t / 100) * 100) / 100; });
      commit();
    },
    addPoste: () => { if (!Array.isArray(state.postes)) state.postes = []; state.postes.push({ id: uid("p"), lib: "Nouveau poste", cat: "SCO", heures: 0 }); commit(); },
    delPoste: (a) => { state.postes.splice(+a, 1); commit(); },
    exportJson: () => download("sisbmt-sauvegarde.json", JSON.stringify(state, null, 2), "application/json"),
    importJson: () => document.getElementById("fileIn").click(),
    exportCsv,
    print: () => window.print(),
    reset: () => { if (confirm("Revenir aux données d'origine du budget 2026 ? Toutes vos modifications seront perdues (pensez à « Sauvegarder » avant).")) { state = clone(window.DEFAULT_STATE); commit(); } },
  };
  function toast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    Object.assign(t.style, { position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)", background: "#1d2433", color: "#fff", padding: "10px 16px", borderRadius: "8px", fontSize: ".9rem", zIndex: 99 });
    document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
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
    if (el.id === "fileIn") {
      const f = el.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const s = migrer(JSON.parse(rd.result));
          if (!s.lignes || !s.communes || s.version !== window.DEFAULT_STATE.version) throw new Error("format");
          state = s; commit(); toast("Sauvegarde ouverte.");
        } catch (err) { alert("Fichier non reconnu : il doit s'agir d'une sauvegarde de cette version du simulateur."); }
      };
      rd.readAsText(f); el.value = "";
      return;
    }
    const p = el.dataset.p;
    if (!p) return;
    const t = el.dataset.t;
    const v = el.dataset.vide === "null" && !el.value.trim() ? null : t === "n" ? parseNum(el.value) : t === "b" ? el.checked : el.value;
    if (p === "__hausse") { ui.hausse = v; return; }
    setPath(p, v);
    // Projection automatique des effectifs
    let m;
    if ((m = p.match(/^(communes|horsMembres)\.(\d+)\.(tendance|enfants\.(\d+))$/)) && (m[3] === "tendance" || +m[4] === BASE())) {
      const c = state[m[1]][+m[2]];
      projeterEffectifs(c.enfants, c.tendance || 0);
    }
    if (p === "cle.pop") state.cle.enf = Math.round((100 - v) * 100) / 100;
    if (p === "cle.enf") state.cle.pop = Math.round((100 - v) * 100) / 100;
    commit();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("input.num, input.txt")) e.target.blur();
  });

  render();
  if (migre) toast("Nouvelle version du simulateur : données de départ rechargées.");
})();
