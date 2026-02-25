// Variables Globales 
let datosCompletos = {};
let globales = [];
let smlData = [];
let cateData = [];

let smlChart, cateOcupaDonutChart, cateOcupaStackChart;

const formatNumber = (num) => new Intl.NumberFormat('es-PY').format(num);
const formatCurrency = (num) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(num);

Chart.register(ChartDataLabels);

document.addEventListener('DOMContentLoaded', () => {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#64748B';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;

    fetchDatos();
});

async function fetchDatos() {
    try {
        const res = await fetch('datos_consolidados.json');
        datosCompletos = await res.json();

        globales = datosCompletos.globales || [];
        smlData = datosCompletos.sml_obreros_privados || [];
        cateData = datosCompletos.categorias_ocupacionales || [];

        if (globales.length > 0) {
            initApp();
        } else {
            alert("Los datos procesados están vacíos o no se pudieron cargar.");
        }
    } catch (e) {
        console.error("Error al cargar JSON:", e);
        alert("Asegúrate de ejecutar process_ephc.py localmente y montar un servidor web (ej. Live Server).");
    }
}

function initApp() {
    populateSelect();
    const latestGlobal = globales[globales.length - 1];

    updateKPIs(latestGlobal);
    renderCharts();

    document.getElementById('trimestre-select').addEventListener('change', (e) => {
        const val = e.target.value; // e.g., "2024Trim1"
        if (val === 'latest') {
            updateKPIs(globales[globales.length - 1]);
            updateDonutChart(globales[globales.length - 1].trimestre_desc);
        } else {
            const row = globales.find(d => d.trimestre_desc === val);
            if (row) {
                updateKPIs(row);
                updateDonutChart(val);
            }
        }
    });
}

function populateSelect() {
    const select = document.getElementById('trimestre-select');
    select.innerHTML = '';

    const reverseData = [...globales].reverse();

    reverseData.forEach((row, i) => {
        const option = document.createElement('option');
        const text = row.trimestre_desc;
        option.value = row.trimestre_desc;
        option.textContent = text + (i === 0 ? ' (Actual)' : '');
        select.appendChild(option);
    });
}

function updateKPIs(row) {
    const prevIndex = globales.findIndex(r => r.trimestre_desc === row.trimestre_desc) - 1;
    const prevRow = prevIndex >= 0 ? globales[prevIndex] : null;

    document.getElementById('kpi-ocupacion').textContent = row.tasa_ocupacion.toFixed(1) + '%';
    document.getElementById('kpi-desocupacion').textContent = row.tasa_desocupacion.toFixed(1) + '%';
    document.getElementById('kpi-sml').textContent = formatCurrency(row.sml_vigente);

    if (prevRow) {
        setTrend('trend-ocupacion', row.tasa_ocupacion, prevRow.tasa_ocupacion, false);
        setTrend('trend-desocupacion', row.tasa_desocupacion, prevRow.tasa_desocupacion, true);
    } else {
        document.querySelectorAll('.trend').forEach(el => {
            if (el.id !== 'trend-sml') el.textContent = 'Histórico N/A';
        });
    }
}

function setTrend(id, current, prev, isNegativeGood) {
    if (!current || !prev) return;
    const diff = current - prev;
    const pct = (diff / prev) * 100;
    const el = document.getElementById(id);

    el.className = 'trend';
    if (diff > 0) {
        el.textContent = `↗ ${Math.abs(pct).toFixed(1)}% vs ant.`;
        el.classList.add(isNegativeGood ? 'negative' : 'positive');
    } else if (diff < 0) {
        el.textContent = `↘ ${Math.abs(pct).toFixed(1)}% vs ant.`;
        el.classList.add(isNegativeGood ? 'positive' : 'negative');
    } else {
        el.textContent = `= Sin cambios`;
        el.classList.add('neutral');
    }
}

