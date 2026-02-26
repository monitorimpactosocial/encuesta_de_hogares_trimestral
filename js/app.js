"use strict";

/* ════════════════════════════════════════════════════════════
   TABLERO EPHC — app.js  v2
   JSON fields: sexo='Hombres'/'Mujeres', tramo_edad='15-24'...,
   departamento, categocupa, trimestre_desc='2024Trim3',
   anio (numeric), trimestre_num (1-4)
   Numeric: personas_pet, ocupados, desocupados, aporta_ips,
            aporta_jub, anios_estudio_pond
════════════════════════════════════════════════════════════ */

// ── Globals ──────────────────────────────────────────────────
let cf, dimTrimAnio, dimTrimNum, dimSexo, dimEdad, dimDpto, dimCate;
let geojsonData = null;
let maps = {};
let activeLayers = {};

const PLY_CFG = {
    responsive: true, displayModeBar: true,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
    toImageButtonOptions: { format: 'png', scale: 2 }
};
const BASE = {
    paper_bgcolor: 'white', plot_bgcolor: 'white',
    font: { family: "'Inter',system-ui,sans-serif", size: 12, color: '#475569' },
    margin: { l: 52, r: 16, t: 10, b: 48 },
    showlegend: true,
    legend: { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1 }
};
const C = {
    blue: '#2563EB', green: '#16A34A', red: '#DC2626',
    amber: '#D97706', teal: '#0D9488', purple: '#7C3AED'
};
const PAL = ['#2563EB', '#0D9488', '#16A34A', '#D97706', '#7C3AED', '#DC2626', '#0284C7', '#EA580C'];

// ── App Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initSubTabs();
    initSidebarToggle();
    loadData();
    loadMetodologia();
});

// ── Tabs ──────────────────────────────────────────────────────
function initTabs() {
    document.querySelectorAll('.main-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
            window.dispatchEvent(new Event('resize'));
            Object.values(maps).forEach(m => { try { m.invalidateSize(); } catch (e) { } });
        });
    });
}

