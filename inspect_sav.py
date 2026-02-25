import pyreadstat
import os

sav_file = '44269-REG02_EPHC_3er Trim 2024.SAV'
df, meta = pyreadstat.read_sav(sav_file)

with open('encuesta_de_hogares_trimestral/variables_dump_utf8.txt', 'w', encoding='utf-8') as f:
    f.write("--- VARIABLES AND LABELS ---\n")
    for col_name, col_label in zip(meta.column_names, meta.column_labels):
        f.write(f"{col_name}: {col_label}\n")

    f.write("\n--- VALUE LABELS (first 5 variables with value labels) ---\n")
    count = 0
    for col_name, val_labels in meta.variable_value_labels.items():
        if count >= 5:
            break
        f.write(f"{col_name}: {val_labels}\n")
        count += 1
