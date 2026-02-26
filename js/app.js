"use strict";

/* ════════════════════════════════════════════════════════════
   TABLERO EPHC — app.js  v4
   Multi-select chip-group filters with Ctrl+click.
   All filters are now buttons, not dropdowns.
   JSON fields: sexo='Hombres'/'Mujeres', tramo_edad, departamento,
     categocupa, trimestre_desc='2024Trim3', anio (int), trimestre_num (int)
     personas_pet, ocupados, desocupados, aporta_ips, aporta_jub,
     anios_estudio_pond, sml_cat
════════════════════════════════════════════════════════════ */

let cf, dimTrimAnio, dimTrimNum, dimSexo, dimEdad, dimDpto, dimCate;
let geojsonData = null;
let maps = {};
let activeLayers = {};

const PY_BOUNDS = [[-27.6, -62.7], [-19.3, -54.3]];

const PLY_CFG = {
    responsive: true, displayModeBar: true,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
    toImageButtonOptions: { format: 'png', scale: 2 }
};

function getBase() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gc = dark ? 'rgba(255,255,255,0.06)' : '#F1F5F9';
    const fc = dark ? '#CBD5E1' : '#475569';
    const bg = dark ? '#1E293B' : 'white';
    return {
        paper_bgcolor: bg, plot_bgcolor: bg,
        font: { family: "'Inter',system-ui,sans-serif", size: 12, color: fc },
        margin: { l: 52, r: 16, t: 10, b: 48 }, showlegend: true,
        legend: { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1, font: { color: fc } },
        gridColor: gc
    };
}
const C = { blue: '#2563EB', green: '#16A34A', red: '#DC2626', amber: '#D97706', teal: '#0D9488', purple: '#7C3AED' };
const PAL = ['#2563EB', '#0D9488', '#16A34A', '#D97706', '#7C3AED', '#DC2626', '#0284C7', '#EA580C'];

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initSidebarToggle();
    initThemeToggle();
    initTooltips();
    initScrollSpy();
    initSectionNavLinks();
    loadData();
    loadMetodologia();
});

// ── Theme ─────────────────────────────────────────────────────
function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    const saved = localStorage.getItem('ephc-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    btn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('ephc-theme', next);
        btn.title = next === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
        setTimeout(reRenderAllCharts, 50);
    });
}
function reRenderAllCharts() {
    const B = getBase();
    ['ch-edad-sexo', 'ch-dpto-pet', 'ch-cate-ocupa', 'ch-ocu-desoc', 'ch-ips-cate',
        'ch-ips-donut', 'ch-educ-edad', 'ch-hist-lab', 'ch-hist-salud', 'ch-hist-sml'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.data) Plotly.relayout(id, { paper_bgcolor: B.paper_bgcolor, plot_bgcolor: B.plot_bgcolor, font: B.font, legend: B.legend });
        });
}

// ── Tooltip system ────────────────────────────────────────────
function initTooltips() {
    const bubble = document.getElementById('tooltip-bubble');
    let hideTimer;
    function pos(cx, cy) {
        let l = cx + 12, t = cy + 8;
        if (l + 290 > window.innerWidth - 8) l = cx - 298;
        if (t + 80 > window.innerHeight - 8) t = cy - 88;
        bubble.style.left = l + 'px'; bubble.style.top = t + 'px';
    }
    document.querySelectorAll('.info-btn[data-tip]').forEach(btn => {
        btn.addEventListener('mouseenter', e => { clearTimeout(hideTimer); bubble.textContent = btn.dataset.tip; bubble.classList.add('visible'); pos(e.clientX, e.clientY); });
        btn.addEventListener('mousemove', e => pos(e.clientX, e.clientY));
        btn.addEventListener('mouseleave', () => { hideTimer = setTimeout(() => bubble.classList.remove('visible'), 100); });
        btn.addEventListener('click', e => {
            e.stopPropagation();
            if (bubble.classList.contains('visible')) { bubble.classList.remove('visible'); }
            else { bubble.textContent = btn.dataset.tip; bubble.classList.add('visible'); pos(e.clientX, e.clientY); }
        });
    });
    document.addEventListener('click', () => bubble.classList.remove('visible'));
}