function initSubTabs() {
    document.querySelectorAll('.subtab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const parent = btn.closest('.tab-pane');
            parent.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
            parent.querySelectorAll('.subtab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.subtab).classList.add('active');
            window.dispatchEvent(new Event('resize'));
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
        if (!dataResp.ok) throw new Error('No se pudo cargar datos_consolidados.json');
        const raw = await dataResp.json();
        geojsonData = await geoResp.json();

        initCrossfilter(raw);
        populateFilterControls();
        initMaps();
        updateDashboard();
    } catch (e) {
        setStatus('Error: ' + e.message);
        console.error(e);
    }
}

function initCrossfilter(data) {
    cf = crossfilter(data);
    // Each row already has 'anio' numeric and 'trimestre_num'
    dimTrimAnio = cf.dimension(d => d.anio != null ? String(d.anio) : 'NR');
    dimTrimNum = cf.dimension(d => d.trimestre_num != null ? String(d.trimestre_num) : 'NR');
    dimSexo = cf.dimension(d => d.sexo || 'NR');          // 'Hombres'|'Mujeres'
    dimEdad = cf.dimension(d => d.tramo_edad || 'NR');    // '15-24' etc.
    dimDpto = cf.dimension(d => d.departamento || 'NR');  // dept name
    dimCate = cf.dimension(d => d.categocupa || 'NR');
}

// ── Populate Filter Controls ──────────────────────────────────
function populateFilterControls() {
    const all = cf.all();

    // Years
    const anios = [...new Set(all.map(d => d.anio).filter(x => x != null))].sort();
    const selAnio = document.getElementById('f-anio');
    anios.forEach(a => selAnio.add(new Option(a, String(a))));

    // Trimestres
    const trimNums = [...new Set(all.map(d => d.trimestre_num).filter(x => x != null))].sort();
    const selTrim = document.getElementById('f-trimestre');
    const trimLabels = { 1: 'Trim 1 (Ene-Mar)', 2: 'Trim 2 (Abr-Jun)', 3: 'Trim 3 (Jul-Sep)', 4: 'Trim 4 (Oct-Dic)' };
    trimNums.forEach(n => selTrim.add(new Option(trimLabels[n] || 'Trim ' + n, String(n))));

    // Departamento
    const dptos = [...new Set(all.map(d => d.departamento).filter(x => x && x !== 'NR'))].sort();
    const selDpto = document.getElementById('f-dpto');
    dptos.forEach(d => selDpto.add(new Option(d, d)));

    // Categoría Ocupacional
    const cates = [...new Set(all.map(d => d.categocupa).filter(x => x && x !== 'NR'))].sort();
    const selCate = document.getElementById('f-cate');
    cates.forEach(c => selCate.add(new Option(c, c)));

    // Events
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
    dimSexo.filterFunction(d => sexo === 'ALL' || d === sexo);    // 'Hombres' or 'Mujeres'
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
    const rows = dimDpto.top(Infinity);  // all filtered rows

    let totalPET = 0, totalOcu = 0, totalDes = 0;
    let totalIPS = 0, totalJub = 0, totalAnios = 0;

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
        const anios = +(d.anios_estudio_pond || 0);  // correct field
        const cate = d.categocupa;
        const dpto = d.departamento;                // correct field
        const sexo = d.sexo;                        // 'Hombres' or 'Mujeres'
        const edad = d.tramo_edad;                  // correct field
        const trim = d.trimestre_desc;              // '2024Trim3'

        totalPET += pet;
        totalOcu += ocu;
        totalDes += des;
        totalIPS += ips;
        totalJub += jub;
        totalAnios += anios;
        if (trim) trimSet.add(trim);

        // Age pyramid by sex — field 'sexo' has 'Hombres'|'Mujeres'
        if (edad && edad !== 'NR') {
            if (sexo === 'Hombres') mapEdadH[edad] = (mapEdadH[edad] || 0) + pet;
            if (sexo === 'Mujeres') mapEdadM[edad] = (mapEdadM[edad] || 0) + pet;
        }

        // Departamento aggregation
        if (dpto && dpto !== 'NR') {
            mapDeptoPET[dpto] = (mapDeptoPET[dpto] || 0) + pet;
            if (!mapDeptoPEA[dpto]) mapDeptoPEA[dpto] = { pet: 0, pea: 0 };
            mapDeptoPEA[dpto].pet += pet;
            mapDeptoPEA[dpto].pea += ocu + des;
        }

        // Category occupational
        if (cate && cate !== 'NR') {
            mapCateOcu[cate] = (mapCateOcu[cate] || 0) + ocu;
            mapCateIPS[cate] = (mapCateIPS[cate] || 0) + ips;
            mapCateJub[cate] = (mapCateJub[cate] || 0) + jub;
        }

        // Historical by trimestre
        if (trim && trim !== 'NR') {
            if (!mapTrimLab[trim]) mapTrimLab[trim] = { pet: 0, ocu: 0, des: 0 };
            mapTrimLab[trim].pet += pet;
            mapTrimLab[trim].ocu += ocu;
            mapTrimLab[trim].des += des;

            if (!mapTrimSalud[trim]) mapTrimSalud[trim] = { ocu: 0, ips: 0, jub: 0 };
            mapTrimSalud[trim].ocu += ocu;
            mapTrimSalud[trim].ips += ips;
            mapTrimSalud[trim].jub += jub;

            if (cate === 'Obrero privado' && d.sml_cat && d.sml_cat !== 'NR') {
                if (!mapTrimSML[trim]) mapTrimSML[trim] = { 'Menos de 1 SML': 0, '1 SML': 0, 'Más de 1 SML': 0 };
                mapTrimSML[trim][d.sml_cat] = (mapTrimSML[trim][d.sml_cat] || 0) + ocu;
            }
        }
    });

    const PEA = totalOcu + totalDes;
    // If multiple trimestres are selected, show per-trimestre average for PET
    const nT = trimSet.size || 1;
    const petDisplay = nT > 1 ? totalPET / nT : totalPET;

    // ── KPIs ──
    setText('kpi-pet', fmtN(petDisplay) + (nT > 1 ? '*' : ''));
    setText('kpi-to', totalPET > 0 ? pct(totalOcu / totalPET) : '—');
    setText('kpi-td', PEA > 0 ? pct(totalDes / PEA) : '—');
    setText('kpi-tft', totalPET > 0 ? pct(PEA / totalPET) : '—');
    setText('kpi-ips', totalOcu > 0 ? pct(totalIPS / totalOcu) : '—');
    setText('kpi-educ', totalPET > 0 ? (totalAnios / totalPET).toFixed(1) + ' años' : '—');

    const anioSel = document.getElementById('f-anio').value;
    const trimSel = document.getElementById('f-trimestre').value;
    const trimLabels = { 1: 'Trim 1', 2: 'Trim 2', 3: 'Trim 3', 4: 'Trim 4' };
    setStatus(
        `${rows.length.toLocaleString('es-PY')} registros — ` +
        (anioSel === 'ALL' ? 'Todos los años' : anioSel) + ' ' +
        (trimSel === 'ALL' ? '(todos los trimestres)' : trimLabels[trimSel] || '') +
        (nT > 1 ? ` — *PET promedio de ${nT} trimestres` : '')
    );

    // ── Charts Tab 1 ──
    buildEdadSexo(mapEdadH, mapEdadM);
    buildDptoPET(mapDeptoPET);
    buildCateOcu(mapCateOcu);
    buildOcuDesocDonut(totalOcu, totalDes);
    buildIPSCate(mapCateOcu, mapCateIPS, mapCateJub);
    buildIPSDonut(totalIPS, totalOcu);
    buildEducEdad(rows);
    // ── Maps ──
    updateMaps(mapDeptoPET, mapDeptoPEA);
    // ── Historical ──
    buildHistLab(mapTrimLab);
    buildHistSalud(mapTrimSalud);
    buildHistSML(mapTrimSML);
}

