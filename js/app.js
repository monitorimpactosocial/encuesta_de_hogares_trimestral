"use strict";

/* ════════════════════════════════════════════════════════════
   TABLERO EPHC — app.js  v3
   Datos: datos_consolidados.json con campos:
     sexo='Hombres'/'Mujeres', tramo_edad='15-24'..., departamento,
     categocupa, trimestre_desc='2024Trim3', anio (int), trimestre_num (1-4)
     personas_pet, ocupados, desocupados, aporta_ips, aporta_jub,
     anios_estudio_pond, sml_cat
   Mejoras v3: dark-mode toggle, tooltip ℹ️, section scroll-spy,
     mapa con dpto_name correcto + fitBounds Paraguay
════════════════════════════════════════════════════════════ */

// ── Globals ───────────────────────────────────────────────────
let cf, dimTrimAnio, dimTrimNum, dimSexo, dimEdad, dimDpto, dimCate;
let geojsonData = null;
let maps = {};
let activeLayers = {};

// Paraguay approximate bounds for fitBounds
const PY_BOUNDS = [[-27.6, -62.7], [-19.3, -54.3]];

// Plotly / chart config
const PLY_CFG = {
    responsive: true, displayModeBar: true,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
    toImageButtonOptions: { format: 'png', scale: 2 }
};

function getBase() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = dark ? 'rgba(255,255,255,0.06)' : '#F1F5F9';
    const fontColor = dark ? '#CBD5E1' : '#475569';
    const surfColow = dark ? '#1E293B' : 'white';
    return {
        paper_bgcolor: surfColow, plot_bgcolor: surfColow,
        font: { family: "'Inter',system-ui,sans-serif", size: 12, color: fontColor },
        margin: { l: 52, r: 16, t: 10, b: 48 },
        showlegend: true,
        legend: {
            orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1,
            font: { color: fontColor }
        },
        gridColor
    };
}

const C = {
    blue: '#2563EB', green: '#16A34A', red: '#DC2626',
    amber: '#D97706', teal: '#0D9488', purple: '#7C3AED'
};
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

// ── Theme (dark mode) ─────────────────────────────────────────
function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    const saved = localStorage.getItem('ephc-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    btn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('ephc-theme', next);
        btn.title = next === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
        // Re-render Plotly charts with new colors
        setTimeout(reRenderAllCharts, 50);
        // Leaflet tile toggle handled by CSS filter
    });
}

function reRenderAllCharts() {
    const B = getBase();
    const chartIds = ['ch-edad-sexo', 'ch-dpto-pet', 'ch-cate-ocupa', 'ch-ocu-desoc',
        'ch-ips-cate', 'ch-ips-donut', 'ch-educ-edad',
        'ch-hist-lab', 'ch-hist-salud', 'ch-hist-sml'];
    chartIds.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.data) {
            Plotly.relayout(id, {
                paper_bgcolor: B.paper_bgcolor,
                plot_bgcolor: B.plot_bgcolor,
                font: B.font,
                legend: B.legend
            });
        }
    });
}

// ── Tooltip system ────────────────────────────────────────────
function initTooltips() {
    const bubble = document.getElementById('tooltip-bubble');
    let hideTimer;

    document.querySelectorAll('.info-btn[data-tip]').forEach(btn => {
        btn.addEventListener('mouseenter', e => {
            clearTimeout(hideTimer);
            bubble.textContent = btn.dataset.tip;
            bubble.classList.add('visible');
            positionBubble(e.clientX, e.clientY);
        });
        btn.addEventListener('mousemove', e => positionBubble(e.clientX, e.clientY));
        btn.addEventListener('mouseleave', () => {
            hideTimer = setTimeout(() => bubble.classList.remove('visible'), 100);
        });
        btn.addEventListener('click', e => {
            e.stopPropagation();
            // Toggle on mobile
            if (bubble.classList.contains('visible')) {
                bubble.classList.remove('visible');
            } else {
                bubble.textContent = btn.dataset.tip;
                bubble.classList.add('visible');
                positionBubble(e.clientX, e.clientY);
            }
        });
    });

    document.addEventListener('click', () => bubble.classList.remove('visible'));
}