// ── Scroll-spy ────────────────────────────────────────────────
function initScrollSpy() {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            document.querySelectorAll('.snav-link').forEach(link => {
                if (link.getAttribute('href') === '#' + id) {
                    const nav = link.closest('.section-nav');
                    if (nav) nav.querySelectorAll('.snav-link').forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }
            });
        });
    }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
    document.querySelectorAll('.scroll-anchor').forEach(el => observer.observe(el));
}
function initSectionNavLinks() {
    document.querySelectorAll('.snav-link[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const t = document.getElementById(link.getAttribute('href').slice(1));
            if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

// ── Tabs ──────────────────────────────────────────────────────
function initTabs() {
    document.querySelectorAll('.main-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
            window.dispatchEvent(new Event('resize'));
            setTimeout(() => Object.values(maps).forEach(m => { try { m.invalidateSize(); } catch (e) { } }), 300);
        });
    });
}
function initSidebarToggle() {
    const btn = document.getElementById('sidebar-toggle'), sb = document.getElementById('sidebar'), mn = document.getElementById('app-main');
    btn.addEventListener('click', () => {
        if (window.innerWidth >= 900) { sb.classList.toggle('hidden'); mn.classList.toggle('full'); }
        else { sb.classList.toggle('shown'); }
    });
}

// ── Data Loading ──────────────────────────────────────────────
async function loadData() {
    setStatus('Cargando datos EPHC…');
    try {
        const [dr, gr] = await Promise.all([fetch('datos_consolidados.json'), fetch('departamentos.geojson')]);
        if (!dr.ok) throw new Error('No se encontró datos_consolidados.json');
        const raw = await dr.json();
        geojsonData = await gr.json();
        initCrossfilter(raw);
        populateFilterButtons();
        initMultiSelectBehavior();
        initMaps();
        updateDashboard();
    } catch (e) { setStatus('Error: ' + e.message); console.error(e); }
}

function initCrossfilter(data) {
    cf = crossfilter(data);
    dimTrimAnio = cf.dimension(d => d.anio != null ? String(d.anio) : 'NR');
    dimTrimNum = cf.dimension(d => d.trimestre_num != null ? String(d.trimestre_num) : 'NR');
    dimSexo = cf.dimension(d => d.sexo || 'NR');
    dimEdad = cf.dimension(d => d.tramo_edad || 'NR');
    dimDpto = cf.dimension(d => d.departamento || 'NR');
    dimCate = cf.dimension(d => d.categocupa || 'NR');
}

// ── Populate Button Filters ───────────────────────────────────
function populateFilterButtons() {
    const all = cf.all();

    // Año — descending order (most recent first)
    const anios = [...new Set(all.map(d => d.anio).filter(x => x != null))].sort((a, b) => b - a);
    const grpAnio = document.getElementById('f-anio');
    anios.forEach(a => {
        const btn = document.createElement('button');
        btn.className = 't-chip';
        btn.dataset.val = String(a);
        btn.textContent = String(a);
        grpAnio.appendChild(btn);
    });

    // Trimestre — descending (4,3,2,1)
    const trimNums = [...new Set(all.map(d => d.trimestre_num).filter(x => x != null))].sort((a, b) => b - a);
    const trimLabels = { 1: 'T1', 2: 'T2', 3: 'T3', 4: 'T4' };
    const grpTrim = document.getElementById('f-trimestre');
    trimNums.forEach(n => {
        const btn = document.createElement('button');
        btn.className = 't-chip';
        btn.dataset.val = String(n);
        btn.textContent = trimLabels[n] || 'T' + n;
        grpTrim.appendChild(btn);
    });

    // Departamento — alphabetical
    const dptos = [...new Set(all.map(d => d.departamento).filter(x => x && x !== 'NR'))].sort();
    const grpDpto = document.getElementById('f-dpto');
    dptos.forEach(d => {
        const btn = document.createElement('button');
        btn.className = 't-chip';
        btn.dataset.val = d;
        btn.textContent = d;
        btn.title = d;  // full name on hover
        grpDpto.appendChild(btn);
    });

    // Categoría Ocupacional — alphabetical
    const cates = [...new Set(all.map(d => d.categocupa).filter(x => x && x !== 'NR'))].sort();
    const grpCate = document.getElementById('f-cate');
    cates.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 't-chip';
        btn.dataset.val = c;
        btn.textContent = c;
        grpCate.appendChild(btn);
    });
}

