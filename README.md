# Transporte Urbano Caracas — v4 (2025)

Este repositorio contiene la cartografía digital avanzada del sistema de transporte de la Gran Caracas en formato KML. La **v4.0 (Abril 2025)** representa la actualización más ambiciosa hasta la fecha, integrando datos verificados de OpenStreetMap (OSM) y Wikidata para ofrecer una precisión técnica superior.

## 🚀 Lo nuevo en la Versión 4.0

Esta versión ha sido reconstruida desde cero para priorizar la precisión geográfica y la riqueza de metadatos.

| Mejora | Detalle Técnico |
| :--- | :--- |
| **Precisión GPS** | ✅ 19 puntos críticos `[OSM]` verificados y 55 puntos `[~]` estimados. |
| **Identidad Visual** | ✅ Colores oficiales del Metro (ej. L1 `#FF7400`) vinculados a Wikidata Q1363954. |
| **Sistemas Masivos** | ✅ Inclusión de Metro Los Teques (4 estaciones) y Ferrocarril Valles del Tuy. |
| **Metadatos Detallados** | ✅ Horarios, fechas de inauguración y estado operativo en cada etiqueta. |
| **Documentación Local** | ✅ Sentidos de circulación para las principales líneas de busetas privadas. |
| **Organización** | ✅ 153 elementos distribuidos en 22 capas temáticas. |

## 🛠️ Guía de Implementación: NetworkLink (Actualización Automática)

La función más potente de este repositorio es el **NetworkLink**. Esto permite que tu Google Earth se sincronice automáticamente con este repositorio: cada vez que yo actualice el mapa en GitHub, tu visualización se actualizará sola sin que tengas que descargar nada nuevo.

## 🚀 Cómo utilizar (Recomendado)

Para que el mapa se mantenga actualizado automáticamente en tu computadora sin tener que descargar archivos nuevos en el futuro, utiliza el método **NetworkLink**:

1. **Descarga el archivo de enlace:**
   Haz clic en [networklink_caracas.kml](https://github.com/conrackx/caracas-transit/blob/master/networklink_caracas.kml) y descárgalo en tu equipo (botón *Download raw file*).

2. **Ábrelo en Google Earth:**
   Ejecuta el archivo descargado. Google Earth creará una conexión directa con este repositorio.

3. **¡Listo!:**
   Cada vez que abras Google Earth, el sistema consultará este repositorio y descargará automáticamente cualquier mejora o nueva ruta que yo haya añadido, sin que tengas que hacer nada.

---

### ⚠️ Notas de compatibilidad
* **Google Earth Pro (Escritorio):** Soporta todas las funciones de actualización automática.
* **Google Maps (My Maps):** No es compatible con NetworkLink. Si usas Google Maps, deberás importar manualmente el archivo `caracas_transporte.kml` cada vez que desees ver una actualización.

## 📌 Especificaciones de Coordenadas

Para garantizar la transparencia en la precisión de los datos, cada punto cuenta con una etiqueta de origen:
* `[OSM]`: Verificado contra OpenStreetMap (error <10m).
* `[~]`: Estimado por interpolación o conocimiento local (error ±300m).
* `[DOC]`: Basado en fuentes documentales oficiales donde no hay coordenadas GPS públicas.

## 📖 Fuentes y Referencias
- **Sistemas Metro:** Datos operativos actualizados a Abril 2025 vía Wikipedia y reportes de movilidad.
- **Geometría:** Nodos intermodales y terminales informales validados mediante análisis de campo y OSM.
- **Identidad:** Paleta de colores oficial según manuales de diseño de sistemas de transporte masivo.

---
*Este proyecto es una iniciativa abierta para mejorar la accesibilidad a la información de movilidad en Caracas. Si encuentras un error o quieres añadir una ruta, siéntete libre de abrir un "Issue" o enviar un "Pull Request".*
