let rawData = [];
let geoJsonData = null;
let maps = {};
let geojsonLayers = {};
let cf, dimTrimestre, dimSexo, dimEdad, dimDpto, dimCate;
let activeTab = 'tab-demografia';
let charts = {}; // Store chart instances

const formatNumber = (num) => new Intl.NumberFormat('es-PY').format(num);

Chart.register(ChartDataLabels);
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#64748B';
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
Chart.defaults.plugins.tooltip.padding = 12;

const colors = {
    green: '#10B981', red: '#EF4444', yellow: '#F59E0B',
    blue: '#3B82F6', purple: '#8B5CF6', teal: '#14B8A6',
    orange: '#F97316', gray: '#E2E8F0', dark: '#1E293B',
    emerald: '#059669', pink: '#EC4899', cyan: '#06B6D4'
};
const palette = [colors.blue, colors.green, colors.purple, colors.orange, colors.pink, colors.teal, colors.yellow, colors.cyan, colors.red];

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    fetchDatos();
});

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            e.target.classList.add('active');
            activeTab = e.target.getAttribute('data-target');
            document.getElementById(activeTab).classList.add('active');

            // Re-render when tab changes
            Object.values(charts).forEach(c => c.update());
            if (maps.demografia) setTimeout(() => maps.demografia.invalidateSize(), 150);
            if (maps.laboral) setTimeout(() => maps.laboral.invalidateSize(), 150);
        });
    });
}

async function fetchDatos() {
    try {
        const [resDatos, resGeo] = await Promise.all([
            fetch('datos_consolidados.json'),
            fetch('departamentos.geojson')
        ]);
        rawData = await resDatos.json();
        geoJsonData = await resGeo.json();

        if (rawData.length > 0) {
            initCrossfilter();
            initUI();
            updateDashboard();
        }
    } catch (e) {
        console.error("Error al cargar JSON:", e);
        alert("Asegúrate de tener el servidor web levantado y de haber procesado los datos y mapas.");
    }
}

function initCrossfilter() {
    cf = crossfilter(rawData);
    dimTrimestre = cf.dimension(d => d.trimestre_desc);
    dimSexo = cf.dimension(d => d.sexo);
    dimEdad = cf.dimension(d => d.tramo_edad);
    dimDpto = cf.dimension(d => d.departamento);
    dimCate = cf.dimension(d => d.categocupa);
}

function initUI() {
    const trimestres = getUniqueDimensionValues(dimTrimestre).sort();
    const selectT = document.getElementById('trimestre-select');
    trimestres.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t; opt.textContent = t;
        selectT.appendChild(opt);
    });

    const dptos = getUniqueDimensionValues(dimDpto).sort();
    const selectD = document.getElementById('dpto-select');
    selectD.innerHTML = '<option value="ALL">Todo el País</option>';
    dptos.forEach(d => {
        if (d !== 'NR') {
            const opt = document.createElement('option');
            opt.value = d; opt.textContent = d;
            selectD.appendChild(opt);
        }
    });

    setupFilterEvents('trimestre-select', dimTrimestre, true);
    setupFilterEvents('dpto-select', dimDpto, true);
    setupFilterEvents('cate-select', dimCate, true);
    setupButtonGroupEvents('filter-sexo', dimSexo);
    setupButtonGroupEvents('filter-edad', dimEdad);
    document.getElementById('btn-reset-filters').addEventListener('click', resetFilters);

    initCharts();
    initMaps();
}

function getUniqueDimensionValues(dimension) {
    return dimension.group().all().map(g => g.key);
}

function setupFilterEvents(elementId, dimension, isSelect) {
    document.getElementById(elementId).addEventListener('change', (e) => {
        applyFilter(dimension, e.target.value);
    });
}

function setupButtonGroupEvents(containerId, dimension) {
    const btns = document.getElementById(containerId).querySelectorAll('button');
    btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            btns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            applyFilter(dimension, e.target.getAttribute('data-val'));
        });
    });
}

function applyFilter(dimension, value) {
    if (value === 'ALL') dimension.filterAll();
    else dimension.filterExact(value);
    updateDashboard();
}

