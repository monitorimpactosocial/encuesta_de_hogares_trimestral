# Metodología del Tablero de Indicadores Departamentales

## 1. Introducción

Este tablero de indicadores tiene como propósito centralizar, visualizar y analizar los principales indicadores socioeconómicos del departamento, facilitando el seguimiento de las condiciones de vida de la población, el comportamiento del mercado laboral, el acceso a servicios de salud y el nivel educativo.

### Fuentes de Datos Generales

| Fuente | Uso en el Tablero |
|---|---|
| **Censo Nacional de Población y Vivienda (CNPV)** | Pirámide poblacional, estructura demográfica |
| **Gran Encuesta Integrada de Hogares (GEIH)** | Indicadores del mercado laboral, informalidad |
| **Estadísticas Vitales (DANE)** | Mortalidad infantil, tasa de natalidad, esperanza de vida |
| **Encuesta de Calidad de Vida (ECV)** | Cobertura de salud, analfabetismo |
| **Sistema de Matrícula Educativa (SIMAT)** | Tasas de cobertura escolar |

---

## 2. Glosario de Indicadores

### Bloque I: Indicadores Demográficos

---

#### Tasa de Dependencia Total (TDT)

**Definición:** Mide la carga económica que representa la población dependiente (menores de 15 años y mayores de 64 años) sobre la población en edad productiva (15-64 años).

**Fórmula:**
```
TDT = [(Pob_0_14 + Pob_65+) / Pob_15_64] × 100
```

**Unidad:** Porcentaje (%)

**Fuente:** DANE – Proyecciones de Población / CNPV

---

#### Tasa de Dependencia de Adultos Mayores (TDAM)

**Definición:** Proporción de adultos mayores (65 años y más) con respecto a la población en edad de trabajar.

**Fórmula:**
```
TDAM = [Pob_65+ / Pob_15_64] × 100
```

**Unidad:** Porcentaje (%)

**Fuente:** DANE – Proyecciones de Población

---

#### Tasa de Dependencia de Jóvenes (TDJ)

**Definición:** Proporción de menores de 15 años con respecto a la población en edad de trabajar.

**Fórmula:**
```
TDJ = [Pob_0_14 / Pob_15_64] × 100
```

**Unidad:** Porcentaje (%)

**Fuente:** DANE – Proyecciones de Población

---

#### Índice de Envejecimiento (IE)

**Definición:** Proporción de adultos mayores respecto a la población joven (menores de 15 años). Valores superiores a 100 indican una población predominantemente envejecida.

**Fórmula:**
```
IE = [Pob_65+ / Pob_0_14] × 100
```

**Unidad:** Porcentaje (%)

**Fuente:** DANE – Proyecciones de Población

---

### Bloque II: Indicadores del Mercado Laboral

---

#### Tasa Global de Participación (TGP)

**Definición:** Porcentaje de la Población en Edad de Trabajar (PET, 15 años y más) que participa activamente en el mercado laboral (como ocupados o desempleados en búsqueda activa).

**Fórmula:**
```
TGP = (PEA / PET) × 100
```
Donde PEA = Población Económicamente Activa (Ocupados + Desocupados)

**Unidad:** Porcentaje (%)

**Fuente:** DANE – GEIH, Módulo de Fuerza de Trabajo

---

#### Tasa de Ocupación (TO)

**Definición:** Porcentaje de la PET que se encuentra ocupada en una actividad económica.

**Fórmula:**
```
TO = (Ocupados / PET) × 100
```

**Unidad:** Porcentaje (%)

**Fuente:** DANE – GEIH

---

#### Tasa de Desempleo (TD)

**Definición:** Porcentaje de la PEA que se encuentra desocupada (sin trabajo y buscando activamente empleo).

**Fórmula:**
```
TD = (Desocupados / PEA) × 100
```

**Unidad:** Porcentaje (%)

**Fuente:** DANE – GEIH

---

#### Informalidad Laboral

**Definición:** Porcentaje de los ocupados que trabaja en condiciones de informalidad, definida como aquellos que trabajan en establecimientos de 5 o menos personas y/o no cotizan a pensión.

**Fórmula:**
```
Informalidad = (Ocupados Informales / Total Ocupados) × 100
```

**Unidad:** Porcentaje (%)

