/* ============================================================
   TABLERO DE INDICADORES DEPARTAMENTALES
   app.js — Lógica principal
============================================================ */

"use strict";

// ─── GLOBAL STATE ────────────────────────────────────────────
let rawData = [];   // All rows from CSV
let years = [];   // Sorted years array
let activeYear = null; // Currently selected year

// Chart color palettes (accessible / colorblind-safe)
const PALETTE = {
    blue: '#2563EB',
    green: '#16A34A',
    teal: '#0D9488',
    amber: '#D97706',
    red: '#DC2626',
    purple: '#7C3AED',
    slate: '#475569',
    orange: '#EA580C',
    pink: '#DB2777',
};

// Colors for multi-line historical series
const LINE_COLORS = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#0D9488', '#EA580C'];

// Plotly base layout shared by all charts
const BASE_LAYOUT = {
    paper_bgcolor: 'white',
    plot_bgcolor: 'white',
    font: { family: "'Inter', system-ui, sans-serif", size: 12, color: '#475569' },
    margin: { l: 50, r: 20, t: 10, b: 50 },
    showlegend: true,
    legend: { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1 }
};

const PLOTLY_CONFIG = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
    toImageButtonOptions: { format: 'png', scale: 2 }
};

// ─── HISTORICAL SERIES CONFIG ────────────────────────────────
const SERIES_CONFIG = {
    demo: [
        { col: 'tasa_dependencia_total', label: 'Dep. Total (%)', unit: '%' },
        { col: 'tasa_dependencia_adultos', label: 'Dep. Adultos Mayores (%)', unit: '%' },
        { col: 'tasa_dependencia_jovenes', label: 'Dep. Jóvenes (%)', unit: '%' },
        { col: 'indice_envejecimiento', label: 'Índice Envejecimiento (%)', unit: '%' },
        { col: 'poblacion_total', label: 'Población Total', unit: 'hab.' },
    ],
    lab: [
        { col: 'tgp', label: 'TGP (%)', unit: '%' },
        { col: 'tasa_ocupacion', label: 'Tasa Ocupación (%)', unit: '%' },
        { col: 'tasa_desempleo', label: 'Tasa Desempleo (%)', unit: '%' },
        { col: 'informalidad', label: 'Informalidad (%)', unit: '%' },
        { col: 'subempleo', label: 'Subempleo (%)', unit: '%' },
    ],
    social: [
        { col: 'cobertura_salud_contributivo', label: 'Salud Contributivo (%)', unit: '%' },
        { col: 'cobertura_salud_subsidiado', label: 'Salud Subsidiado (%)', unit: '%' },
        { col: 'mortalidad_infantil', label: 'Mortalidad Infantil', unit: 'x1000 NV' },
        { col: 'esperanza_vida', label: 'Esperanza de Vida', unit: 'años' },
        { col: 'tasa_analfabetismo', label: 'Analfabetismo (%)', unit: '%' },
        { col: 'cobertura_neta_secundaria', label: 'Cob. Neta Secundaria (%)', unit: '%' },
    ]
};

// Track which series are active in each historical tab
const activeToggles = { demo: new Set(), lab: new Set(), social: new Set() };

// ─── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initMainTabs();
    initSubTabs();
    loadCSV();
    loadMetodologia();
});

// ─── TAB NAVIGATION ──────────────────────────────────────────
function initMainTabs() {
    document.querySelectorAll('.main-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
            // Trigger Plotly resize for charts in the newly visible tab
            window.dispatchEvent(new Event('resize'));
        });
    });
}

function initSubTabs() {
    document.querySelectorAll('.subtab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const parent = btn.closest('.tab-panel');
            parent.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
            parent.querySelectorAll('.subtab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.subtab).classList.add('active');
            window.dispatchEvent(new Event('resize'));
        });
    });
}