function resetFilters() {
    dimTrimestre.filterAll();
    dimSexo.filterAll();
    dimEdad.filterAll();
    dimDpto.filterAll();
    dimCate.filterAll();

    document.getElementById('trimestre-select').value = 'ALL';
    document.getElementById('dpto-select').value = 'ALL';
    document.getElementById('cate-select').value = 'ALL';

    document.querySelectorAll('.filter-btn, .chip').forEach(b => b.classList.remove('active'));
    document.querySelector('#filter-sexo .filter-btn[data-val="ALL"]').classList.add('active');
    document.querySelector('#filter-edad .chip[data-val="ALL"]').classList.add('active');

    updateDashboard();
}

/* ============================
    Dashboard Rendering
============================ */
function initCharts() {
    // 1. Demografía
    charts.sexo = createChart('sexoChart', 'doughnut', { plugins: { legend: { position: 'bottom' }, datalabels: { formatter: pctFormatter, color: '#fff', font: { weight: 'bold' } } } });
    charts.edad = createChart('edadChart', 'bar', {
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: false }, datalabels: { display: false } }
    });
    charts.dpto = createChart('dptoChart', 'bar', {
        indexAxis: 'y',
        plugins: { legend: { display: false }, datalabels: { display: false } }
    });

    // 2. Educación
    charts.eduEdad = createChart('educacionEdadChart', 'bar', {
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: false }, datalabels: { display: false } }
    });

    // 3. Salud
    charts.saludCate = new Chart(document.getElementById('saludCateChart').getContext('2d'), {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 100 } },
            plugins: { datalabels: { display: false } }
        }
    });
    charts.saludDonut = createChart('saludDonutChart', 'doughnut', { cutout: '65%', plugins: { legend: { position: 'bottom' }, datalabels: { formatter: pctFormatter, color: '#fff', font: { weight: 'bold' } } } });

    // 4. Laboral
    charts.cateOcupa = createChart('cateOcupacionChart', 'bar', {
        indexAxis: 'y',
        plugins: { legend: { display: false }, datalabels: { display: false } }
    });

    // 5. Evolución
    charts.evolLaboral = createEvolLineChart('evolucionLaboralChart');
    charts.evolSalud = createEvolLineChart('evolucionSaludChart');
    charts.smlDonut = createChart('smlDonutChart', 'doughnut', { cutout: '65%', plugins: { legend: { position: 'bottom' }, datalabels: { formatter: pctFormatter, color: '#fff', font: { weight: 'bold' } } } });

    // Stacked Bar SML
    charts.smlEvol = new Chart(document.getElementById('smlEvolucionChart').getContext('2d'), {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true, max: 100 }
            },
            plugins: {
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold' },
                    formatter: v => v > 5 ? Math.round(v) + '%' : ''
                }
            }
        }
    });
}

function createChart(id, type, extraOptions = {}) {
    return new Chart(document.getElementById(id).getContext('2d'), {
        type: type,
        data: { labels: [], datasets: [] },
        options: { responsive: true, maintainAspectRatio: false, ...extraOptions }
    });
}

function createEvolLineChart(id) {
    return createChart(id, 'line', {
        plugins: { datalabels: { display: false } },
        scales: { y: { beginAtZero: true, suggestedMax: 100 } },
        elements: { line: { tension: 0.3 } }
    });
}

const pctFormatter = (value, ctx) => {
    let sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
    if (sum === 0) return '';
    return Math.round((value / sum) * 100) + '%';
};

