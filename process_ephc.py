import os
import pyreadstat
import pandas as pd
import json
import datetime

DIR_PATH = ".."
OUTPUT_PATH = "datos_consolidados.json"

# Salario Minimo Legal history
sml_history = [
    ("2021-07-01", 2289324),
    ("2022-07-01", 2550307),
    ("2023-07-01", 2680373),
    ("2024-06-01", 2798309),
    ("2025-07-01", 2798309) # Assuming same until new update
]
# Convert to dataframe and sort
df_sml = pd.DataFrame(sml_history, columns=["fecha", "sml"])
df_sml["fecha"] = pd.to_datetime(df_sml["fecha"])
df_sml = df_sml.sort_values(by="fecha")

def get_sml(anio, mes):
    # Devuelve el SML aplicable para un año y mes específico
    fecha_consulta = pd.to_datetime(f"{anio}-{mes:02d}-01")
    # Filtramos los que son menores o iguales a la fecha de consulta
    smls_aplicables = df_sml[df_sml["fecha"] <= fecha_consulta]
    if smls_aplicables.empty:
        return df_sml.iloc[0]["sml"] # Default
    return smls_aplicables.iloc[-1]["sml"]

def get_mes_trimestre(trimestre):
    # Mapeo del R script
    # 1: Feb, 2: May, 3: Ago, 4: Nov
    # La EPHC tiene trimestres del 1 al 20, correspondientes a Q1-Q4 de diferentes años
    # 1=2022Q1, 2=2022Q2, 3=2022Q3, 4=2022Q4
    # 5=2023Q1, 6=2023Q2, etc. (En la base SAV TRIMESTRE es continuo)
    # Sin embargo, en algunas bases "TRIMESTRE" solo dice 1, 2, 3, 4 y el "ANIO" da el año.
    # Evaluaremos el modulo basandonos en el trimestre 1..4 (por modulo 4) si es continuo, o si es 1-4 directo
    t = (trimestre - 1) % 4 + 1
    if t == 1: return 2
    if t == 2: return 5
    if t == 3: return 8
    if t == 4: return 11
    return 2 # fallback

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

resultados_trimestrales = []
sml_data_grouped = []
categocupa_data_grouped = []

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
        # Ajustamos porque algunas bases dicen "anio 2022" pero trimestre es "5" en vez de "1", el mod nos da el verdadero.
        trim_raw = int(df_trim[0])
        trim_real = (trim_raw - 1) % 4 + 1
        
        mes_intermedio = get_mes_trimestre(trim_real)
        sml_vigente = get_sml(anio, mes_intermedio)
        
        trimestre_desc = f"{anio}Trim{trim_real}"
        
        # Población >= 15
        df = df[df['EDAD'] > 14].copy()
        
        # Identificar ocupados, desocupados
        df['ocupado'] = ((df['A02'] == 1) | (df['A03'] == 1) | (df['A04'] == 1))
        df['desocupado'] = (~df['ocupado']) & (df['A08'] == 1)
        
        # Mapeos categóricos
        if "CATE_PEA" in df.columns:
            df['categocupa'] = df['CATE_PEA'].map(map_categocupa).fillna("NR")
        else:
            df['categocupa'] = "NR"
            
        df['sexo'] = df['P06'].map(map_sexo).fillna("NR")
        
        # Filtro Ingreso (e01aimde) > 0 para asalariados / ocupados
        ingreso_col = "E01AIMDE" if "E01AIMDE" in df.columns else ""
        if ingreso_col in df.columns:
            df['ingreso'] = pd.to_numeric(df[ingreso_col], errors='coerce').fillna(0)
            
            # Clasificacion SML solo para obreros privados (R script focus)
            obreros_privados = df[(df['categocupa'] == 'Obrero privado') & (df['ingreso'] > 0)].copy()
            
            # Clasificacion
            def clasificar_sml(ing):
                if ing < 0.90 * sml_vigente: return "Menos de 1 SML"
                if ing <= 1.10 * sml_vigente: return "1 SML"
                return "Más de 1 SML"
                
            obreros_privados['sml_cat'] = obreros_privados['ingreso'].apply(clasificar_sml)
            
            # Agrupar por categoria SML
            sml_grp = obreros_privados.groupby('sml_cat')['PESO'].sum().reset_index()
            total_pesos = sml_grp['PESO'].sum()
            for _, row in sml_grp.iterrows():
                sml_data_grouped.append({
                    "trimestre_desc": trimestre_desc,
                    "anio": anio,
                    "trimestre": trim_real,
                    "sml_vigente": sml_vigente,
                    "categoria": row['sml_cat'],
                    "personas": round(row['PESO'], 2),
                    "porcentaje": round((row['PESO'] / total_pesos * 100), 1) if total_pesos > 0 else 0
                })
        
        # Guardar Ocupados por Categoría Ocupacional
        ocupados = df[df['ocupado']].copy()
        cate_grp = ocupados.groupby('categocupa')['PESO'].sum().reset_index()
        for _, row in cate_grp.iterrows():
            categocupa_data_grouped.append({
                "trimestre_desc": trimestre_desc,
                "anio": anio,
                "trimestre": trim_real,
                "categocupa": row['categocupa'],
                "personas": round(row['PESO'], 2)
            })

        # Global stats
        pet_total = df['PESO'].sum()
        pea_total = df[df['ocupado'] | df['desocupado']]['PESO'].sum()
        ocupados_total = df[df['ocupado']]['PESO'].sum()
        desocupados_total = df[df['desocupado']]['PESO'].sum()
        
        resultados_trimestrales.append({
            "trimestre_desc": trimestre_desc,
            "anio": anio,
            "trimestre": trim_real,
            "sml_vigente": float(sml_vigente),
            "tasa_ocupacion": round(float(ocupados_total / pet_total * 100), 2) if pet_total > 0 else 0,
            "tasa_desocupacion": round(float(desocupados_total / pea_total * 100), 2) if pea_total > 0 else 0
        })

    except Exception as e:
        print(f"Error procesando {sav_file}: {e}")

# Sorting all collections
resultados_trimestrales = sorted(resultados_trimestrales, key=lambda x: (x['anio'], x['trimestre']))
sml_data_grouped = sorted(sml_data_grouped, key=lambda x: (x['anio'], x['trimestre']))
categocupa_data_grouped = sorted(categocupa_data_grouped, key=lambda x: (x['anio'], x['trimestre']))

# Ensure categorical percentages across category data
df_cate = pd.DataFrame(categocupa_data_grouped)
if not df_cate.empty:
    df_cate['total_periodo'] = df_cate.groupby('trimestre_desc')['personas'].transform('sum')
    df_cate['porcentaje'] = (df_cate['personas'] / df_cate['total_periodo'] * 100).round(1)
    categocupa_data_grouped = df_cate.to_dict('records')

salida_json = {
    "globales": resultados_trimestrales,
    "sml_obreros_privados": sml_data_grouped,
    "categorias_ocupacionales": categocupa_data_grouped
}

with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(salida_json, f, indent=4, ensure_ascii=False)

print(f"\nDatos de Monitoreo extraídos exitosamente y guardados en: {OUTPUT_PATH}")
