# Metodología del Tablero de Indicadores (INE, EPHC Trimestral)

## 1. Introducción

Este tablero tiene como propósito centralizar, visualizar y analizar indicadores socioeconómicos derivados de la **Encuesta Permanente de Hogares Continua (EPHC)** del **Instituto Nacional de Estadística (INE) del Paraguay**, con énfasis en empleo, desocupación, subocupación e ingresos, además de otras características sociales y económicas, para describir la evolución del bienestar de la población. :contentReference[oaicite:0]{index=0}

La EPHC investiga a la población residente habitual o permanentemente en **viviendas particulares** de los departamentos de la **Región Oriental y Pdte. Hayes**, excluyendo viviendas colectivas (hoteles, pensiones u otras casas de huéspedes), salvo hogares independientes dentro de esos establecimientos. :contentReference[oaicite:1]{index=1}

El operativo es continuo durante el año y publica **resultados trimestrales**. :contentReference[oaicite:2]{index=2}

---

## 2. Fuentes de datos y componentes metodológicos

### 2.1 Fuentes primarias y auxiliares

| Fuente | Uso en el tablero |
|---|---|
| **EPHC (INE), microdatos trimestrales** | Indicadores de empleo, desocupación, subocupación, inactividad, estructura de la fuerza de trabajo, e ingresos (captación mensual)  |
| **Factores de expansión EPHC (INE)** | Estimaciones poblacionales (totales y tasas) con ponderación y calibración  |
| **Proyecciones de Población, Revisión 2025 (INE)** | Totales poblacionales objetivo para la calibración de ponderadores :contentReference[oaicite:5]{index=5} |
| **Marco muestral basado en CNPV 2012** | Definición de segmentos y UPM (ATC) para el diseño muestral :contentReference[oaicite:6]{index=6} |

---

## 3. Definiciones operativas (Glosario EPHC)

> Nota normativa: las definiciones de fuerza de trabajo se basan principalmente en recomendaciones de la XIII Conferencia Internacional de Estadísticas del Trabajo (OIT, 1982). :contentReference[oaicite:7]{index=7}

### 3.1 Poblaciones y condición de actividad

#### Población en Edad de Trabajar (PET)
**Definición:** personas de **15 y más años**. 

#### Fuerza de Trabajo (Población Económicamente Activa, PEA)
**Definición:** personas de 15 y más años que trabajaron (con o sin remuneración) al menos 1 hora en el período de referencia o que, sin trabajar, mantuvieron vínculo con un empleo del cual estuvieron ausentes por motivos circunstanciales. :contentReference[oaicite:9]{index=9}

#### Ocupados
**Definición (síntesis operativa):** personas de la fuerza de trabajo que trabajaron en el período de referencia o que estuvieron ausentes de un empleo. Incluye ocupados remunerados y no remunerados (trabajadores familiares no remunerados, con umbral operativo de horas según definición de la EPHC). :contentReference[oaicite:10]{index=10}

#### Desocupados
**Definición:** personas de la fuerza de trabajo que estuvieron sin trabajo en los últimos 7 días, disponibles para trabajar de inmediato y que realizaron medidas concretas de búsqueda en los últimos 7 días, incluyendo casos que no buscaron activamente por razones específicas (enfermedad, mal tiempo o espera de noticias). 

#### Fuera de la Fuerza de Trabajo (Población Económicamente Inactiva, PEI)
**Definición:** personas de 15 y más años no clasificadas como ocupadas ni desocupadas en el período de referencia; incluye categorías como estudiantes, labores del hogar, jubilados o pensionados, rentistas y otros. :contentReference[oaicite:12]{index=12}

#### Subocupación por insuficiencia de tiempo de trabajo (Subempleo visible)
**Definición:** personas ocupadas que trabajan menos de 30 horas por semana (ocupación principal y otras), desean trabajar más horas y están disponibles para hacerlo. :contentReference[oaicite:13]{index=13}

---

## 4. Indicadores principales (tasas)

### 4.1 Período de referencia
Para empleo y desocupación, el período de referencia corresponde a los **últimos 7 días** respecto a la fecha de entrevista. :contentReference[oaicite:14]{index=14}

### 4.2 Fórmulas

#### Tasa de la Fuerza de Trabajo (TFT)
**Definición:** cociente entre la fuerza de trabajo (ocupados + desocupados) y la población de 15 y más años. :contentReference[oaicite:15]{index=15}

**Fórmula:**
```

TFT = ((Ocupados + Desocupados) / PET) × 100

```
:contentReference[oaicite:16]{index=16}

#### Tasa de Ocupación (TO)
**Definición:** cociente entre ocupados y población de 15 y más años. :contentReference[oaicite:17]{index=17}

**Fórmula:**
```

TO = (Ocupados / PET) × 100

```
:contentReference[oaicite:18]{index=18}

#### Tasa de Desocupación (TD), desempleo abierto
**Definición:** cociente entre desocupados y fuerza de trabajo. :contentReference[oaicite:19]{index=19}

**Fórmula:**
```

TD = (Desocupados / Fuerza de Trabajo) × 100

```
:contentReference[oaicite:20]{index=20}

#### Tasa de Subocupación por insuficiencia de tiempo (TS)
**Definición:** cociente entre subocupados por insuficiencia de tiempo y fuerza de trabajo. :contentReference[oaicite:21]{index=21}