// ─── CSV LOADING ─────────────────────────────────────────────
function loadCSV() {
    Papa.parse('data/datos_departamento.csv', {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (result) => {
            if (!result.data || result.data.length === 0) {
                showError('No se encontraron datos en el archivo CSV.');
                return;
            }
            rawData = result.data;
            years = [...new Set(rawData.map(r => r.año))].sort((a, b) => a - b);
            activeYear = years[years.length - 1]; // Default: most recent year

            populateYearSelector();
            initHistoricalToggles();
            renderCurrentYear();
        },
        error: (err) => showError('Error al cargar datos: ' + err.message)
    });
}

function getRowForYear(year) {
    return rawData.find(r => r.año === year) || null;
}

// ─── YEAR SELECTOR ───────────────────────────────────────────
function populateYearSelector() {
    const sel = document.getElementById('year-select');
    // newest first for usability
    [...years].reverse().forEach(y => {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y;
        if (y === activeYear) opt.selected = true;
        sel.appendChild(opt);
    });
    sel.addEventListener('change', () => {
        activeYear = parseInt(sel.value);
        document.getElementById('header-year-badge').textContent = `Año ${activeYear}`;
        document.getElementById('filter-info').textContent =
            `Mostrando datos del año ${activeYear}. ` +
            (activeYear === years[years.length - 1] ? '(Más reciente)' : '');
        renderCurrentYear();
    });
}

// ─── MAIN RENDER ─────────────────────────────────────────────
function renderCurrentYear() {
    const row = getRowForYear(activeYear);
    if (!row) { showError(`Sin datos para el año ${activeYear}.`); return; }

    renderDemografia(row);
    renderLaboral(row);
    renderSalud(row);
    renderEducacion(row);
}

// ─── HELPERS ─────────────────────────────────────────────────
const fmt = (n, dec = 1) => n != null ? n.toFixed(dec) + ' %' : 'N/D';
const fmtN = (n) => n != null ? new Intl.NumberFormat('es-CO').format(Math.round(n)) : 'N/D';
const fmtPesos = (n) => n != null ? '$ ' + new Intl.NumberFormat('es-CO').format(Math.round(n)) : 'N/D';

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// ─── BLOQUE 1: DEMOGRAFÍA ────────────────────────────────────
function renderDemografia(row) {
    setText('kpi-pob-total', fmtN(row.poblacion_total));
    setText('kpi-dep-total', fmt(row.tasa_dependencia_total));
    setText('kpi-dep-adultos', fmt(row.tasa_dependencia_adultos));
    setText('kpi-dep-jovenes', fmt(row.tasa_dependencia_jovenes));
    setText('kpi-envejecimiento', fmt(row.indice_envejecimiento));

    buildPiramide(row);
}

function buildPiramide(row) {
    const grupos = ['0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39',
        '40-44', '45-49', '50-54', '55-59', '60-64', '65+'];
    const hKeys = ['pob_0_4h', 'pob_5_9h', 'pob_10_14h', 'pob_15_19h', 'pob_20_24h', 'pob_25_29h',
        'pob_30_34h', 'pob_35_39h', 'pob_40_44h', 'pob_45_49h', 'pob_50_54h', 'pob_55_59h',
        'pob_60_64h', 'pob_65_mas_h'];
    const mKeys = ['pob_0_4m', 'pob_5_9m', 'pob_10_14m', 'pob_15_19m', 'pob_20_24m', 'pob_25_29m',
        'pob_30_34m', 'pob_35_39m', 'pob_40_44m', 'pob_45_49m', 'pob_50_54m', 'pob_55_59m',
        'pob_60_64m', 'pob_65_mas_m'];

    const hVal = hKeys.map(k => -(row[k] || 0));  // negative = left side
    const mVal = mKeys.map(k => (row[k] || 0));

    const traces = [
        {
            x: hVal, y: grupos, type: 'bar', orientation: 'h',
            name: 'Hombres',
            marker: { color: PALETTE.blue },
            hovertemplate: '%{y}: %{customdata:,.0f} hombres<extra></extra>',
            customdata: hVal.map(v => Math.abs(v))
        },
        {
            x: mVal, y: grupos, type: 'bar', orientation: 'h',
            name: 'Mujeres',
            marker: { color: PALETTE.pink },
            hovertemplate: '%{y}: %{x:,.0f} mujeres<extra></extra>'
        }
    ];

    const layout = {
        ...BASE_LAYOUT,
        barmode: 'relative',
        xaxis: {
            title: 'Personas', tickformat: ',.0f',
            tickvals: [-20000, -10000, 0, 10000, 20000],
            ticktext: ['20K', '10K', '0', '10K', '20K'],
            gridcolor: '#F1F5F9'
        },
        yaxis: { title: '', gridcolor: '#F1F5F9' },
        margin: { l: 50, r: 20, t: 10, b: 40 },
        legend: { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1 }
    };

    Plotly.react('chart-piramide', traces, layout, PLOTLY_CONFIG);
}

