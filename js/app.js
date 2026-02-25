let rawData = [];
let cf, dimTrimestre, dimSexo, dimEdad, dimDpto, dimCate;
let activeTab = 'tab-laboral';
let charts = {}; // Store chart instances

const formatNumber = (num) => new Intl.NumberFormat('es-PY').format(num);

Chart.register(ChartDataLabels);
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#64748B';
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
Chart.defaults.plugins.tooltip.padding = 12;

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    fetchDatos();
});

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active classes
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            // Add to clicked
            e.target.classList.add('active');
            activeTab = e.target.getAttribute('data-target');
            document.getElementById(activeTab).classList.add('active');

            // If changing tabs, usually need to resize charts gently
            Object.values(charts).forEach(c => c.update());
        });
    });
}

async function fetchDatos() {
    try {
        const res = await fetch('datos_consolidados.json');
        rawData = await res.json();
        if (rawData.length > 0) {
            initCrossfilter();
            initUI();
            updateDashboard();
        }
    } catch (e) {
        console.error("Error al cargar JSON:", e);
        alert("Asegúrate de tener el servidor web levantado y de haber procesado los datos.");
    }
}

function initCrossfilter() {
    // rawData is an array of row objects (cohorts)
    cf = crossfilter(rawData);

    // Create dimensions based on our backend groupings
    dimTrimestre = cf.dimension(d => d.trimestre_desc);
    dimSexo = cf.dimension(d => d.sexo);
    dimEdad = cf.dimension(d => d.tramo_edad);
    dimDpto = cf.dimension(d => d.departamento);
    dimCate = cf.dimension(d => d.categocupa);
}

function initUI() {
    // Populate Trimestres Select
    const trimestres = getUniqueDimensionValues(dimTrimestre);
    // Sort historically via their custom numeric strings (assuming format YYYYTrimQ)
    trimestres.sort();

    const selectT = document.getElementById('trimestre-select');
    // Keep 'Histórico Completo' as first option
    trimestres.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t; opt.textContent = t;
        selectT.appendChild(opt);
    });

    // Populate Dpto Select
    const dptos = getUniqueDimensionValues(dimDpto);
    dptos.sort();
    const selectD = document.getElementById('dpto-select');
    // Removing the default static options except ALL, then populate
    selectD.innerHTML = '<option value="ALL">Todo el País</option>';
    dptos.forEach(d => {
        if (d !== 'NR') {
            const opt = document.createElement('option');
            opt.value = d; opt.textContent = d;
            selectD.appendChild(opt);
        }
    });

    // Event Listeners for Filters
    setupFilterEvents('trimestre-select', dimTrimestre, true);
    setupFilterEvents('dpto-select', dimDpto, true);
    setupFilterEvents('cate-select', dimCate, true);

    setupButtonGroupEvents('filter-sexo', dimSexo);
    setupButtonGroupEvents('filter-edad', dimEdad);

    document.getElementById('btn-reset-filters').addEventListener('click', resetFilters);

    // Initialize empty charts
    initCharts();
}

function getUniqueDimensionValues(dimension) {
    const group = dimension.group();
    return group.all().map(g => g.key);
}

// Event Bindings
function setupFilterEvents(elementId, dimension, isSelect) {
    const el = document.getElementById(elementId);
    el.addEventListener('change', (e) => {
        applyFilter(dimension, e.target.value);
    });
}

function setupButtonGroupEvents(containerId, dimension) {
    const container = document.getElementById(containerId);
    const btns = container.querySelectorAll('button');
    btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            btns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            applyFilter(dimension, e.target.getAttribute('data-val'));
        });
    });
}

function applyFilter(dimension, value) {
    if (value === 'ALL') {
        dimension.filterAll();
    } else {
        dimension.filterExact(value);
    }
    updateDashboard();
}

function resetFilters() {
    dimTrimestre.filterAll();
    dimSexo.filterAll();
    dimEdad.filterAll();
    dimDpto.filterAll();
    dimCate.filterAll();

    // Reset UI visually
    document.getElementById('trimestre-select').value = 'ALL';
    document.getElementById('dpto-select').value = 'ALL';
    document.getElementById('cate-select').value = 'ALL';

    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('#filter-sexo .filter-btn[data-val="ALL"]').classList.add('active');

    document.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
    document.querySelector('#filter-edad .chip[data-val="ALL"]').classList.add('active');

    updateDashboard();
}