**Fórmula:**
```

TS = (Subocupados visibles / Fuerza de Trabajo) × 100

```
:contentReference[oaicite:22]{index=22}

#### Tasa combinada de subocupación y desocupación (TCSD)
**Definición:** cociente entre (subocupados visibles + desocupados) y fuerza de trabajo. :contentReference[oaicite:23]{index=23}

**Fórmula:**
```

TCSD = ((Subocupados visibles + Desocupados) / Fuerza de Trabajo) × 100

```
:contentReference[oaicite:24]{index=24}

#### Tasa fuera de la fuerza de trabajo (Inactividad)
**Definición:** cociente entre la población fuera de la fuerza de trabajo y la población de 15 y más años. :contentReference[oaicite:25]{index=25}

**Fórmula:**
```

TI = (Inactivos / PET) × 100

```
:contentReference[oaicite:26]{index=26}

---

## 5. Variables de caracterización del empleo e ingresos (EPHC)

### 5.1 Clasificaciones del empleo

#### Sector económico
Clasifica la rama en tres grupos: **Primario, Secundario y Terciario**, según definición operativa de la EPHC. :contentReference[oaicite:27]{index=27}

#### Rama de actividad (CPA)
La codificación usa la **Clasificación Paraguaya de Actividad (CPA)** (adaptación de CIIU Rev. 3.1). :contentReference[oaicite:28]{index=28}

#### Ocupación (CPO)
La codificación usa la **Clasificación Paraguaya de Ocupaciones (CPO)**, con base en CIUO-88. :contentReference[oaicite:29]{index=29}

#### Categoría ocupacional
Tipo de relación con el empleador: patrón o socio activo, cuenta propia, empleado u obrero público, empleado u obrero privado, servicio doméstico asalariado, trabajador familiar no remunerado. :contentReference[oaicite:30]{index=30}

### 5.2 Ingresos

#### Fuentes de ingreso (captación mensual)
Incluye ingresos de ocupación principal, secundaria y otras, alquileres o rentas, jubilaciones o pensiones, transferencias familiares (internas y del exterior), transferencias monetarias y asistencia del Estado, prestaciones por divorcio y otros ingresos; captación con periodicidad mensual. :contentReference[oaicite:31]{index=31}

#### Ingreso en la ocupación principal
Ingreso mensual de ocupados por trabajo dependiente (asalariados) o independiente (cuenta propia y patrones). La EPHC incorpora pagos en especie (vivienda, alimentación) valorizados monetariamente. :contentReference[oaicite:32]{index=32}

---

## 6. Diseño muestral, ponderación y niveles de estimación

### 6.1 Marco y selección de la muestra
El marco muestral se construye con **segmentos** del CNPV 2012; las UPM corresponden al **Área de Trabajo del Censista (ATC)** (promedio 60 viviendas urbanas y 45 rurales). :contentReference[oaicite:33]{index=33}

El diseño es **probabilístico por conglomerados**, con **probabilidad proporcional al tamaño**, **bietápico** y **estratificado** en primera etapa. En segunda etapa se seleccionan **12 viviendas sin reemplazo** por UPM y se investiga a todas las personas residentes habituales. :contentReference[oaicite:34]{index=34}

### 6.2 Niveles de estimación garantizados por el diseño (trimestral)
En cada trimestre, el diseño permite estimaciones con nivel de confianza conocido para: **Total país, Total urbano y Total rural**. :contentReference[oaicite:35]{index=35}

> Nota para desagregaciones departamentales: si el tablero presenta resultados por departamento, se recomienda acompañar toda estimación con medidas de precisión (error estándar, CV, IC), y advertir sobre el uso analítico cuando la precisión sea limitada, conforme a los criterios de error y CV descritos en la sección 7.

### 6.3 Factores de expansión (ponderación y calibración)
Los factores de expansión son ajustados y calibrados iterativamente hasta converger a totales poblacionales estimados con las **Proyecciones de Población Revisión 2025**. :contentReference[oaicite:36]{index=36}

---

## 7. Precisión, errores e interpretación de calidad

Las estimaciones están sujetas a errores de muestreo y a errores ajenos al muestreo (marco, no respuesta, codificación, etc.). :contentReference[oaicite:37]{index=37}

### 7.1 Coeficiente de variación (CV)
El **CV** se define como el error estándar dividido por el valor estimado (error relativo). Criterios prácticos:
- **CV ≤ 5%**: muy precisa
- **CV ≤ 10%**: precisa
- **CV ≤ 20%**: aceptable
- **CV > 20%**: poco confiable, usar con precaución :contentReference[oaicite:38]{index=38}

### 7.2 Intervalos de confianza
Los intervalos de confianza se construyen como:
```

Estimador ± z × error estándar

```
donde típicamente se usa 95% (z = 1,96). :contentReference[oaicite:39]{index=39}

---

## 8. Periodicidad y “fecha de corte” del tablero

| Componente | Periodicidad en el tablero |
|---|---|
| Empleo, desocupación, subocupación, inactividad, TFT/TO/TD/TS/TCSD | Trimestral (EPHC) :contentReference[oaicite:40]{index=40} |
| Ingresos (ocupación principal y demás fuentes) | Captación mensual, reporte por trimestre según publicación EPHC :contentReference[oaicite:41]{index=41} |

**Fecha de actualización sugerida:** “Último trimestre publicado por el INE” (por ejemplo, **4º trimestre 2025** cuando el tablero se alinea con este anexo metodológico).

