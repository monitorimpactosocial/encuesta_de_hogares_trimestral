import os
import pyreadstat
import pandas as pd
import json
import numpy as np

DIR_PATH = ".."
OUTPUT_PATH = "datos_consolidados.json"

class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)

sml_history = [
    ("2015-01-01", 1824055),  # vigente desde 2014 (sin reajuste en 2015)
    ("2016-01-01", 1824055),  # vigente hasta el reajuste de nov-2016
    ("2017-01-01", 1964507),  # reajuste nov-2016
    ("2018-01-01", 2041123),  # reajuste desde jul-2017
    ("2019-01-01", 2112562),  # reajuste desde jul-2018
    ("2020-01-01", 2192839),  # reajuste desde jul-2019 (sin cambio en 2020)
    ("2021-01-01", 2192839),  # sin cambio hasta jul-2021
    ("2022-01-01", 2289324),  # reajuste desde jul-2021
    ("2023-01-01", 2550307),  # reajuste 2022
    ("2024-01-01", 2680373),  # reajuste 2023
    ("2025-01-01", 2798309),  # reajuste desde jul-2024
    ("2026-01-01", 2899048),  # reajuste desde jul-2025
]
df_sml = pd.DataFrame(sml_history, columns=["fecha", "sml"])
df_sml["fecha"] = pd.to_datetime(df_sml["fecha"])
df_sml = df_sml.sort_values(by="fecha")

def get_sml(anio, mes):
    fecha_consulta = pd.to_datetime(f"{anio}-{mes:02d}-01")
    smls_aplicables = df_sml[df_sml["fecha"] <= fecha_consulta]
    if smls_aplicables.empty:
        return df_sml.iloc[0]["sml"]
    return smls_aplicables.iloc[-1]["sml"]

def get_mes_trimestre(trimestre):
    t = (trimestre - 1) % 4 + 1
    if t == 1: return 2
    if t == 2: return 5
    if t == 3: return 8
    if t == 4: return 11
    return 2

map_categocupa = {
    1: "Obrero público",
    2: "Obrero privado",
    3: "Empleador/patrón",
    4: "Cuenta propia",
    5: "Trabajador fam. no remun.",
    6: "Doméstico/a",
    9: "NR"
}

map_sexo = {
    1: "Hombres",
    6: "Mujeres"
}

map_dpto = {
    1: "Concepción", 2: "San Pedro", 3: "Cordillera", 4: "Guairá", 
    5: "Caaguazú", 6: "Caazapá", 7: "Itapúa", 8: "Misiones", 
    9: "Paraguarí", 10: "Alto Paraná", 11: "Central", 12: "Ñeembucú", 
    13: "Amambay", 14: "Canindeyú", 15: "Pdte. Hayes", 0: "Asunción"
}
def get_dpto_from_estgeo(estgeo):
    # ESTGEO format: Asuncion=1. Rest: Urbana ends in 1, Rural ends in 6. (e.g., 11=Concepcion Urbano)
    if pd.isna(estgeo): return "NR"
    val = int(estgeo)
    if val == 1: return "Asunción"
    # Integer division by 10 gives the exact department ID for Paraguay (1 to 15)
    # 11 -> dept 1, 16 -> dept 1, 21 -> dept 2, 26 -> dept 2
    dpto_num = val // 10
    return map_dpto.get(dpto_num, "NR")

def get_tramo_edad(edad):
    if pd.isna(edad): return "NR"
    e = int(edad)
    if e < 15: return "< 15"
    elif e <= 24: return "15-24"
    elif e <= 34: return "25-34"
    elif e <= 44: return "35-44"
    elif e <= 54: return "45-54"
    elif e <= 64: return "55-64"
    else: return "65+"

# Structure to hold heavily grouped data
# Instead of doing individual groups, we will build a single flattened table of aggregations
# GroupBy Keys: Trimestre, Sexo, Edad, Dpto, CategOcupa
master_cohorts = []

archivos_sav = [f for f in os.listdir(DIR_PATH) if f.upper().endswith(".SAV")]