// ─── BLOQUE 2: MERCADO LABORAL ───────────────────────────────
function renderLaboral(row) {
    setText('kpi-tgp', fmt(row.tgp, 1));
    setText('kpi-to', fmt(row.tasa_ocupacion, 1));
    setText('kpi-td', fmt(row.tasa_desempleo, 1));
    setText('kpi-informal', fmt(row.informalidad, 1));
    setText('kpi-subempleo', fmt(row.subempleo, 1));
    setText('kpi-ingreso', fmtPesos(row.ingreso_promedio));

    buildRamas(row);
}

function buildRamas(row) {
    const ramas = ['Agricultura', 'Comercio', 'Manufactura', 'Construcción', 'Servicios', 'Transporte', 'Otros'];
    const cols = ['ocup_agricultura', 'ocup_comercio', 'ocup_manufactura', 'ocup_construccion',
        'ocup_servicios', 'ocup_transporte', 'ocup_otros'];
    const vals = cols.map(c => row[c] || 0);

    // Sort descending for readability
    const combined = ramas.map((r, i) => ({ r, v: vals[i] })).sort((a, b) => a.v - b.v);

    const traces = [{
        x: combined.map(d => d.v),
        y: combined.map(d => d.r),
        type: 'bar',
        orientation: 'h',
        marker: {
            color: combined.map(d => d.v),
            colorscale: [[0, '#EFF6FF'], [1, PALETTE.blue]],
            showscale: false
        },
        hovertemplate: '<b>%{y}</b><br>%{x:.1f}%<extra></extra>',
        text: combined.map(d => d.v.toFixed(1) + '%'),
        textposition: 'outside'
    }];

    const layout = {
        ...BASE_LAYOUT,
        showlegend: false,
        xaxis: { title: '% de los ocupados', range: [0, 35], gridcolor: '#F1F5F9' },
        yaxis: { title: '', automargin: true }
    };

    Plotly.react('chart-ramas', traces, layout, PLOTLY_CONFIG);
}

// ─── BLOQUE 3: SALUD ─────────────────────────────────────────
function renderSalud(row) {
    const contr = row.cobertura_salud_contributivo || 0;
    const subsi = row.cobertura_salud_subsidiado || 0;
    const excep = row.cobertura_salud_excepcion || 0;
    const sinAs = row.sin_aseguramiento || 0;
    const total = (100 - sinAs).toFixed(1);

    setText('kpi-cobertura-salud', total + ' %');
    setText('kpi-mortalidad', (row.mortalidad_infantil || '—') + (row.mortalidad_infantil ? ' ‰' : ''));
    setText('kpi-natalidad', fmt(row.tasa_natalidad, 1));
    setText('kpi-esperanza', (row.esperanza_vida || '—') + (row.esperanza_vida ? ' años' : ''));

    buildAseguramiento(contr, subsi, excep, sinAs);
}

function buildAseguramiento(contr, subsi, excep, sinAs) {
    const traces = [{
        values: [contr, subsi, excep, sinAs],
        labels: ['Contributivo', 'Subsidiado', 'Excepción', 'Sin asegurar'],
        type: 'pie',
        hole: 0.52,
        marker: {
            colors: [PALETTE.blue, PALETTE.teal, PALETTE.amber, '#CBD5E1'],
            line: { color: 'white', width: 2 }
        },
        hovertemplate: '<b>%{label}</b><br>%{value:.1f}%<extra></extra>',
        textinfo: 'label+percent',
        textposition: 'outside',
        pull: [0, 0, 0, 0.04]
    }];

    const layout = {
        ...BASE_LAYOUT,
        showlegend: false,
        margin: { l: 40, r: 40, t: 20, b: 20 }
    };

    Plotly.react('chart-aseguramiento', traces, layout, PLOTLY_CONFIG);
}