// ── MULTI-SELECT BEHAVIOR ─────────────────────────────────────
// All .multi-select chip-groups support:
//   - Normal click: selects only that chip (exclusive)
//   - Ctrl+click: toggles that chip (additive multi-select)
//   - Click "Todos": resets to all
// Sexo group (toggle-group) remains exclusive (single-select)
function initMultiSelectBehavior() {
    // Multi-select chip groups (anio, trimestre, edad, dpto, cate)
    document.querySelectorAll('.chip-group.multi-select').forEach(group => {
        group.querySelectorAll('.t-chip').forEach(btn => {
            btn.addEventListener('click', e => {
                handleMultiSelect(group, btn, e.ctrlKey || e.metaKey);
                applyFilters();
            });
        });
    });

    // Single-select: Sexo
    document.querySelectorAll('#f-sexo .t-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#f-sexo .t-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyFilters();
        });
    });

    // Reset
    document.getElementById('btn-reset').addEventListener('click', resetFilters);
}

function handleMultiSelect(group, clicked, isCtrl) {
    const allBtn = group.querySelector('.t-chip[data-val="ALL"], .t-chip[data-val="Todos"], .t-chip[data-val="Todas"]');
    const isAll = clicked.dataset.val === 'ALL' || clicked.dataset.val === 'Todos' || clicked.dataset.val === 'Todas';

    if (isAll) {
        // Click on "Todos" → clear all, activate "Todos"
        group.querySelectorAll('.t-chip').forEach(b => b.classList.remove('active'));
        clicked.classList.add('active');
        return;
    }

    if (isCtrl) {
        // Ctrl+click: toggle the specific chip
        clicked.classList.toggle('active');
        // If "Todos" was active, deactivate it
        if (allBtn) allBtn.classList.remove('active');
        // If nothing is active, reactivate "Todos"
        const anyActive = group.querySelectorAll('.t-chip.active:not([data-val="ALL"]):not([data-val="Todos"]):not([data-val="Todas"])');
        if (anyActive.length === 0 && allBtn) allBtn.classList.add('active');
    } else {
        // Normal click: exclusive select
        group.querySelectorAll('.t-chip').forEach(b => b.classList.remove('active'));
        clicked.classList.add('active');
    }
}

// ── Get Selected Values From Group ────────────────────────────
function getGroupSelection(groupId) {
    const group = document.getElementById(groupId);
    const allBtn = group.querySelector('.t-chip[data-val="ALL"], .t-chip[data-val="Todos"], .t-chip[data-val="Todas"]');
    if (allBtn && allBtn.classList.contains('active')) return null; // null = ALL
    const selected = [];
    group.querySelectorAll('.t-chip.active').forEach(b => selected.push(b.dataset.val));
    return selected.length > 0 ? selected : null;
}

// ── Apply Filters ─────────────────────────────────────────────
function applyFilters() {
    const anios = getGroupSelection('f-anio');
    const trims = getGroupSelection('f-trimestre');
    const sexo = document.querySelector('#f-sexo .t-btn.active')?.dataset.val || 'ALL';
    const edads = getGroupSelection('f-edad');
    const dptos = getGroupSelection('f-dpto');
    const cates = getGroupSelection('f-cate');

    dimTrimAnio.filterFunction(d => !anios || anios.includes(d));
    dimTrimNum.filterFunction(d => !trims || trims.includes(d));
    dimSexo.filterFunction(d => sexo === 'ALL' || d === sexo);
    dimEdad.filterFunction(d => !edads || edads.includes(d));
    dimDpto.filterFunction(d => !dptos || dptos.includes(d));
    dimCate.filterFunction(d => !cates || cates.includes(d));

    updateDashboard();
}