function updateDashboard() {
    const allFiltered = dimTrimestre.top(Infinity);

    let totalPET = 0, totalPEA = 0, totalOcupados = 0, totalDesocupados = 0;
    let totalAniosPond = 0, totalAportaIPS = 0, totalAportaJub = 0;
    let obrerosSML = { "Menos de 1 SML": 0, "1 SML": 0, "Más de 1 SML": 0 };

    let mapSexo = {}, mapEdadPET = {}, mapDpto = {}, mapDptoPEA = {}, mapEdadAniosPond = {};
    let mapCateOcupados = {}, mapCateIPS = {}, mapCateJub = {};

    allFiltered.forEach(row => {
        totalPET += row.personas_pet;
        totalOcupados += row.ocupados;
        totalDesocupados += row.desocupados;
        totalAniosPond += row.anios_estudio_pond;
        totalAportaIPS += row.aporta_ips;
        totalAportaJub += row.aporta_jub;

        if (row.categocupa === 'Obrero privado' && row.sml_cat !== 'NR') {
            obrerosSML[row.sml_cat] += row.ocupados;
        }

        mapSexo[row.sexo] = (mapSexo[row.sexo] || 0) + row.personas_pet;
        mapEdadPET[row.tramo_edad] = (mapEdadPET[row.tramo_edad] || 0) + row.personas_pet;
        mapDpto[row.departamento] = (mapDpto[row.departamento] || 0) + row.personas_pet;
        mapDptoPEA[row.departamento] = (mapDptoPEA[row.departamento] || 0) + (row.ocupados + row.desocupados);
        mapEdadAniosPond[row.tramo_edad] = (mapEdadAniosPond[row.tramo_edad] || 0) + row.anios_estudio_pond;

        if (row.categocupa !== 'NR') {
            mapCateOcupados[row.categocupa] = (mapCateOcupados[row.categocupa] || 0) + row.ocupados;
            mapCateIPS[row.categocupa] = (mapCateIPS[row.categocupa] || 0) + row.aporta_ips;
            mapCateJub[row.categocupa] = (mapCateJub[row.categocupa] || 0) + row.aporta_jub;
        }
    });

    totalPEA = totalOcupados + totalDesocupados;

    // --- KPIs Update ---
    document.getElementById('kpi-pob-total').innerText = formatNumber(Math.round(totalPET));

    let topEdad = Object.keys(mapEdadPET).length ? Object.keys(mapEdadPET).reduce((a, b) => mapEdadPET[a] > mapEdadPET[b] ? a : b) : "--";
    document.getElementById('kpi-edad-mayor').innerText = topEdad;

    let topDpto = Object.keys(mapDpto).length ? Object.keys(mapDpto).reduce((a, b) => mapDpto[a] > mapDpto[b] ? a : b) : "--";
    document.getElementById('kpi-dpto-mayor').innerText = topDpto;

    document.getElementById('kpi-anios-estudio').innerText = totalPET > 0 ? (totalAniosPond / totalPET).toFixed(1) : "0";
    document.getElementById('kpi-ips').innerText = totalOcupados > 0 ? ((totalAportaIPS / totalOcupados) * 100).toFixed(1) + '%' : "0%";
    document.getElementById('kpi-jubilacion').innerText = totalOcupados > 0 ? ((totalAportaJub / totalOcupados) * 100).toFixed(1) + '%' : "0%";

    document.getElementById('kpi-tft').innerText = totalPET > 0 ? ((totalPEA / totalPET) * 100).toFixed(1) + '%' : "0%";
    document.getElementById('poblacion-ref-lab').innerText = `Ref: ${formatNumber(Math.round(totalPET))} (PET)`;
    document.getElementById('kpi-ocupacion').innerText = totalPEA > 0 ? ((totalOcupados / totalPEA) * 100).toFixed(1) + '%' : "0%";
    document.getElementById('kpi-desocupacion').innerText = totalPEA > 0 ? ((totalDesocupados / totalPEA) * 100).toFixed(1) + '%' : "0%";

    const sumSML = obrerosSML["Menos de 1 SML"] + obrerosSML["1 SML"] + obrerosSML["Más de 1 SML"];
    document.getElementById('kpi-supera-sml').innerText = sumSML > 0 ? ((obrerosSML["Más de 1 SML"] / sumSML) * 100).toFixed(1) + '%' : 'N/A';

    // --- Tab 1 Demographic Charts ---
    updateChartData(charts.sexo, Object.keys(mapSexo), [{ data: Object.values(mapSexo), backgroundColor: [colors.blue, colors.pink, colors.yellow] }]);

    const edadSorted = Object.keys(mapEdadPET).sort();
    updateChartData(charts.edad, edadSorted, [{ label: 'Población (PET)', data: edadSorted.map(k => mapEdadPET[k]), backgroundColor: colors.purple }]);

    const dptoSorted = Object.entries(mapDpto).sort((a, b) => b[1] - a[1]); // Descending
    updateChartData(charts.dpto, dptoSorted.map(d => d[0]), [{ label: 'Población (PET)', data: dptoSorted.map(d => d[1]), backgroundColor: colors.teal }]);

    // --- Tab 2 Education Charts ---
    const eduAvg = edadSorted.map(k => mapEdadPET[k] > 0 ? (mapEdadAniosPond[k] / mapEdadPET[k]).toFixed(1) : 0);
    updateChartData(charts.eduEdad, edadSorted, [{ label: 'Años Promedio', data: eduAvg, backgroundColor: colors.blue }]);

    // --- Tab 3 Health Charts ---
    const cates = Object.keys(mapCateOcupados).filter(c => c !== "NR").sort();
    const pctIps = cates.map(c => mapCateOcupados[c] > 0 ? (mapCateIPS[c] / mapCateOcupados[c] * 100) : 0);
    const pctJub = cates.map(c => mapCateOcupados[c] > 0 ? (mapCateJub[c] / mapCateOcupados[c] * 100) : 0);
    updateChartData(charts.saludCate, cates, [
        { label: 'IPS (%)', data: pctIps, backgroundColor: colors.teal },
        { label: 'Jubilación (%)', data: pctJub, backgroundColor: colors.orange }
    ]);

    updateChartData(charts.saludDonut, ['Con IPS', 'Sin IPS'], [{
        data: [totalAportaIPS, totalOcupados - totalAportaIPS],
        backgroundColor: [colors.teal, colors.gray]
    }]);

    // --- Tab 4 Laboral Charts ---
    const cateData = cates.map(c => mapCateOcupados[c]);
    updateChartData(charts.cateOcupa, cates, [{ label: 'Ocupados', data: cateData, backgroundColor: palette }]);

    // --- Tab 5 Historical Charts ---
    updateHistoricalCharts();
    updateChartData(charts.smlDonut, ['Menos de 1 SML', '1 SML', 'Más de 1 SML'], [{
        data: [obrerosSML["Menos de 1 SML"], obrerosSML["1 SML"], obrerosSML["Más de 1 SML"]],
        backgroundColor: [colors.red, colors.yellow, colors.green]
    }]);

    updateMaps(mapDpto, mapDptoPEA);
}