function positionBubble(cx, cy) {
    const bubble = document.getElementById('tooltip-bubble');
    const bW = 290, bH = 80;
    let left = cx + 12;
    let top = cy + 8;
    if (left + bW > window.innerWidth - 8) left = cx - bW - 8;
    if (top + bH > window.innerHeight - 8) top = cy - bH - 8;
    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
}

// ── Section nav scroll-spy ────────────────────────────────────
function initScrollSpy() {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                // Update active snav-link in all section-navs
                document.querySelectorAll('.snav-link').forEach(link => {
                    const href = link.getAttribute('href');
                    if (href === '#' + id) {
                        link.classList.add('active');
                    } else if (link.closest('.section-nav') === entry.target.closest('.tab-pane')?.querySelector('.section-nav') || true) {
                        // Only clear within the same snav
                        const sameNav = document.querySelectorAll(`[href="#${id}"]`);
                        sameNav.forEach(sl => {
                            const nav = sl.closest('.section-nav');
                            if (nav) {
                                nav.querySelectorAll('.snav-link').forEach(l => l.classList.remove('active'));
                                sl.classList.add('active');
                            }
                        });
                    }
                });
            }
        });
    }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

    document.querySelectorAll('.scroll-anchor').forEach(el => observer.observe(el));
}

function initSectionNavLinks() {
    document.querySelectorAll('.snav-link[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const target = document.getElementById(link.getAttribute('href').slice(1));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
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
            setTimeout(() => { Object.values(maps).forEach(m => { try { m.invalidateSize(); } catch (e) { } }); }, 300);
        });
    });
}

function initSidebarToggle() {
    const btn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('app-main');
    btn.addEventListener('click', () => {
        if (window.innerWidth >= 900) {
            sidebar.classList.toggle('hidden');
            main.classList.toggle('full');
        } else {
            sidebar.classList.toggle('shown');
        }
    });
}

// ── Data Loading ──────────────────────────────────────────────
async function loadData() {
    setStatus('Cargando datos EPHC…');
    try {
        const [dataResp, geoResp] = await Promise.all([
            fetch('datos_consolidados.json'),
            fetch('departamentos.geojson')
        ]);
        if (!dataResp.ok) throw new Error('No se encontró datos_consolidados.json');
        const raw = await dataResp.json();
        geojsonData = await geoResp.json();

        initCrossfilter(raw);
        populateFilterControls();
        initMaps();
        updateDashboard();
    } catch (e) {
        setStatus('Error: ' + e.message);
        console.error('loadData error:', e);
    }
}

function initCrossfilter(data) {
    cf = crossfilter(data);
    dimTrimAnio = cf.dimension(d => d.anio != null ? String(d.anio) : 'NR');
    dimTrimNum = cf.dimension(d => d.trimestre_num != null ? String(d.trimestre_num) : 'NR');
    dimSexo = cf.dimension(d => d.sexo || 'NR');          // 'Hombres'|'Mujeres'
    dimEdad = cf.dimension(d => d.tramo_edad || 'NR');    // '15-24','25-34',...
    dimDpto = cf.dimension(d => d.departamento || 'NR');  // dept name
    dimCate = cf.dimension(d => d.categocupa || 'NR');
}