function resetFilters() {
    dimTrimAnio.filterAll(); dimTrimNum.filterAll(); dimSexo.filterAll();
    dimEdad.filterAll(); dimDpto.filterAll(); dimCate.filterAll();

    // Reset all chip groups to "Todos"
    ['f-anio', 'f-trimestre', 'f-edad', 'f-dpto', 'f-cate'].forEach(id => {
        const g = document.getElementById(id);
        g.querySelectorAll('.t-chip').forEach(b => b.classList.remove('active'));
        const allBtn = g.querySelector('.t-chip[data-val="ALL"], .t-chip[data-val="Todos"], .t-chip[data-val="Todas"]');
        if (allBtn) allBtn.classList.add('active');
    });

    // Reset sexo
    document.querySelectorAll('#f-sexo .t-btn').forEach(b => b.classList.remove('active'));
    const sAll = document.querySelector('#f-sexo .t-btn[data-val="ALL"]');
    if (sAll) sAll.classList.add('active');

    updateDashboard();
}

// ── Core Update ───────────────────────────────────────────────
function updateDashboard() {
    const rows = dimDpto.top(Infinity);

    let totalPET = 0, totalOcu = 0, totalDes = 0, totalIPS = 0, totalJub = 0, totalAnios = 0;
    const mapEdadH = {}, mapEdadM = {}, mapDeptoPET = {}, mapDeptoPEA = {};
    const mapCateOcu = {}, mapCateIPS = {}, mapCateJub = {};
    const mapTrimLab = {}, mapTrimSalud = {}, mapTrimSML = {};
    const trimSet = new Set();

    rows.forEach(d => {
        const pet = +(d.personas_pet || 0), ocu = +(d.ocupados || 0), des = +(d.desocupados || 0);
        const ips = +(d.aporta_ips || 0), jub = +(d.aporta_jub || 0), anios = +(d.anios_estudio_pond || 0);
        const cate = d.categocupa, dpto = d.departamento, sexo = d.sexo;
        const edad = d.tramo_edad, trim = d.trimestre_desc;

        totalPET += pet; totalOcu += ocu; totalDes += des;
        totalIPS += ips; totalJub += jub; totalAnios += anios;
        if (trim) trimSet.add(trim);

        if (edad && edad !== 'NR') {
            if (sexo === 'Hombres') mapEdadH[edad] = (mapEdadH[edad] || 0) + pet;
            if (sexo === 'Mujeres') mapEdadM[edad] = (mapEdadM[edad] || 0) + pet;
        }
        if (dpto && dpto !== 'NR') {
            mapDeptoPET[dpto] = (mapDeptoPET[dpto] || 0) + pet;
            if (!mapDeptoPEA[dpto]) mapDeptoPEA[dpto] = { pet: 0, pea: 0 };
            mapDeptoPEA[dpto].pet += pet; mapDeptoPEA[dpto].pea += ocu + des;
        }
        if (cate && cate !== 'NR') {
            mapCateOcu[cate] = (mapCateOcu[cate] || 0) + ocu;
            mapCateIPS[cate] = (mapCateIPS[cate] || 0) + ips;
            mapCateJub[cate] = (mapCateJub[cate] || 0) + jub;
        }
        if (trim && trim !== 'NR') {
            if (!mapTrimLab[trim]) mapTrimLab[trim] = { pet: 0, ocu: 0, des: 0 };
            if (!mapTrimSalud[trim]) mapTrimSalud[trim] = { ocu: 0, ips: 0, jub: 0 };
            mapTrimLab[trim].pet += pet; mapTrimLab[trim].ocu += ocu; mapTrimLab[trim].des += des;
            mapTrimSalud[trim].ocu += ocu; mapTrimSalud[trim].ips += ips; mapTrimSalud[trim].jub += jub;
            if (cate === 'Obrero privado' && d.sml_cat && d.sml_cat !== 'NR') {
                if (!mapTrimSML[trim]) mapTrimSML[trim] = { 'Menos de 1 SML': 0, '1 SML': 0, 'Más de 1 SML': 0 };
                mapTrimSML[trim][d.sml_cat] = (mapTrimSML[trim][d.sml_cat] || 0) + ocu;
            }
        }
    });

    const PEA = totalOcu + totalDes, nT = trimSet.size || 1;
    const petD = nT > 1 ? totalPET / nT : totalPET;

    setText('kpi-pet', fmtN(petD) + (nT > 1 ? ' *' : ''));
    setText('kpi-to', totalPET > 0 ? pct(totalOcu / totalPET) : '—');
    setText('kpi-td', PEA > 0 ? pct(totalDes / PEA) : '—');
    setText('kpi-tft', totalPET > 0 ? pct(PEA / totalPET) : '—');
    setText('kpi-ips', totalOcu > 0 ? pct(totalIPS / totalOcu) : '—');
    setText('kpi-educ', totalPET > 0 ? (totalAnios / totalPET).toFixed(1) + ' años' : '—');

    // Build status description
    const selAnios = getGroupSelection('f-anio');
    const selTrims = getGroupSelection('f-trimestre');
    let statusParts = [rows.length.toLocaleString('es-PY') + ' registros'];
    if (selAnios) statusParts.push(selAnios.join(', '));
    if (selTrims) { const tl = { 1: 'T1', 2: 'T2', 3: 'T3', 4: 'T4' }; statusParts.push(selTrims.map(t => tl[t] || t).join(', ')); }
    if (nT > 1) statusParts.push('*PET prom. ' + nT + ' trim.');
    setStatus(statusParts.join(' · '));

    buildEdadSexo(mapEdadH, mapEdadM);
    buildDptoPET(mapDeptoPET);
    buildCateOcu(mapCateOcu);
    buildOcuDesocDonut(totalOcu, totalDes);
    buildIPSCate(mapCateOcu, mapCateIPS, mapCateJub);
    buildIPSDonut(totalIPS, totalOcu);
    buildEducEdad(rows);
    updateMaps(mapDeptoPET, mapDeptoPEA);
    buildHistLab(mapTrimLab);
    buildHistSalud(mapTrimSalud);
    buildHistSML(mapTrimSML);
}