// ── Chart Builders ────────────────────────────────────────────
function buildEdadSexo(edadH, edadM) {
    const grupos = ['15-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    const h = grupos.map(g => edadH[g] || 0);
    const m = grupos.map(g => edadM[g] || 0);
    const maxVal = Math.max(...h, ...m, 1);
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
        ...BASE, barmode: 'relative',
        xaxis: {
            gridcolor: '#F1F5F9', tickformat: ',.0f',
            tickvals: [-maxVal, -maxVal / 2, 0, maxVal / 2, maxVal].map(Math.round),
            ticktext: [fmtN(maxVal), fmtN(maxVal / 2), '0', fmtN(maxVal / 2), fmtN(maxVal)]
        },
        yaxis: { gridcolor: '#F1F5F9' }
    }, PLY_CFG);
}

function buildDptoPET(mapDpto) {
    const sorted = Object.entries(mapDpto).sort((a, b) => a[1] - b[1]).slice(-10);
    Plotly.react('ch-dpto-pet', [{
        x: sorted.map(d => d[1]), y: sorted.map(d => d[0]),
        type: 'bar', orientation: 'h',
        marker: { color: sorted.map(d => d[1]), colorscale: [[0, '#EFF6FF'], [1, C.blue]], showscale: false },
        hovertemplate: '<b>%{y}</b><br>PET: %{x:,.0f}<extra></extra>',
        text: sorted.map(d => fmtN(d[1])), textposition: 'outside'
    }], {
        ...BASE, showlegend: false,
        xaxis: { gridcolor: '#F1F5F9' }, yaxis: { automargin: true, tickfont: { size: 11 } }
    }, PLY_CFG);
}

function buildCateOcu(mapCate) {
    const cates = Object.entries(mapCate).sort((a, b) => a[1] - b[1]);
    Plotly.react('ch-cate-ocupa', [{
        x: cates.map(d => d[1]), y: cates.map(d => d[0]),
        type: 'bar', orientation: 'h',
        marker: { color: cates.map((_, i) => PAL[i % PAL.length]) },
        hovertemplate: '<b>%{y}</b><br>%{x:,.0f} ocupados<extra></extra>',
        text: cates.map(d => fmtN(d[1])), textposition: 'outside'
    }], {
        ...BASE, showlegend: false,
        xaxis: { gridcolor: '#F1F5F9' }, yaxis: { automargin: true, tickfont: { size: 10 } },
        margin: { l: 120, r: 60, t: 10, b: 40 }
    }, PLY_CFG);
}