for sav_file in archivos_sav:
    ruta_completa = os.path.join(DIR_PATH, sav_file)
    print(f"Procesando: {sav_file}")
    
    try:
        df, meta = pyreadstat.read_sav(ruta_completa)
        df.columns = [col.upper() for col in df.columns]
        
        factor_col = "FACTOR" if "FACTOR" in df.columns else "FEX.2022" if "FEX.2022" in df.columns else "FEX" if "FEX" in df.columns else None
        anio_col = "ANIO" if "ANIO" in df.columns else "AÑO" if "AÑO" in df.columns else None
        
        if not factor_col or not anio_col or "TRIMESTRE" not in df.columns:
            continue
            
        df['EDAD'] = pd.to_numeric(df['P02'], errors='coerce')
        df['PESO'] = pd.to_numeric(df[factor_col], errors='coerce').fillna(0)
        
        df_anio = df[anio_col].dropna().unique()
        df_trim = df['TRIMESTRE'].dropna().unique()
        if len(df_anio) == 0 or len(df_trim) == 0: continue
            
        anio = int(df_anio[0])
        trim_raw = int(df_trim[0])
        trim_real = int((trim_raw - 1) % 4 + 1)
        
        mes_intermedio = get_mes_trimestre(trim_real)
        sml_vigente = float(get_sml(anio, mes_intermedio))
        trimestre_desc = f"{anio}Trim{trim_real}"
        
        # Población General Base >= 15 for PEA (Though we keep all for education context if needed, but standard is >=15)
        df = df[df['EDAD'] > 14].copy()
        
        df['ocupado'] = ((df['A02'] == 1) | (df['A03'] == 1) | (df['A04'] == 1))
        df['desocupado'] = (~df['ocupado']) & (df['A08'] == 1)
        df['inactivo'] = ~(df['ocupado'] | df['desocupado'])
        
        if "CATE_PEA" in df.columns:
            df['categocupa'] = df['CATE_PEA'].map(map_categocupa).fillna("NR")
        else:
            df['categocupa'] = "NR"
            
        df['sexo'] = df['P06'].map(map_sexo).fillna("NR")
        df['tramo_edad'] = df['EDAD'].apply(get_tramo_edad)
        
        estgeo_col = "ESTGEO" if "ESTGEO" in df.columns else None
        if estgeo_col:
            df['departamento'] = df[estgeo_col].apply(get_dpto_from_estgeo)
        else:
            df['departamento'] = "NR"
            
        # SML Classification
        df['ingreso'] = 0
        df['sml_cat'] = "NR"
        ingreso_col = "E01AIMDE" if "E01AIMDE" in df.columns else ""
        if ingreso_col in df.columns:
            df['ingreso'] = pd.to_numeric(df[ingreso_col], errors='coerce').fillna(0)
            
            def clasificar_sml(row):
                if row['categocupa'] != 'Obrero privado' or row['ingreso'] <= 0: return "NR"
                if row['ingreso'] < 0.90 * sml_vigente: return "Menos de 1 SML"
                if row['ingreso'] <= 1.10 * sml_vigente: return "1 SML"
                return "Más de 1 SML"
                
            df['sml_cat'] = df.apply(clasificar_sml, axis=1)

        # EDUCACION & PREVISION SOCIAL (Placeholder mappings based on EPHC standards)
        # B10: Aporta a jubilacion (Ocupación principal) 1=Si, 6=No
        df['aporta_jubilacion'] = 0
        if "B10" in df.columns:
            df.loc[df['B10'] == 1, 'aporta_jubilacion'] = df.loc[df['B10'] == 1, 'PESO']
            
        # Seguro Médico (S01A... IPS) - Generalmente EPHC usa un modulo de salud, revisaremos si S01S/IPS existe.
        # Often it is B11 for Caja de aportes (1=IPS). So if B11 == 1 -> Aporta IPS
        df['aporta_ips'] = 0
        if "B11" in df.columns:
            df.loc[df['B11'] == 1, 'aporta_ips'] = df.loc[df['B11'] == 1, 'PESO']
            
        # Años de estudio (AÑOEST o ED05 etc)
        df['anios_estudio_total'] = 0 # Weight multiplied to calculate mean later
        anioest_col = "AÑOEST" if "AÑOEST" in df.columns else "ANIOEST" if "ANIOEST" in df.columns else None
        if anioest_col in df.columns:
            df['anios_val'] = pd.to_numeric(df[anioest_col], errors='coerce').fillna(0)
            df['anios_estudio_total'] = df['anios_val'] * df['PESO']
            
        # Aggregate dynamically by groups. 
        # For a cross-filtering dashboard, we pre-aggregate grouping by the filter dimensions.
        grouped = df.groupby(['sexo', 'tramo_edad', 'departamento', 'categocupa', 'sml_cat']).agg(
            personas_pet=('PESO', 'sum'),
            ocupados=('PESO', lambda x: x[df.loc[x.index, 'ocupado']].sum()),
            desocupados=('PESO', lambda x: x[df.loc[x.index, 'desocupado']].sum()),
            inactivos=('PESO', lambda x: x[df.loc[x.index, 'inactivo']].sum()),
            aporta_jub=('aporta_jubilacion', 'sum'),
            aporta_ips=('aporta_ips', 'sum'),
            anios_estudio_pond=('anios_estudio_total', 'sum') # To get average: divide by personas_pet
        ).reset_index()

        # Append global info for merging
        grouped['trimestre_desc'] = trimestre_desc
        grouped['anio'] = anio
        grouped['trimestre_num'] = trim_real
        grouped['sml_vigente'] = sml_vigente
        
        master_cohorts.append(grouped)
        
    except Exception as e:
        print(f"Error procesando {sav_file}: {e}")

if not master_cohorts:
    print("No data processed.")
    exit()

# Combine all into a massive aggregated dataframe
df_master = pd.concat(master_cohorts, ignore_index=True)

# Clean up and export
df_master = df_master.sort_values(by=['anio', 'trimestre_num'])

# To keep the JSON manageable and fast for the frontend, we export this cross-tabulated dataset.
# The frontend using Crossfilter.js or raw JS will sum up metrics by chosen dimension.
export_data = df_master.to_dict('records')

with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(export_data, f, indent=4, ensure_ascii=False, cls=NpEncoder)

print(f"\nDatos Multidimensionales generados en: {OUTPUT_PATH} ({len(export_data)} pre-agrupaciones de filtro)")