**Fuente:** DANE – GEIH

---

#### Ingreso Promedio de los Ocupados

**Definición:** Promedio simple del ingreso laboral mensual de la población ocupada.

**Unidad:** Pesos colombianos (COP) mensuales

**Fuente:** DANE – GEIH

---

### Bloque III: Indicadores de Salud

---

#### Cobertura de Aseguramiento en Salud

**Definición:** Distribución de la población según su tipo de afiliación al Sistema General de Seguridad Social en Salud (SGSSS).

**Categorías:** Régimen Contributivo, Régimen Subsidiado, Regímenes de Excepción, No Asegurado.

**Fuente:** Ministerio de Salud y Protección Social – BDUA

---

#### Tasa de Mortalidad Infantil (TMI)

**Definición:** Número de defunciones de menores de 1 año por cada 1.000 nacidos vivos en un año dado.

**Fórmula:**
```
TMI = (Defunciones menores de 1 año / Nacidos vivos) × 1.000
```

**Unidad:** Tasa por 1.000 nacidos vivos

**Fuente:** DANE – Estadísticas Vitales

---

#### Tasa de Natalidad (TN)

**Definición:** Número de nacimientos por cada 1.000 habitantes en un año.

**Fórmula:**
```
TN = (Nacimientos / Población Total) × 1.000
```

**Unidad:** Tasa por 1.000 habitantes

**Fuente:** DANE – Estadísticas Vitales

---

#### Esperanza de Vida al Nacer (EVN)

**Definición:** Número promedio de años que se espera que viva una persona desde su nacimiento, bajo las condiciones de mortalidad actuales.

**Unidad:** Años

**Fuente:** DANE – Proyecciones de Vida / CNPV

---

### Bloque IV: Indicadores de Educación

---

#### Tasa de Analfabetismo

**Definición:** Porcentaje de la población de 15 años y más que no sabe leer ni escribir.

**Fórmula:**
```
Analfabetismo = (Analfabetos de 15+  / Pob. de 15+) × 100
```

**Unidad:** Porcentaje (%)

**Fuente:** DANE – CNPV / ECV

---

#### Tasa de Cobertura Neta (TCN)

**Definición:** Porcentaje de la población en el rango de edad oficial para un nivel educativo que se encuentra efectivamente matriculada en ese nivel.

**Fórmula:**
```
TCN = (Matriculados en edad oficial para el nivel / Población en edad oficial) × 100
```

**Unidad:** Porcentaje (%)

**Fuente:** MEN – SIMAT / DANE

---

#### Tasa de Cobertura Bruta (TCB)

**Definición:** Relación entre la matrícula total en un nivel y la población en edad oficial, sin importar si los matriculados tienen la edad oficial o no.

**Fórmula:**
```
TCB = (Matrícula total en el nivel / Población en edad oficial para el nivel) × 100
```

**Unidad:** Porcentaje (%)

> *Nota: Las TCB pueden superar el 100% cuando existe presencia de estudiantes fuera del rango de edad oficial (extraedad).*

**Fuente:** MEN – SIMAT / DANE

---

## 3. Notas Técnicas

### Tratamiento de Datos Faltantes

- Los datos poblacionales entre años censales se obtienen mediante **proyecciones lineales** basadas en los censos de referencia.
- En caso de ausencia de información para algún año, se aplica **interpolación** entre los puntos disponibles. Los valores interpolados se identifican visualmente en los gráficos con un marcador diferente.

### Factores de Expansión en las Encuestas de Hogares

- Todos los indicadores derivados de la GEIH se calculan aplicando los **factores de expansión o ponderación** provistos por el DANE, para garantizar la representatividad a nivel departamental.

### Periodicidad de la Información

| Indicador | Periodicidad |
|---|---|
| Indicadores laborales (GEIH) | Trimestral / Anual |
| Estadísticas Vitales | Anual |
| Proyecciones de Población | Anual |
| Cobertura Educativa (SIMAT) | Anual (corte oct.) |
| Aseguramiento en Salud (BDUA) | Anual |

### Fecha de Actualización

Este tablero fue construido con datos disponibles a **diciembre de 2024**. Las actualizaciones se realizan anualmente, una vez que las entidades fuente publican sus cifras definitivas.