// ── Filter Controls ───────────────────────────────────────────
function populateFilterControls() {
    const all = cf.all();
    const anios = [...new Set(all.map(d => d.anio).filter(x => x != null))].sort();
    const trimNums = [...new Set(all.map(d => d.trimestre_num).filter(x => x != null))].sort();
    const dptos = [...new Set(all.map(d => d.departamento).filter(x => x && x !== 'NR'))].sort();
    const cates = [...new Set(all.map(d => d.categocupa).filter(x => x && x !== 'NR'))].sort();

    const selAnio = document.getElementById('f-anio');
    anios.forEach(a => selAnio.add(new Option(a, String(a))));

    const selTrim = document.getElementById('f-trimestre');
    const trimLabels = { 1: 'Trim 1 (Ene-Mar)', 2: 'Trim 2 (Abr-Jun)', 3: 'Trim 3 (Jul-Sep)', 4: 'Trim 4 (Oct-Dic)' };
    trimNums.forEach(n => selTrim.add(new Option(trimLabels[n] || 'Trim ' + n, String(n))));

    const selDpto = document.getElementById('f-dpto');
    dptos.forEach(d => selDpto.add(new Option(d, d)));

    const selCate = document.getElementById('f-cate');
    cates.forEach(c => selCate.add(new Option(c, c)));

    selAnio.addEventListener('change', applyFilters);
    selTrim.addEventListener('change', applyFilters);
    document.querySelectorAll('#f-sexo .t-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#f-sexo .t-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyFilters();
        });
    });
    document.querySelectorAll('#f-edad .t-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#f-edad .t-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyFilters();
        });
    });
    selDpto.addEventListener('change', applyFilters);
    selCate.addEventListener('change', applyFilters);
    document.getElementById('btn-reset').addEventListener('click', resetFilters);
}

function applyFilters() {
    const anio = document.getElementById('f-anio').value;
    const trim = document.getElementById('f-trimestre').value;
    const sexo = document.querySelector('#f-sexo .t-btn.active')?.dataset.val || 'ALL';
    const edad = document.querySelector('#f-edad .t-chip.active')?.dataset.val || 'ALL';
    const dpto = document.getElementById('f-dpto').value;
    const cate = document.getElementById('f-cate').value;

    dimTrimAnio.filterFunction(d => anio === 'ALL' || d === anio);
    dimTrimNum.filterFunction(d => trim === 'ALL' || d === trim);
    dimSexo.filterFunction(d => sexo === 'ALL' || d === sexo);   // 'Hombres'|'Mujeres'
    dimEdad.filterFunction(d => edad === 'ALL' || d === edad);
    dimDpto.filterFunction(d => dpto === 'ALL' || d === dpto);
    dimCate.filterFunction(d => cate === 'ALL' || d === cate);

    updateDashboard();
}

function resetFilters() {
    dimTrimAnio.filterAll(); dimTrimNum.filterAll(); dimSexo.filterAll();
    dimEdad.filterAll(); dimDpto.filterAll(); dimCate.filterAll();
    document.getElementById('f-anio').value = 'ALL';
    document.getElementById('f-trimestre').value = 'ALL';
    document.getElementById('f-dpto').value = 'ALL';
    document.getElementById('f-cate').value = 'ALL';
    document.querySelectorAll('#f-sexo .t-btn, #f-edad .t-chip').forEach(b => b.classList.remove('active'));
    const allS = document.querySelector('#f-sexo .t-btn[data-val="ALL"]');
    const allE = document.querySelector('#f-edad .t-chip[data-val="ALL"]');
    if (allS) allS.classList.add('active');
    if (allE) allE.classList.add('active');
    updateDashboard();
}