/* ============================
    Dashboard Rendering
============================ */
function updateDashboard() {
    // Agregate the currently filtered dataset
    const allFiltered = dimTrimestre.top(Infinity); // gets all records matching current filters

    let totalPET = 0;
    let totalPEA = 0;
    let totalOcupados = 0;
    let totalDesocupados = 0;
    let totalAniosPond = 0;
    let totalAportaIPS = 0;
    let totalAportaJub = 0;

    let obrerosPrivadosSML = { "Menos de 1 SML": 0, "1 SML": 0, "Más de 1 SML": 0 };

    // Summarize global current state
    allFiltered.forEach(row => {
        totalPET += row.personas_pet;
        totalOcupados += row.ocupados;
        totalDesocupados += row.desocupados;
        totalAniosPond += row.anios_estudio_pond;
        totalAportaIPS += row.aporta_ips;
        totalAportaJub += row.aporta_jub;

        if (row.categocupa === 'Obrero privado' && row.sml_cat !== 'NR') {
            if (obrerosPrivadosSML[row.sml_cat] !== undefined) {
                obrerosPrivadosSML[row.sml_cat] += row.ocupados;
            }
        }
    });

    totalPEA = totalOcupados + totalDesocupados;

    // UPDATE KPIs
    const tasaOcupacion = totalPET > 0 ? (totalOcupados / totalPET) * 100 : 0;
    const tasaDesocupacion = totalPEA > 0 ? (totalDesocupados / totalPEA) * 100 : 0;
    const promAnios = totalPET > 0 ? (totalAniosPond / totalPET) : 0;
    const covIps = totalOcupados > 0 ? (totalAportaIPS / totalOcupados) * 100 : 0;
    const covJub = totalOcupados > 0 ? (totalAportaJub / totalOcupados) * 100 : 0;

    document.getElementById('kpi-ocupacion').innerText = tasaOcupacion.toFixed(1) + '%';
    document.getElementById('poblacion-ref').innerText = `Ref: ${formatNumber(Math.round(totalPET))} (PET)`;
    document.getElementById('kpi-desocupacion').innerText = tasaDesocupacion.toFixed(1) + '%';

    document.getElementById('kpi-anios-estudio').innerText = promAnios.toFixed(1) + ' años';
    document.getElementById('kpi-ips').innerText = covIps.toFixed(1) + '%';
    document.getElementById('kpi-jubilacion').innerText = covJub.toFixed(1) + '%';

    // Ocupacion de Obreros SML KPI
    const totalObreros = obrerosPrivadosSML["Menos de 1 SML"] + obrerosPrivadosSML["1 SML"] + obrerosPrivadosSML["Más de 1 SML"];
    if (totalObreros > 0) {
        const pctSupera = (obrerosPrivadosSML["Más de 1 SML"] / totalObreros) * 100;
        document.getElementById('kpi-supera-sml').innerText = pctSupera.toFixed(1) + '%';
    } else {
        document.getElementById('kpi-supera-sml').innerText = 'N/A';
    }

    // UPDATE HISTORICAL CHARTS (Using grouping logic to keep timeline)
    updateHistoricalCharts();
    updateSMLChart(obrerosPrivadosSML, totalObreros);
}