function renderCharts() {
    const periodos = globales.map(g => g.trimestre_desc);

    // -------------------------------------------------------------
    // CHART 1: SML Distribution across quarters for private workers
    // -------------------------------------------------------------
    const catSml1 = []; // Menos de 1 SML
    const catSml2 = []; // 1 SML
    const catSml3 = []; // Más de 1 SML

    periodos.forEach(p => {
        const subset = smlData.filter(d => d.trimestre_desc === p);
        const m1 = subset.find(d => d.categoria === 'Menos de 1 SML') || { porcentaje: 0 };
        const i1 = subset.find(d => d.categoria === '1 SML') || { porcentaje: 0 };
        const p1 = subset.find(d => d.categoria === 'Más de 1 SML') || { porcentaje: 0 };

        catSml1.push(m1.porcentaje);
        catSml2.push(i1.porcentaje);
        catSml3.push(p1.porcentaje);
    });

    const ctxSml = document.getElementById('smlChart').getContext('2d');
    smlChart = new Chart(ctxSml, {
        type: 'bar',
        data: {
            labels: periodos,
            datasets: [
                {
                    label: 'Menos de 1 SML (%)',
                    data: catSml1,
                    backgroundColor: '#F87171' // Red - below limit
                },
                {
                    label: '1 SML (%)',
                    data: catSml2,
                    backgroundColor: '#FBBF24' // Yellow - exact
                },
                {
                    label: 'Más de 1 SML (%)',
                    data: catSml3,
                    backgroundColor: '#34D399' // Green - above limit
                }
            ]
        },
        options: {
            plugins: {
                title: { display: false },
                datalabels: {
                    color: 'white',
                    font: { weight: 'bold' },
                    formatter: Math.round
                },
                tooltip: {
                    callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%` }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true },
                y: { stacked: true, max: 100 }
            }
        }
    });

    // -------------------------------------------------------------
    // CHART 2: Composición Ocupacional (Current Period) Donut
    // -------------------------------------------------------------
    const ctxDonut = document.getElementById('cateOcupaDonutChart').getContext('2d');
    cateOcupaDonutChart = new Chart(ctxDonut, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { position: 'right' },
                datalabels: { display: false }
            }
        }
    });
    // Init it with latest period
    updateDonutChart(periodos[periodos.length - 1]);


    // -------------------------------------------------------------
    // CHART 3: Composición Ocupacional Stacked History
    // -------------------------------------------------------------
    // Extract unique categories
    const categories = [...new Set(cateData.map(d => d.categocupa))];
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'];

    const datasetsCate = categories.map((cat, i) => {
        const dataArr = periodos.map(p => {
            const item = cateData.find(c => c.trimestre_desc === p && c.categocupa === cat);
            return item ? item.porcentaje : 0;
        });

        return {
            label: cat,
            data: dataArr,
            backgroundColor: colors[i % colors.length]
        };
    });

    const ctxStack = document.getElementById('cateOcupaStackChart').getContext('2d');
    cateOcupaStackChart = new Chart(ctxStack, {
        type: 'bar',
        data: {
            labels: periodos,
            datasets: datasetsCate
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                datalabels: {
                    color: 'white',
                    font: { size: 10, weight: 'bold' },
                    formatter: function (value) {
                        return value > 5 ? Math.round(value) + '%' : ''; // Only show if substantial
                    }
                }
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true, max: 100 }
            }
        }
    });
}

function updateDonutChart(period) {
    if (!cateOcupaDonutChart) return;

    // Filter data for the specific period
    const subset = cateData.filter(d => d.trimestre_desc === period);

    if (subset.length === 0) return;

    // Sort by largest to smallest for better donut aesthetics
    subset.sort((a, b) => b.porcentaje - a.porcentaje);

    cateOcupaDonutChart.data.labels = subset.map(d => d.categocupa);
    cateOcupaDonutChart.data.datasets[0].data = subset.map(d => d.porcentaje);
    cateOcupaDonutChart.update();
}