// ── Core Update ───────────────────────────────────────────────
function updateDashboard() {
    const rows = dimDpto.top(Infinity);

    let totalPET = 0, totalOcu = 0, totalDes = 0, totalIPS = 0, totalJub = 0, totalAnios = 0;
    const mapEdadH = {}, mapEdadM = {};
    const mapDeptoPET = {}, mapDeptoPEA = {};
    const mapCateOcu = {}, mapCateIPS = {}, mapCateJub = {};
    const mapTrimLab = {}, mapTrimSalud = {}, mapTrimSML = {};
    const trimSet = new Set();

    rows.forEach(d => {
        const pet = +(d.personas_pet || 0);
        const ocu = +(d.ocupados || 0);
        const des = +(d.desocupados || 0);
        const ips = +(d.aporta_ips || 0);
        const jub = +(d.aporta_jub || 0);
        const anios = +(d.anios_estudio_pond || 0);
        const cate = d.categocupa;
        const dpto = d.departamento;
        const sexo = d.sexo;            // 'Hombres'|'Mujeres'
        const edad = d.tramo_edad;      // '15-24','25-34',...
        const trim = d.trimestre_desc;  // '2024Trim3'

        totalPET += pet;
        totalOcu += ocu;
        totalDes += des;
        totalIPS += ips;
        totalJub += jub;
        totalAnios += anios;
        if (trim) trimSet.add(trim);

        // Age-sex pyramid
        if (edad && edad !== 'NR') {
            if (sexo === 'Hombres') mapEdadH[edad] = (mapEdadH[edad] || 0) + pet;
            if (sexo === 'Mujeres') mapEdadM[edad] = (mapEdadM[edad] || 0) + pet;
        }

        // Dept
        if (dpto && dpto !== 'NR') {
            mapDeptoPET[dpto] = (mapDeptoPET[dpto] || 0) + pet;
            if (!mapDeptoPEA[dpto]) mapDeptoPEA[dpto] = { pet: 0, pea: 0 };
            mapDeptoPEA[dpto].pet += pet;
            mapDeptoPEA[dpto].pea += ocu + des;
        }

        // Occupation category
        if (cate && cate !== 'NR') {
            mapCateOcu[cate] = (mapCateOcu[cate] || 0) + ocu;
            mapCateIPS[cate] = (mapCateIPS[cate] || 0) + ips;
            mapCateJub[cate] = (mapCateJub[cate] || 0) + jub;
        }

        // Historical
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

    const PEA = totalOcu + totalDes;
    const nT = trimSet.size || 1;
    const petD = nT > 1 ? totalPET / nT : totalPET;

    // KPIs
    setText('kpi-pet', fmtN(petD) + (nT > 1 ? ' *' : ''));
    setText('kpi-to', totalPET > 0 ? pct(totalOcu / totalPET) : '—');
    setText('kpi-td', PEA > 0 ? pct(totalDes / PEA) : '—');
    setText('kpi-tft', totalPET > 0 ? pct(PEA / totalPET) : '—');
    setText('kpi-ips', totalOcu > 0 ? pct(totalIPS / totalOcu) : '—');
    setText('kpi-educ', totalPET > 0 ? (totalAnios / totalPET).toFixed(1) + ' años' : '—');

    const anioSel = document.getElementById('f-anio').value;
    const trimSel = document.getElementById('f-trimestre').value;
    const tLabel = { 1: 'T1', 2: 'T2', 3: 'T3', 4: 'T4' };
    setStatus(
        `${rows.length.toLocaleString('es-PY')} registros` +
        (anioSel !== 'ALL' ? ' · ' + anioSel : '') +
        (trimSel !== 'ALL' ? ' · ' + tLabel[trimSel] : '') +
        (nT > 1 ? ` · *PET: prom. de ${nT} trimestres` : '')
    );

    // Tab 1 charts
    buildEdadSexo(mapEdadH, mapEdadM);
    buildDptoPET(mapDeptoPET);
    buildCateOcu(mapCateOcu);
    buildOcuDesocDonut(totalOcu, totalDes);
    buildIPSCate(mapCateOcu, mapCateIPS, mapCateJub);
    buildIPSDonut(totalIPS, totalOcu);
    buildEducEdad(rows);

    // Maps
    updateMaps(mapDeptoPET, mapDeptoPEA);

    // Historical
    buildHistLab(mapTrimLab);
    buildHistSalud(mapTrimSalud);
    buildHistSML(mapTrimSML);
}

// ── Charts ────────────────────────────────────────────────────
function buildEdadSexo(edadH, edadM) {
    const B = getBase();
    const grupos = ['15-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    const h = grupos.map(g => edadH[g] || 0);
    const m = grupos.map(g => edadM[g] || 0);
    const max = Math.max(...h, ...m, 1);
    Plotly.react('ch-edad-sexo', [
        {
            x: h.map(v => -v), y: grupos, type: 'bar', orientation: 'h', name: 'Hombres',
            marker: { color: C.blue }, customdata: h,
            hovertemplate: '<b>%{y}</b>: %{customdata:,.0f}<extra>Hombres</extra>'
        },
        {
            x: m, y: grupos, type: 'bar', orientation: 'h', name: 'Mujeres',
            marker: { color: '#DB2777' },
            hovertemplate: '<b>%{y}</b>: %{x:,.0f}<extra>Mujeres</extra>'
        }
    ], {
        ...B, barmode: 'relative',
        xaxis: {
            gridcolor: B.gridColor, tickformat: ',.0f',
            tickvals: [-max, -max / 2, 0, max / 2, max].map(Math.round),
            ticktext: [fmtN(max), fmtN(max / 2), '0', fmtN(max / 2), fmtN(max)]
        },
        yaxis: { gridcolor: B.gridColor }
    }, PLY_CFG);
}

function buildDptoPET(mapDpto) {
    const B = getBase();
    const sorted = Object.entries(mapDpto).sort((a, b) => a[1] - b[1]).slice(-10);
    Plotly.react('ch-dpto-pet', [{
        x: sorted.map(d => d[1]), y: sorted.map(d => d[0]),
        type: 'bar', orientation: 'h',
        marker: { color: sorted.map(d => d[1]), colorscale: [[0, '#EFF6FF'], [1, C.blue]], showscale: false },
        hovertemplate: '<b>%{y}</b><br>PET: %{x:,.0f}<extra></extra>',
        text: sorted.map(d => fmtN(d[1])), textposition: 'outside', textfont: { color: B.font.color }
    }], {
        ...B, showlegend: false,
        xaxis: { gridcolor: B.gridColor }, yaxis: { automargin: true, tickfont: { size: 11 } }
    }, PLY_CFG);
}

function buildCateOcu(mapCate) {
    const B = getBase();
    const items = Object.entries(mapCate).sort((a, b) => a[1] - b[1]);
    Plotly.react('ch-cate-ocupa', [{
        x: items.map(d => d[1]), y: items.map(d => d[0]),
        type: 'bar', orientation: 'h',
        marker: { color: items.map((_, i) => PAL[i % PAL.length]) },
        hovertemplate: '<b>%{y}</b><br>%{x:,.0f} ocupados<extra></extra>',
        text: items.map(d => fmtN(d[1])), textposition: 'outside', textfont: { color: B.font.color }
    }], {
        ...B, showlegend: false,
        xaxis: { gridcolor: B.gridColor }, yaxis: { automargin: true, tickfont: { size: 10 } },
        margin: { l: 120, r: 60, t: 10, b: 40 }
    }, PLY_CFG);
}

function buildOcuDesocDonut(ocu, des) {
    const B = getBase();
    Plotly.react('ch-ocu-desoc', [{
        values: [ocu, des], labels: ['Ocupados', 'Desocupados'], type: 'pie', hole: 0.58,
        marker: { colors: [C.green, C.red], line: { color: B.paper_bgcolor, width: 2 } },
        hovertemplate: '<b>%{label}</b>: %{value:,.0f}<extra></extra>',
        textinfo: 'label+percent', textposition: 'outside', textfont: { color: B.font.color }
    }], { ...B, showlegend: false, margin: { l: 20, r: 20, t: 20, b: 20 } }, PLY_CFG);
}

function buildIPSCate(mapCate, mapIPS, mapJub) {
    const B = getBase();
    const cates = Object.keys(mapCate).filter(c => mapCate[c] > 0).sort();
    const pIPS = cates.map(c => mapCate[c] > 0 ? (mapIPS[c] || 0) / mapCate[c] * 100 : 0);
    const pJub = cates.map(c => mapCate[c] > 0 ? (mapJub[c] || 0) / mapCate[c] * 100 : 0);
    Plotly.react('ch-ips-cate', [
        {
            x: cates, y: pIPS, type: 'bar', name: 'IPS (%)',
            marker: { color: 'rgba(13,148,136,0.75)', line: { color: C.teal, width: 1 } },
            hovertemplate: '<b>%{x}</b><br>IPS: %{y:.1f}%<extra></extra>'
        },
        {
            x: cates, y: pJub, type: 'bar', name: 'Jubilación (%)',
            marker: { color: 'rgba(217,119,6,0.75)', line: { color: C.amber, width: 1 } },
            hovertemplate: '<b>%{x}</b><br>Jub: %{y:.1f}%<extra></extra>'
        }
    ], {
        ...B, barmode: 'group',
        xaxis: { gridcolor: B.gridColor, automargin: true, tickangle: -20 },
        yaxis: { gridcolor: B.gridColor, title: '%', range: [0, 105] }
    }, PLY_CFG);
}

function buildIPSDonut(ips, ocu) {
    const B = getBase();
    Plotly.react('ch-ips-donut', [{
        values: [ips, Math.max(0, ocu - ips)], labels: ['Con IPS', 'Sin IPS'], type: 'pie', hole: 0.58,
        marker: { colors: [C.teal, '#CBD5E1'], line: { color: B.paper_bgcolor, width: 2 } },
        hovertemplate: '<b>%{label}</b>: %{value:,.0f}<extra></extra>',
        textinfo: 'label+percent', textposition: 'outside', textfont: { color: B.font.color }
    }], { ...B, showlegend: false, margin: { l: 20, r: 20, t: 20, b: 20 } }, PLY_CFG);
}

function buildEducEdad(rows) {
    const B = getBase();
    const grupos = ['15-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    const mapPET = {}, mapAnios = {};
    rows.forEach(d => {
        const g = d.tramo_edad;
        if (!g || g === 'NR') return;
        mapPET[g] = (mapPET[g] || 0) + +(d.personas_pet || 0);
        mapAnios[g] = (mapAnios[g] || 0) + +(d.anios_estudio_pond || 0);
    });
    const avg = grupos.map(g => mapPET[g] > 0 ? +(mapAnios[g] / mapPET[g]).toFixed(2) : 0);
    Plotly.react('ch-educ-edad', [{
        x: grupos, y: avg, type: 'bar',
        marker: { color: avg.map(v => +v), colorscale: [[0, '#EFF6FF'], [1, C.purple]], showscale: false },
        hovertemplate: '<b>%{x}</b><br>%{y:.1f} años<extra></extra>',
        text: avg.map(v => v.toFixed(1) + ' años'), textposition: 'outside', textfont: { color: B.font.color }
    }], {
        ...B, showlegend: false,
        xaxis: { gridcolor: B.gridColor }, yaxis: { title: 'Años', gridcolor: B.gridColor, range: [0, 14] }
    }, PLY_CFG);
}

// ── Historical Charts ─────────────────────────────────────────
function buildHistLab(mapTrim) {
    const B = getBase();
    const trims = Object.keys(mapTrim).sort();
    const tft = trims.map(t => mapTrim[t].pet > 0 ? ((mapTrim[t].ocu + mapTrim[t].des) / mapTrim[t].pet * 100) : null);
    const to = trims.map(t => mapTrim[t].pet > 0 ? (mapTrim[t].ocu / mapTrim[t].pet * 100) : null);
    const td = trims.map(t => { const p = mapTrim[t].ocu + mapTrim[t].des; return p > 0 ? (mapTrim[t].des / p * 100) : null; });
    const mk = (y, name, color) => ({
        x: trims, y, name, type: 'scatter', mode: 'lines+markers',
        line: { color, width: 2.5, shape: 'spline' }, marker: { size: 5, color },
        hovertemplate: `<b>${name}</b>: %{y:.1f}%<extra></extra>`, connectgaps: false
    });
    Plotly.react('ch-hist-lab',
        [mk(tft, 'TFT (%)', C.blue), mk(to, 'Tasa Ocupación (%)', C.green), mk(td, 'Tasa Desocupación (%)', C.red)],
        {
            ...B, hovermode: 'x unified',
            xaxis: { title: 'Trimestre', gridcolor: B.gridColor, tickangle: -40, automargin: true },
            yaxis: { title: '%', gridcolor: B.gridColor }, margin: { l: 52, r: 16, t: 10, b: 90 }
        }, PLY_CFG);
}

function buildHistSalud(mapTrim) {
    const B = getBase();
    const trims = Object.keys(mapTrim).sort();
    const ips = trims.map(t => mapTrim[t].ocu > 0 ? (mapTrim[t].ips / mapTrim[t].ocu * 100) : null);
    const jub = trims.map(t => mapTrim[t].ocu > 0 ? (mapTrim[t].jub / mapTrim[t].ocu * 100) : null);
    Plotly.react('ch-hist-salud', [
        {
            x: trims, y: ips, name: 'IPS (%)', type: 'scatter', mode: 'lines+markers',
            line: { color: C.teal, width: 2.5, shape: 'spline' }, marker: { size: 5, color: C.teal },
            hovertemplate: '<b>IPS</b>: %{y:.1f}%<extra></extra>', connectgaps: false
        },
        {
            x: trims, y: jub, name: 'Jubilación (%)', type: 'scatter', mode: 'lines+markers',
            line: { color: C.amber, width: 2.5, shape: 'spline' }, marker: { size: 5, color: C.amber },
            hovertemplate: '<b>Jubilación</b>: %{y:.1f}%<extra></extra>', connectgaps: false
        }
    ], {
        ...B, hovermode: 'x unified',
        xaxis: { title: 'Trimestre', gridcolor: B.gridColor, tickangle: -40, automargin: true },
        yaxis: { title: '%', gridcolor: B.gridColor }, margin: { l: 52, r: 16, t: 10, b: 90 }
    }, PLY_CFG);
}

function buildHistSML(mapTrim) {
    const B = getBase();
    const trims = Object.keys(mapTrim).sort();
    if (!trims.length) {
        Plotly.react('ch-hist-sml', [], {
            ...B,
            annotations: [{
                text: 'Sin datos de Obreros Privados con el filtro actual',
                showarrow: false, font: { color: B.font.color, size: 13 }, xref: 'paper', yref: 'paper', x: .5, y: .5
            }]
        }, PLY_CFG);
        return;
    }
    const cats = ['Menos de 1 SML', '1 SML', 'Más de 1 SML'];
    const colors = [C.red, C.amber, C.green];
    const getSum = t => cats.reduce((s, c) => s + (mapTrim[t][c] || 0), 0);
    Plotly.react('ch-hist-sml', cats.map((cat, i) => ({
        x: trims,
        y: trims.map(t => { const s = getSum(t); return s > 0 ? (mapTrim[t][cat] || 0) / s * 100 : 0; }),
        name: cat, type: 'bar', marker: { color: colors[i] },
        hovertemplate: `<b>${cat}</b>: %{y:.1f}%<extra></extra>`
    })), {
        ...B, barmode: 'stack',
        xaxis: { title: 'Trimestre', gridcolor: B.gridColor, tickangle: -40, automargin: true },
        yaxis: { title: '%', gridcolor: B.gridColor, range: [0, 101] },
        hovermode: 'x', margin: { l: 52, r: 16, t: 10, b: 90 }
    }, PLY_CFG);
}

// ── Leaflet Maps ──────────────────────────────────────────────
function initMaps() {
    ['map-demo', 'map-laboral'].forEach(id => {
        const m = L.map(id, { zoomControl: true }).fitBounds(PY_BOUNDS);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            { attribution: '&copy; CartoDB', maxZoom: 18 }).addTo(m);
        maps[id] = m;
    });
}

function updateMaps(mapDeptoPET, mapDeptoPEA) {
    if (!geojsonData) return;
    const maxPET = Math.max(...Object.values(mapDeptoPET), 1);

    // PET map
    drawChoropleth(maps['map-demo'], 'demo', mapDeptoPET, val => {
        const r = val / maxPET;
        return r > .6 ? '#1d4ed8' : r > .3 ? '#3b82f6' : r > .1 ? '#93c5fd' : '#bfdbfe';
    }, (name, val) => `<b style="color:#2563EB">${name}</b><br>PET: <b>${fmtN(val)}</b>`);

    // TFT map
    drawChoropleth(maps['map-laboral'], 'laboral', mapDeptoPEA, val => {
        const tft = val.pet > 0 ? val.pea / val.pet : 0;
        return tft > .70 ? '#065f46' : tft > .60 ? '#059669' : tft > .50 ? '#34d399' : '#a7f3d0';
    }, (name, val) => {
        const tft = val.pet > 0 ? (val.pea / val.pet * 100).toFixed(1) : 'N/D';
        return `<b style="color:#0D9488">${name}</b><br>TFT: <b>${tft}%</b><br>PET: ${fmtN(val.pet)}`;
    });
}

function drawChoropleth(map, key, dataMap, colorFn, tooltipFn) {
    if (activeLayers[key]) map.removeLayer(activeLayers[key]);
    activeLayers[key] = L.geoJSON(geojsonData, {
        style: feature => {
            // Correct property: dpto_name
            const raw = feature.properties.dpto_name || feature.properties.dpto || feature.properties.name || '';
            const match = Object.keys(dataMap).find(k => normalizeStr(k) === normalizeStr(raw));
            const val = match ? dataMap[match] : (key === 'laboral' ? { pet: 0, pea: 0 } : 0);
            return { fillColor: colorFn(val || 0), fillOpacity: 0.75, color: 'white', weight: 1.5 };
        },
        onEachFeature: (feature, layer) => {
            const raw = feature.properties.dpto_name || feature.properties.dpto || feature.properties.name || '—';
            const match = Object.keys(dataMap).find(k => normalizeStr(k) === normalizeStr(raw));
            const val = match ? dataMap[match] : (key === 'laboral' ? { pet: 0, pea: 0 } : 0);
            const popup = L.popup({ closeButton: false, offset: [0, -4] })
                .setContent(`<div style="font-family:'Inter',sans-serif;font-size:13px;padding:2px 4px">${tooltipFn(raw, val)}</div>`);
            layer.on({
                mouseover: e => { e.target.setStyle({ fillOpacity: .92, weight: 2.5 }); layer.bindPopup(popup).openPopup(); },
                mouseout: e => { activeLayers[key].resetStyle(e.target); layer.closePopup(); }
            });
        }
    }).addTo(map);
    setTimeout(() => map.invalidateSize(), 200);
}

const normalizeStr = s => s ? s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '') : '';

// ── Metodología ───────────────────────────────────────────────
function loadMetodologia() {
    fetch('data/metodologia.md')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(md => {
            const el = document.getElementById('met-content');
            el.innerHTML = marked.parse(md);
            buildTOC(el);
        })
        .catch(e => {
            document.getElementById('met-content').innerHTML =
                `<p style="color:#DC2626">No se pudo cargar la metodología: ${e.message}</p>`;
        });
}

function buildTOC(el) {
    const toc = document.getElementById('met-toc');
    toc.innerHTML = '';
    el.querySelectorAll('h2,h3').forEach((h, i) => {
        h.id = 'met-s' + i;
        const a = document.createElement('a');
        a.href = '#met-s' + i;
        a.className = 'toc-link ' + h.tagName.toLowerCase();
        a.textContent = h.textContent;
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