function initCharts() {
    // 1. Evolución Laboral (Line Chart)
    const ctxLab = document.getElementById('evolucionLaboralChart').getContext('2d');
    charts.evolLaboral = new Chart(ctxLab, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { datalabels: { display: false } }, // Too messy on lines
            scales: { y: { beginAtZero: true, suggestedMax: 100 } },
            elements: { line: { tension: 0.3 } }
        }
    });

    // 2. Evolución Salud (Line Chart)
    const ctxSalud = document.getElementById('evolucionSaludChart').getContext('2d');
    charts.evolSalud = new Chart(ctxSalud, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { datalabels: { display: false } },
            scales: { y: { beginAtZero: true, suggestedMax: 100 } },
            elements: { line: { tension: 0.3 } }
        }
    });

    // 3. SML Doughnut
    const ctxSML = document.getElementById('smlObrerosChart').getContext('2d');
    charts.smlDonut = new Chart(ctxSML, {
        type: 'doughnut',
        data: {
            labels: ['Menos de 1 SML', '1 SML', 'Más de 1 SML'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#EF4444', '#F59E0B', '#10B981'], // Red, Yellow, Green
                borderWidth: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold' },
                    formatter: (value, ctx) => {
                        let sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        if (sum === 0) return '';
                        return Math.round((value / sum) * 100) + '%';
                    }
                }
            }
        }
    });
}

function updateHistoricalCharts() {
    // Group everything by TRIMESTRE (Historical timeline)
    // Warning: if dimTrimestre is currently filtered, grouping only shows results for that filter.
    // If we want the line chart to show history *given* the other filters (sexo, edad), we group by the dimension.

    // Create a temporary dimension just for grouping timeline without affecting the global dimTrimestre filter
    const dimTimeGrp = cf.dimension(d => d.trimestre_desc);
    const grpTime = dimTimeGrp.group().reduce(
        (p, v) => {
            p.pet += v.personas_pet;
            p.pea += (v.ocupados + v.desocupados);
            p.ocupados += v.ocupados;
            p.desoc += v.desocupados;
            p.ips += v.aporta_ips;
            p.jub += v.aporta_jub;
            return p;
        },
        (p, v) => {
            p.pet -= v.personas_pet;
            p.pea -= (v.ocupados + v.desocupados);
            p.ocupados -= v.ocupados;
            p.desoc -= v.desocupados;
            p.ips -= v.aporta_ips;
            p.jub -= v.aporta_jub;
            return p;
        },
        () => ({ pet: 0, pea: 0, ocupados: 0, desoc: 0, ips: 0, jub: 0 })
    );

    const timeData = grpTime.all();
    dimTimeGrp.dispose(); // clean up

    // Sort chronologically (assuming the strings are alphabetically sortable like 2022Trim2)
    timeData.sort((a, b) => a.key.localeCompare(b.key));

    const labels = [];
    const tasaOcup = [];
    const tasaDesoc = [];
    const covIps = [];
    const covJub = [];

    timeData.forEach(d => {
        labels.push(d.key);
        const vals = d.value;
        tasaOcup.push(vals.pet > 0 ? (vals.ocupados / vals.pet * 100) : 0);
        tasaDesoc.push(vals.pea > 0 ? (vals.desoc / vals.pea * 100) : 0);
        covIps.push(vals.ocupados > 0 ? (vals.ips / vals.ocupados * 100) : 0);
        covJub.push(vals.ocupados > 0 ? (vals.jub / vals.ocupados * 100) : 0);
    });

    // Update Laboral Line Chart
    charts.evolLaboral.data.labels = labels;
    charts.evolLaboral.data.datasets = [
        { label: 'T. Ocupación (%)', data: tasaOcup, borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true },
        { label: 'T. Desocupación (%)', data: tasaDesoc, borderColor: '#EF4444', backgroundColor: 'transparent' }
    ];
    charts.evolLaboral.update();

    // Update Salud Line Chart
    charts.evolSalud.data.labels = labels;
    charts.evolSalud.data.datasets = [
        { label: 'Cobertura IPS (%)', data: covIps, borderColor: '#14B8A6', backgroundColor: 'transparent' },
        { label: 'Aporte Jubilación (%)', data: covJub, borderColor: '#F97316', backgroundColor: 'transparent' }
    ];
    charts.evolSalud.update();
}

function updateSMLChart(dataObj, total) {
    if (total > 0) {
        charts.smlDonut.data.datasets[0].data = [
            dataObj["Menos de 1 SML"],
            dataObj["1 SML"],
            dataObj["Más de 1 SML"]
        ];
    } else {
        charts.smlDonut.data.datasets[0].data = [0, 0, 0];
    }
    charts.smlDonut.update();
}