function buildOcuDesocDonut(ocu, des) {
    Plotly.react('ch-ocu-desoc', [{
        values: [ocu, des], labels: ['Ocupados', 'Desocupados'],
        type: 'pie', hole: 0.55,
        marker: { colors: [C.green, C.red], line: { color: 'white', width: 2 } },
        hovertemplate: '<b>%{label}</b>: %{value:,.0f}<extra></extra>',
        textinfo: 'label+percent', textposition: 'outside'
    }], { ...BASE, showlegend: false, margin: { l: 20, r: 20, t: 20, b: 20 } }, PLY_CFG);
}

function buildIPSCate(mapCate, mapIPS, mapJub) {
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
        ...BASE, barmode: 'group',
        xaxis: { gridcolor: '#F1F5F9', automargin: true, tickangle: -20 },
        yaxis: { gridcolor: '#F1F5F9', title: '%', range: [0, 105] }
    }, PLY_CFG);
}

function buildIPSDonut(ips, ocu) {
    Plotly.react('ch-ips-donut', [{
        values: [ips, Math.max(0, ocu - ips)], labels: ['Con IPS', 'Sin IPS'],
        type: 'pie', hole: 0.55,
        marker: { colors: [C.teal, '#CBD5E1'], line: { color: 'white', width: 2 } },
        hovertemplate: '<b>%{label}</b>: %{value:,.0f}<extra></extra>',
        textinfo: 'label+percent', textposition: 'outside'
    }], { ...BASE, showlegend: false, margin: { l: 20, r: 20, t: 20, b: 20 } }, PLY_CFG);
}

function buildEducEdad(rows) {
    const grupos = ['15-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    const mapPET = {}, mapAnios = {};
    rows.forEach(d => {
        const g = d.tramo_edad;  // correct field
        if (!g || g === 'NR') return;
        mapPET[g] = (mapPET[g] || 0) + +(d.personas_pet || 0);
        mapAnios[g] = (mapAnios[g] || 0) + +(d.anios_estudio_pond || 0);  // correct field
    });
    const avg = grupos.map(g => mapPET[g] > 0 ? +(mapAnios[g] / mapPET[g]).toFixed(2) : 0);
    Plotly.react('ch-educ-edad', [{
        x: grupos, y: avg, type: 'bar',
        marker: { color: avg.map(v => +v), colorscale: [[0, '#EFF6FF'], [1, C.purple]], showscale: false },
        hovertemplate: '<b>%{x}</b><br>%{y:.1f} años promedio<extra></extra>',
        text: avg.map(v => v.toFixed(1) + ' años'), textposition: 'outside'
    }], {
        ...BASE, showlegend: false,
        xaxis: { gridcolor: '#F1F5F9' }, yaxis: { title: 'Años promedio', gridcolor: '#F1F5F9', range: [0, 14] }
    }, PLY_CFG);
}

// ── Historical Charts ─────────────────────────────────────────
function buildHistLab(mapTrim) {
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
            ...BASE, hovermode: 'x unified',
            xaxis: { title: 'Trimestre', gridcolor: '#F1F5F9', tickangle: -40, automargin: true },
            yaxis: { title: '%', gridcolor: '#F1F5F9' }, margin: { l: 52, r: 16, t: 10, b: 90 }
        }, PLY_CFG);
}

function buildHistSalud(mapTrim) {
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
        ...BASE, hovermode: 'x unified',
        xaxis: { title: 'Trimestre', gridcolor: '#F1F5F9', tickangle: -40, automargin: true },
        yaxis: { title: '%', gridcolor: '#F1F5F9' }, margin: { l: 52, r: 16, t: 10, b: 90 }
    }, PLY_CFG);
}