// ── Charts ────────────────────────────────────────────────────
function buildEdadSexo(edadH, edadM) {
    const B = getBase();
    const g = ['15-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    const h = g.map(x => edadH[x] || 0), m = g.map(x => edadM[x] || 0);
    const mx = Math.max(...h, ...m, 1);
    Plotly.react('ch-edad-sexo', [
        { x: h.map(v => -v), y: g, type: 'bar', orientation: 'h', name: 'Hombres', marker: { color: C.blue }, customdata: h, hovertemplate: '<b>%{y}</b>: %{customdata:,.0f}<extra>Hombres</extra>' },
        { x: m, y: g, type: 'bar', orientation: 'h', name: 'Mujeres', marker: { color: '#DB2777' }, hovertemplate: '<b>%{y}</b>: %{x:,.0f}<extra>Mujeres</extra>' }
    ], { ...B, barmode: 'relative', xaxis: { gridcolor: B.gridColor, tickvals: [-mx, -mx / 2, 0, mx / 2, mx].map(Math.round), ticktext: [fmtN(mx), fmtN(mx / 2), '0', fmtN(mx / 2), fmtN(mx)] }, yaxis: { gridcolor: B.gridColor } }, PLY_CFG);
}

function buildDptoPET(mapDpto) {
    const B = getBase(); const s = Object.entries(mapDpto).sort((a, b) => a[1] - b[1]).slice(-10);
    Plotly.react('ch-dpto-pet', [{
        x: s.map(d => d[1]), y: s.map(d => d[0]), type: 'bar', orientation: 'h',
        marker: { color: s.map(d => d[1]), colorscale: [[0, '#EFF6FF'], [1, C.blue]], showscale: false },
        hovertemplate: '<b>%{y}</b><br>PET: %{x:,.0f}<extra></extra>',
        text: s.map(d => fmtN(d[1])), textposition: 'outside', textfont: { color: B.font.color }
    }], { ...B, showlegend: false, xaxis: { gridcolor: B.gridColor }, yaxis: { automargin: true, tickfont: { size: 11 } } }, PLY_CFG);
}

function buildCateOcu(mapCate) {
    const B = getBase(); const items = Object.entries(mapCate).sort((a, b) => a[1] - b[1]);
    Plotly.react('ch-cate-ocupa', [{
        x: items.map(d => d[1]), y: items.map(d => d[0]), type: 'bar', orientation: 'h',
        marker: { color: items.map((_, i) => PAL[i % PAL.length]) },
        hovertemplate: '<b>%{y}</b><br>%{x:,.0f} ocupados<extra></extra>',
        text: items.map(d => fmtN(d[1])), textposition: 'outside', textfont: { color: B.font.color }
    }], { ...B, showlegend: false, xaxis: { gridcolor: B.gridColor }, yaxis: { automargin: true, tickfont: { size: 10 } }, margin: { l: 120, r: 60, t: 10, b: 40 } }, PLY_CFG);
}

function buildOcuDesocDonut(ocu, des) {
    const B = getBase();
    Plotly.react('ch-ocu-desoc', [{
        values: [ocu, des], labels: ['Ocupados', 'Desocupados'], type: 'pie', hole: .58,
        marker: { colors: [C.green, C.red], line: { color: B.paper_bgcolor, width: 2 } },
        hovertemplate: '<b>%{label}</b>: %{value:,.0f}<extra></extra>',
        textinfo: 'label+percent', textposition: 'outside', textfont: { color: B.font.color }
    }], { ...B, showlegend: false, margin: { l: 20, r: 20, t: 20, b: 20 } }, PLY_CFG);
}

function buildIPSCate(mapCate, mapIPS, mapJub) {
    const B = getBase(); const cts = Object.keys(mapCate).filter(c => mapCate[c] > 0).sort();
    const pi = cts.map(c => (mapIPS[c] || 0) / mapCate[c] * 100);
    const pj = cts.map(c => (mapJub[c] || 0) / mapCate[c] * 100);
    Plotly.react('ch-ips-cate', [
        { x: cts, y: pi, type: 'bar', name: 'IPS (%)', marker: { color: 'rgba(13,148,136,0.75)', line: { color: C.teal, width: 1 } }, hovertemplate: '<b>%{x}</b><br>IPS: %{y:.1f}%<extra></extra>' },
        { x: cts, y: pj, type: 'bar', name: 'Jubilación (%)', marker: { color: 'rgba(217,119,6,0.75)', line: { color: C.amber, width: 1 } }, hovertemplate: '<b>%{x}</b><br>Jub: %{y:.1f}%<extra></extra>' }
    ], { ...B, barmode: 'group', xaxis: { gridcolor: B.gridColor, automargin: true, tickangle: -20 }, yaxis: { gridcolor: B.gridColor, title: '%', range: [0, 105] } }, PLY_CFG);
}

function buildIPSDonut(ips, ocu) {
    const B = getBase();
    Plotly.react('ch-ips-donut', [{
        values: [ips, Math.max(0, ocu - ips)], labels: ['Con IPS', 'Sin IPS'], type: 'pie', hole: .58,
        marker: { colors: [C.teal, '#CBD5E1'], line: { color: B.paper_bgcolor, width: 2 } },
        hovertemplate: '<b>%{label}</b>: %{value:,.0f}<extra></extra>',
        textinfo: 'label+percent', textposition: 'outside', textfont: { color: B.font.color }
    }], { ...B, showlegend: false, margin: { l: 20, r: 20, t: 20, b: 20 } }, PLY_CFG);
}

function buildEducEdad(rows) {
    const B = getBase(); const g = ['15-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    const mP = {}, mA = {};
    rows.forEach(d => { const e = d.tramo_edad; if (!e || e === 'NR') return; mP[e] = (mP[e] || 0) + Number(d.personas_pet || 0); mA[e] = (mA[e] || 0) + Number(d.anios_estudio_pond || 0); });
    const avg = g.map(x => mP[x] > 0 ? +(mA[x] / mP[x]).toFixed(2) : 0);
    Plotly.react('ch-educ-edad', [{
        x: g, y: avg, type: 'bar', marker: { color: avg.map(v => +v), colorscale: [[0, '#EFF6FF'], [1, C.purple]], showscale: false },
        hovertemplate: '<b>%{x}</b><br>%{y:.1f} años<extra></extra>',
        text: avg.map(v => v.toFixed(1) + ' años'), textposition: 'outside', textfont: { color: B.font.color }
    }], { ...B, showlegend: false, xaxis: { gridcolor: B.gridColor }, yaxis: { title: 'Años', gridcolor: B.gridColor, range: [0, 14] } }, PLY_CFG);
}

// ── Historical ────────────────────────────────────────────────
function buildHistLab(mapTrim) {
    const B = getBase(); const tr = Object.keys(mapTrim).sort();
    const tft = tr.map(t => mapTrim[t].pet > 0 ? ((mapTrim[t].ocu + mapTrim[t].des) / mapTrim[t].pet * 100) : null);
    const to = tr.map(t => mapTrim[t].pet > 0 ? (mapTrim[t].ocu / mapTrim[t].pet * 100) : null);
    const td = tr.map(t => { const p = mapTrim[t].ocu + mapTrim[t].des; return p > 0 ? (mapTrim[t].des / p * 100) : null; });
    const mk = (y, n, c) => ({ x: tr, y, name: n, type: 'scatter', mode: 'lines+markers', line: { color: c, width: 2.5, shape: 'spline' }, marker: { size: 5, color: c }, hovertemplate: `<b>${n}</b>: %{y:.1f}%<extra></extra>`, connectgaps: false });
    Plotly.react('ch-hist-lab', [mk(tft, 'TFT (%)', C.blue), mk(to, 'Tasa Ocupación (%)', C.green), mk(td, 'Tasa Desocupación (%)', C.red)],
        { ...B, hovermode: 'x unified', xaxis: { title: 'Trimestre', gridcolor: B.gridColor, tickangle: -40, automargin: true }, yaxis: { title: '%', gridcolor: B.gridColor }, margin: { l: 52, r: 16, t: 10, b: 90 } }, PLY_CFG);
}
function buildHistSalud(mapTrim) {
    const B = getBase(); const tr = Object.keys(mapTrim).sort();
    const ip = tr.map(t => mapTrim[t].ocu > 0 ? (mapTrim[t].ips / mapTrim[t].ocu * 100) : null);
    const jb = tr.map(t => mapTrim[t].ocu > 0 ? (mapTrim[t].jub / mapTrim[t].ocu * 100) : null);
    Plotly.react('ch-hist-salud', [
        { x: tr, y: ip, name: 'IPS (%)', type: 'scatter', mode: 'lines+markers', line: { color: C.teal, width: 2.5, shape: 'spline' }, marker: { size: 5, color: C.teal }, hovertemplate: '<b>IPS</b>: %{y:.1f}%<extra></extra>', connectgaps: false },
        { x: tr, y: jb, name: 'Jubilación (%)', type: 'scatter', mode: 'lines+markers', line: { color: C.amber, width: 2.5, shape: 'spline' }, marker: { size: 5, color: C.amber }, hovertemplate: '<b>Jub</b>: %{y:.1f}%<extra></extra>', connectgaps: false }
    ], { ...B, hovermode: 'x unified', xaxis: { title: 'Trimestre', gridcolor: B.gridColor, tickangle: -40, automargin: true }, yaxis: { title: '%', gridcolor: B.gridColor }, margin: { l: 52, r: 16, t: 10, b: 90 } }, PLY_CFG);
}
function buildHistSML(mapTrim) {
    const B = getBase(); const tr = Object.keys(mapTrim).sort();
    if (!tr.length) { Plotly.react('ch-hist-sml', [], { ...B, annotations: [{ text: 'Sin datos de Obreros Privados', showarrow: false, font: { color: B.font.color, size: 13 }, xref: 'paper', yref: 'paper', x: .5, y: .5 }] }, PLY_CFG); return; }
    const cats = ['Menos de 1 SML', '1 SML', 'Más de 1 SML'], colors = [C.red, C.amber, C.green];
    const gs = t => cats.reduce((s, c) => s + (mapTrim[t][c] || 0), 0);
    Plotly.react('ch-hist-sml', cats.map((c, i) => ({
        x: tr, y: tr.map(t => { const s = gs(t); return s > 0 ? (mapTrim[t][c] || 0) / s * 100 : 0; }),
        name: c, type: 'bar', marker: { color: colors[i] }, hovertemplate: `<b>${c}</b>: %{y:.1f}%<extra></extra>`
    })), { ...B, barmode: 'stack', xaxis: { title: 'Trimestre', gridcolor: B.gridColor, tickangle: -40, automargin: true }, yaxis: { title: '%', gridcolor: B.gridColor, range: [0, 101] }, hovermode: 'x', margin: { l: 52, r: 16, t: 10, b: 90 } }, PLY_CFG);
}

// ── Leaflet Maps ──────────────────────────────────────────────
function initMaps() {
    ['map-demo', 'map-laboral'].forEach(id => {
        const m = L.map(id, { zoomControl: true }).fitBounds(PY_BOUNDS);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CartoDB', maxZoom: 18 }).addTo(m);
        maps[id] = m;
    });
}
function updateMaps(mapDeptoPET, mapDeptoPEA) {
    if (!geojsonData) return;
    const mx = Math.max(...Object.values(mapDeptoPET), 1);
    drawChoropleth(maps['map-demo'], 'demo', mapDeptoPET, val => { const r = val / mx; return r > .6 ? '#1d4ed8' : r > .3 ? '#3b82f6' : r > .1 ? '#93c5fd' : '#bfdbfe'; },
        (n, v) => `<b style="color:#2563EB">${n}</b><br>PET: <b>${fmtN(v)}</b>`);
    drawChoropleth(maps['map-laboral'], 'laboral', mapDeptoPEA, val => { const t = val.pet > 0 ? val.pea / val.pet : 0; return t > .70 ? '#065f46' : t > .60 ? '#059669' : t > .50 ? '#34d399' : '#a7f3d0'; },
        (n, v) => { const t = v.pet > 0 ? (v.pea / v.pet * 100).toFixed(1) : 'N/D'; return `<b style="color:#0D9488">${n}</b><br>TFT: <b>${t}%</b><br>PET: ${fmtN(v.pet)}`; });
}
function drawChoropleth(map, key, dataMap, colorFn, tooltipFn) {
    if (activeLayers[key]) map.removeLayer(activeLayers[key]);
    activeLayers[key] = L.geoJSON(geojsonData, {
        style: f => {
            const raw = f.properties.dpto_name || f.properties.dpto || f.properties.name || '';
            const match = Object.keys(dataMap).find(k => norm(k) === norm(raw));
            const val = match ? dataMap[match] : (key === 'laboral' ? { pet: 0, pea: 0 } : 0);
            return { fillColor: colorFn(val || 0), fillOpacity: .75, color: 'white', weight: 1.5 };
        },
        onEachFeature: (f, layer) => {
            const raw = f.properties.dpto_name || f.properties.dpto || f.properties.name || '—';
            const match = Object.keys(dataMap).find(k => norm(k) === norm(raw));
            const val = match ? dataMap[match] : (key === 'laboral' ? { pet: 0, pea: 0 } : 0);
            const pop = L.popup({ closeButton: false, offset: [0, -4] }).setContent(`<div style="font-family:'Inter',sans-serif;font-size:13px;padding:2px 4px">${tooltipFn(raw, val)}</div>`);
            layer.on({ mouseover: e => { e.target.setStyle({ fillOpacity: .92, weight: 2.5 }); layer.bindPopup(pop).openPopup(); }, mouseout: e => { activeLayers[key].resetStyle(e.target); layer.closePopup(); } });
        }
    }).addTo(map);
    setTimeout(() => map.invalidateSize(), 200);
}
const norm = s => s ? s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '') : '';

// ── Metodología ───────────────────────────────────────────────
function loadMetodologia() {
    fetch('data/metodologia.md').then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(md => { const el = document.getElementById('met-content'); el.innerHTML = marked.parse(md); buildTOC(el); })
        .catch(e => { document.getElementById('met-content').innerHTML = `<p style="color:#DC2626">Error: ${e.message}</p>`; });
}
function buildTOC(el) {
    const toc = document.getElementById('met-toc'); toc.innerHTML = '';
    el.querySelectorAll('h2,h3').forEach((h, i) => {
        h.id = 'met-s' + i; const a = document.createElement('a');
        a.href = '#met-s' + i; a.className = 'toc-link ' + h.tagName.toLowerCase(); a.textContent = h.textContent;
        a.onclick = e => { e.preventDefault(); h.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
        toc.appendChild(a);
    });
}

// ── Utilities ─────────────────────────────────────────────────
const fmtN = n => n != null ? new Intl.NumberFormat('es-PY').format(Math.round(n)) : '—';
const pct = r => (r * 100).toFixed(1) + ' %';
const setText = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
const setStatus = msg => setText('filter-status', msg);
window.dlChart = (id, name) => Plotly.downloadImage(id, { format: 'png', width: 1400, height: 700, filename: name });