// ─── BLOQUE 4: EDUCACIÓN ─────────────────────────────────────
function renderEducacion(row) {
    setText('kpi-analfabetismo', fmt(row.tasa_analfabetismo, 1));
    buildEducNivel(row);
    buildCoberturaEduc(row);
}

function buildEducNivel(row) {
    const niveles = ['Sin escolaridad', 'Primaria', 'Secundaria', 'Media', 'Superior'];
    const cols = ['educ_ninguno', 'educ_primaria', 'educ_secundaria', 'educ_media', 'educ_superior'];
    const colors = ['#CBD5E1', PALETTE.teal, PALETTE.blue, PALETTE.purple, PALETTE.green];

    const total = cols.reduce((s, c) => s + (row[c] || 0), 0);

    const traces = cols.map((c, i) => ({
        y: [activeYear.toString()],
        x: [(row[c] / total * 100)],
        name: niveles[i],
        type: 'bar',
        orientation: 'h',
        marker: { color: colors[i] },
        hovertemplate: `<b>${niveles[i]}</b><br>%{x:.1f}%<extra></extra>`,
        text: [(row[c] / total * 100).toFixed(1) + '%'],
        textposition: 'inside',
        insidetextanchor: 'middle',
        textfont: { color: 'white', size: 11 }
    }));

    const layout = {
        ...BASE_LAYOUT,
        barmode: 'stack',
        showlegend: true,
        xaxis: { title: '% de la población de 15+ años', gridcolor: '#F1F5F9' },
        yaxis: { title: '' },
        margin: { l: 20, r: 20, t: 10, b: 40 }
    };

    Plotly.react('chart-educacion-nivel', traces, layout, PLOTLY_CONFIG);
}

function buildCoberturaEduc(row) {
    const niveles = ['Primaria', 'Secundaria', 'Media'];
    const netaCols = ['cobertura_neta_primaria', 'cobertura_neta_secundaria', 'cobertura_neta_media'];
    const brutaCols = ['cobertura_bruta_primaria', 'cobertura_bruta_secundaria', 'cobertura_bruta_media'];

    const traces = [
        {
            x: niveles,
            y: netaCols.map(c => row[c] || 0),
            name: 'Cobertura Neta',
            type: 'bar',
            marker: { color: PALETTE.blue },
            hovertemplate: '<b>%{x}</b> Neta<br>%{y:.1f}%<extra></extra>',
            text: netaCols.map(c => (row[c] || 0).toFixed(1) + '%'),
            textposition: 'outside'
        },
        {
            x: niveles,
            y: brutaCols.map(c => row[c] || 0),
            name: 'Cobertura Bruta',
            type: 'bar',
            marker: { color: PALETTE.teal },
            hovertemplate: '<b>%{x}</b> Bruta<br>%{y:.1f}%<extra></extra>',
            text: brutaCols.map(c => (row[c] || 0).toFixed(1) + '%'),
            textposition: 'outside'
        }
    ];

    const layout = {
        ...BASE_LAYOUT,
        barmode: 'group',
        xaxis: { title: '' },
        yaxis: { title: '% de cobertura', gridcolor: '#F1F5F9', range: [0, 115] }
    };

    Plotly.react('chart-cobertura-educ', traces, layout, PLOTLY_CONFIG);
}