function buildHistSML(mapTrim) {
    const trims = Object.keys(mapTrim).sort();
    if (!trims.length) {
        Plotly.react('ch-hist-sml', [], {
            ...BASE, annotations: [{
                text: 'Sin datos de Obreros Privados con este filtro',
                showarrow: false, font: { color: '#94A3B8' }, xref: 'paper', yref: 'paper', x: .5, y: .5
            }]
        }, PLY_CFG);
        return;
    }
    const cats = ['Menos de 1 SML', '1 SML', 'Más de 1 SML'];
    const colors = [C.red, C.amber, C.green];
    const getSum = t => cats.reduce((s, c) => s + (mapTrim[t][c] || 0), 0);
    const traces = cats.map((cat, i) => ({
        x: trims,
        y: trims.map(t => { const s = getSum(t); return s > 0 ? (mapTrim[t][cat] || 0) / s * 100 : 0; }),
        name: cat, type: 'bar', marker: { color: colors[i] },
        hovertemplate: `<b>${cat}</b>: %{y:.1f}%<extra></extra>`
    }));
    Plotly.react('ch-hist-sml', traces, {
        ...BASE, barmode: 'stack',
        xaxis: { title: 'Trimestre', gridcolor: '#F1F5F9', tickangle: -40, automargin: true },
        yaxis: { title: '%', gridcolor: '#F1F5F9', range: [0, 101] },
        hovermode: 'x', margin: { l: 52, r: 16, t: 10, b: 90 }
    }, PLY_CFG);
}

// ── Leaflet Maps ──────────────────────────────────────────────
function initMaps() {
    maps.demo = L.map('map-demo', { zoomControl: true }).setView([-23.5, -58.5], 5);
    maps.laboral = L.map('map-laboral', { zoomControl: true }).setView([-23.5, -58.5], 5);
    [maps.demo, maps.laboral].forEach(m =>
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            { attribution: '&copy; CartoDB', maxZoom: 18 }).addTo(m));
}

function updateMaps(mapDeptoPET, mapDeptoPEA) {
    if (!geojsonData) return;
    const maxPET = Math.max(...Object.values(mapDeptoPET), 1);

    drawChoropleth(maps.demo, 'demo', mapDeptoPET, val => {
        const r = val / maxPET;
        return r > .6 ? '#1d4ed8' : r > .3 ? '#3b82f6' : r > .1 ? '#93c5fd' : '#bfdbfe';
    }, (name, val) => `<b style="color:#2563EB">${name}</b><br>PET: <b>${fmtN(val)}</b>`);

    drawChoropleth(maps.laboral, 'laboral', mapDeptoPEA, val => {
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
            const raw = feature.properties.dpto || feature.properties.DPTO || feature.properties.name || feature.properties.NAME || '';
            const match = Object.keys(dataMap).find(k => normalize(k) === normalize(raw));
            const val = match ? dataMap[match] : (key === 'laboral' ? { pet: 0, pea: 0 } : 0);
            return { fillColor: colorFn(val || 0), fillOpacity: 0.75, color: 'white', weight: 1.5 };
        },
        onEachFeature: (feature, layer) => {
            const raw = feature.properties.dpto || feature.properties.DPTO || feature.properties.name || '';
            const match = Object.keys(dataMap).find(k => normalize(k) === normalize(raw));
            const val = match ? dataMap[match] : (key === 'laboral' ? { pet: 0, pea: 0 } : 0);
            layer.bindPopup(`<div style="font-family:'Inter',sans-serif;font-size:13px;padding:2px 4px">${tooltipFn(raw || '—', val)}</div>`);
            layer.on({
                mouseover: e => { e.target.setStyle({ fillOpacity: .95 }); layer.openPopup(); },
                mouseout: e => { activeLayers[key].resetStyle(e.target); layer.closePopup(); }
            });
        }
    }).addTo(map);
    setTimeout(() => map.invalidateSize(), 200);
}

const normalize = s => s ? s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '') : '';

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
        h.id = 'sect-' + i;
        const a = document.createElement('a');
        a.href = '#sect-' + i;
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
