# Monitoreo Impacto Social - EPHC

Tablero dinámico e interactivo alimentado con microdatos de la **Encuesta Permanente de Hogares Continua (EPHC)** del INE Paraguay. Este repositorio contiene todo lo necesario para procesar los datos y visualizar los indicadores socioeconómicos.

## Requisitos
- Python 3.8+
- Librerías Python: `pandas`, `pyreadstat`

## Instrucciones

### 1. Actualizar Datos (Backend)
Si quieres volver a generar la base de datos a partir de los `.SAV`:
1. Asegúrate de tener los archivos `.SAV` de la EPHC en la carpeta padre (`../EPHCtrim`).
2. Ejecuta el conversor:
   ```bash
   python process_ephc.py
   ```
3. Esto leerá `.SAV` y generará/actualizará `datos_consolidados.json`.

### 2. Ver el Tablero Frontend
Por motivos de seguridad CORS de los navegadores web modernos, no puedes simplemente abrir el `index.html` directamente. Debes levantar un servidor web local:
- Usando Python:
  ```bash
  python -m http.server 8000
  ```
  Y visita `http://localhost:8000`
- Usando la extensión "Live Server" de VS Code.

### 3. Subir a GitHub
(Como no tenías Git instalado en línea de comandos, estos fueron los pasos):
1. Arrastra esta carpeta completa (`encuesta_de_hogares_trimestral`) usando la interfaz web de GitHub en tu repositorio, o instálalo y corre:
   ```bash
   git init
   git add .
   git commit -m "Initial commit del tablero interactivo"
   git branch -M main
   git remote add origin https://github.com/monitorimpactosocial/encuesta_de_hogares_trimestral.git
   git push -u origin main
   ```