// ─── EVOLUCIÓN HISTÓRICA ─────────────────────────────────────
function initHistoricalToggles() {
    Object.entries(SERIES_CONFIG).forEach(([group, series]) => {
        const container = document.getElementById(`toggles-${group}`);
        series.forEach((s, i) => {
            // Default: first 3 series on for each group
            if (i < 3) activeToggles[group].add(s.col);

            const btn = document.createElement('button');
            btn.className = 'ind-toggle' + (i < 3 ? ' on' : '');
            btn.dataset.col = s.col;
            btn.dataset.group = group;
            const dot = document.createElement('span');
            dot.className = 'toggle-dot';
            dot.style.color = LINE_COLORS[i % LINE_COLORS.length];
            btn.appendChild(dot);
            btn.appendChild(document.createTextNode(s.label));

            btn.addEventListener('click', () => {
                if (activeToggles[group].has(s.col)) {
                    activeToggles[group].delete(s.col);
                    btn.classList.remove('on');
                } else {
                    activeToggles[group].add(s.col);
                    btn.classList.add('on');
                }
                buildHistoricalChart(group);
            });

            container.appendChild(btn);
        });

        // Initial chart
        buildHistoricalChart(group);
    });
}

function buildHistoricalChart(group) {
    const chartId = `chart-hist-${group}`;
    const allSeries = SERIES_CONFIG[group];
    const active = activeToggles[group];
    const allYears = rawData.map(r => r.año);

    const traces = allSeries
        .filter(s => active.has(s.col))
        .map((s, idx) => ({
            x: allYears,
            y: rawData.map(r => r[s.col] ?? null),
            name: s.label,
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: LINE_COLORS[idx % LINE_COLORS.length], width: 2.5, shape: 'spline' },
            marker: { size: 6, color: LINE_COLORS[idx % LINE_COLORS.length] },
            hovertemplate: `<b>${s.label}</b><br>Año: %{x}<br>Valor: %{y:.2f} ${s.unit}<extra></extra>`,
            connectgaps: false
        }));

    const layout = {
        ...BASE_LAYOUT,
        xaxis: {
            title: 'Año',
            dtick: 1,
            gridcolor: '#F1F5F9',
            fixedrange: false
        },
        yaxis: {
            title: 'Valor',
            gridcolor: '#F1F5F9',
            fixedrange: false
        },
        hovermode: 'x unified',
        legend: { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1 }
    };

    Plotly.react(chartId, traces.length ? traces : [], layout,
        { ...PLOTLY_CONFIG, modeBarButtonsToRemove: [] });
}

// ─── DOWNLOAD HELPERS ────────────────────────────────────────
function downloadChart(divId, name) {
    Plotly.downloadImage(divId, { format: 'png', width: 1400, height: 700, filename: name });
}

function downloadCSV(group) {
    const cols = SERIES_CONFIG[group].map(s => s.col);
    const colLabels = SERIES_CONFIG[group].map(s => s.label);
    const header = ['Año', ...colLabels].join(',');
    const rows = rawData.map(r => [r.año, ...cols.map(c => r[c] ?? '')].join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `series_${group}.csv`;
    link.click();
}

// ─── METODOLOGÍA (MARKDOWN) ──────────────────────────────────
function loadMetodologia() {
    fetch('data/metodologia.md')
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.text();
        })
        .then(md => renderMetodologia(md))
        .catch(err => {
            document.getElementById('met-content').innerHTML =
                `<div style="color:#DC2626;padding:16px">
                    <strong>Error al cargar el documento de metodología.</strong><br>
                    Asegúrate de servir la aplicación desde un servidor web local.<br>
                    <code>${err.message}</code>
                </div>`;
        });
}

function renderMetodologia(md) {
    const html = marked.parse(md);
    const contentEl = document.getElementById('met-content');
    contentEl.innerHTML = html;

    // Build Table of Contents from headings
    buildTOC(contentEl);
}

function buildTOC(contentEl) {
    const toc = document.getElementById('met-toc');
    const heads = contentEl.querySelectorAll('h2, h3');
    toc.innerHTML = '';

    heads.forEach((h, i) => {
        const id = 'met-' + i;
        h.id = id;

        const a = document.createElement('a');
        a.href = '#' + id;
        a.className = 'toc-link ' + h.tagName.toLowerCase();
        a.textContent = h.textContent;
        a.addEventListener('click', e => {
            e.preventDefault();
            h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        toc.appendChild(a);
    });
}

// ─── ERROR DISPLAY ───────────────────────────────────────────
function showError(msg) {
    console.error(msg);
}