function updateChartData(chart, labels, datasets) {
    chart.data.labels = labels;
    chart.data.datasets = datasets;
    chart.update();
}

function updateHistoricalCharts() {
    const dimTimeGrp = cf.dimension(d => d.trimestre_desc);
    const grpTime = dimTimeGrp.group().reduce(
        (p, v) => {
            p.pet += v.personas_pet; p.pea += (v.ocupados + v.desocupados);
            p.ocupados += v.ocupados; p.desoc += v.desocupados;
            p.ips += v.aporta_ips; p.jub += v.aporta_jub;
            if (v.categocupa === 'Obrero privado' && v.sml_cat !== 'NR') p.sml[v.sml_cat] += v.ocupados;
            return p;
        },
        (p, v) => {
            p.pet -= v.personas_pet; p.pea -= (v.ocupados + v.desocupados);
            p.ocupados -= v.ocupados; p.desoc -= v.desocupados;
            p.ips -= v.aporta_ips; p.jub -= v.aporta_jub;
            if (v.categocupa === 'Obrero privado' && v.sml_cat !== 'NR') p.sml[v.sml_cat] -= v.ocupados;
            return p;
        },
        () => ({ pet: 0, pea: 0, ocupados: 0, desoc: 0, ips: 0, jub: 0, sml: { "Menos de 1 SML": 0, "1 SML": 0, "Más de 1 SML": 0 } })
    );

    const timeData = grpTime.all().sort((a, b) => a.key.localeCompare(b.key));
    dimTimeGrp.dispose();

    const labels = [];
    const tasaOcup = [], tasaDesoc = [], covIps = [], covJub = [];
    const smlMenos = [], smlIgual = [], smlMas = [];

    timeData.forEach(d => {
        labels.push(d.key);
        const v = d.value;
        tasaOcup.push(v.pet > 0 ? (v.ocupados / v.pet * 100) : 0);
        tasaDesoc.push(v.pea > 0 ? (v.desoc / v.pea * 100) : 0);
        covIps.push(v.ocupados > 0 ? (v.ips / v.ocupados * 100) : 0);
        covJub.push(v.ocupados > 0 ? (v.jub / v.ocupados * 100) : 0);

        const tSml = v.sml["Menos de 1 SML"] + v.sml["1 SML"] + v.sml["Más de 1 SML"];
        smlMenos.push(tSml > 0 ? (v.sml["Menos de 1 SML"] / tSml * 100) : 0);
        smlIgual.push(tSml > 0 ? (v.sml["1 SML"] / tSml * 100) : 0);
        smlMas.push(tSml > 0 ? (v.sml["Más de 1 SML"] / tSml * 100) : 0);
    });

    updateChartData(charts.evolLaboral, labels, [
        { label: 'T. Ocupación (%)', data: tasaOcup, borderColor: colors.blue, backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true },
        { label: 'T. Desocupación (%)', data: tasaDesoc, borderColor: colors.red, backgroundColor: 'transparent' }
    ]);

    updateChartData(charts.evolSalud, labels, [
        { label: 'Cobertura IPS (%)', data: covIps, borderColor: colors.teal, backgroundColor: 'transparent' },
        { label: 'Aporte Jubilación (%)', data: covJub, borderColor: colors.orange, backgroundColor: 'transparent' }
    ]);

    updateChartData(charts.smlEvol, labels, [
        { label: 'Menos de 1 SML (%)', data: smlMenos, backgroundColor: colors.red },
        { label: '1 SML (%)', data: smlIgual, backgroundColor: colors.yellow },
        { label: 'Más de 1 SML (%)', data: smlMas, backgroundColor: colors.green }
    ]);
}

/* ============================
    Leaflet Map Rendering
============================ */
function getColorPop(d) {
    return d > 300000 ? '#047857' : // emerald-700
        d > 100000 ? '#10b981' : // emerald-500
            d > 50000 ? '#34d399' : // emerald-400
                d > 20000 ? '#6ee7b7' : // emerald-300
                    '#a7f3d0';  // emerald-200
}

function getColorLab(d) {
    return d > 70 ? '#1d4ed8' : // blue-700
        d > 65 ? '#2563eb' : // blue-600
            d > 60 ? '#3b82f6' : // blue-500
                d > 55 ? '#60a5fa' : // blue-400
                    '#93c5fd';  // blue-300
}

function onEachMapFeature(feature, layer, mapType) {
    layer.on({
        mouseover: (e) => {
            var l = e.target;
            l.setStyle({ weight: 3, color: '#f8fafc', dashArray: '', fillOpacity: 0.9 });
            l.bringToFront();
        },
        mouseout: (e) => {
            geojsonLayers[mapType].resetStyle(e.target);
        }
    });
}

function initMaps() {
    if (!geoJsonData) return;

    // Define standard carto dark layer
    const darkTile = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const tileOptions = { attribution: '&copy; CARTO', subdomains: 'abcd', maxZoom: 18 };

    // 1. Demografia Map
    maps.demografia = L.map('map-demografia').setView([-23.5, -58.0], 6);
    L.tileLayer(darkTile, tileOptions).addTo(maps.demografia);

    geojsonLayers.demografia = L.geoJson(geoJsonData, {
        style: () => ({ fillColor: '#a7f3d0', weight: 2, opacity: 1, color: 'white', dashArray: '3', fillOpacity: 0.7 }),
        onEachFeature: (f, l) => onEachMapFeature(f, l, 'demografia')
    }).addTo(maps.demografia);

    // 2. Laboral Map
    maps.laboral = L.map('map-laboral').setView([-23.5, -58.0], 6);
    L.tileLayer(darkTile, tileOptions).addTo(maps.laboral);

    geojsonLayers.laboral = L.geoJson(geoJsonData, {
        style: () => ({ fillColor: '#93c5fd', weight: 2, opacity: 1, color: 'white', dashArray: '3', fillOpacity: 0.8 }),
        onEachFeature: (f, l) => onEachMapFeature(f, l, 'laboral')
    }).addTo(maps.laboral);
}

function updateMaps(mapDpto, mapDptoPEA) {
    if (!geoJsonData || !geojsonLayers.demografia || !geojsonLayers.laboral) return;

    // Update Demografia Layer (PET)
    geojsonLayers.demografia.eachLayer(layer => {
        const dptoName = layer.feature.properties.dpto_name;
        const pet = mapDpto[dptoName] || 0;
        layer.setStyle({ fillColor: getColorPop(pet) });

        layer.bindPopup(`
            <div class="custom-popup">
                <strong>${dptoName}</strong>
                Población PET: ${formatNumber(Math.round(pet))}
            </div>
        `);
    });

    // Update Laboral Layer (Tasa FT)
    geojsonLayers.laboral.eachLayer(layer => {
        const dptoName = layer.feature.properties.dpto_name;
        const pet = mapDpto[dptoName] || 0;
        const pea = mapDptoPEA[dptoName] || 0;
        const tasa = pet > 0 ? (pea / pet) * 100 : 0;

        layer.setStyle({ fillColor: getColorLab(tasa) });

        layer.bindPopup(`
            <div class="custom-popup">
                <strong>${dptoName}</strong>
                Tasa Fuerza Trabajo: ${tasa.toFixed(1)}%<br>
                Fuerza Trabajo (PEA): ${formatNumber(Math.round(pea))}
            </div>
        `);
    });
}
