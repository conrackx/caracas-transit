# Guía de Estilos — Caracas Transit

Estándar visual y de nomenclatura para todos los archivos KML del proyecto.
Todo colaborador debe seguir esta guía al añadir o modificar elementos.

---

## 1. Colores oficiales por sistema

Los colores del Metro siguen la paleta oficial de C.A. Metro de Caracas
(fuente: Wikidata Q1363954 / manuales de imagen institucional).

El formato KML es `AABBGGRR` (alpha-blue-green-red, en ese orden).

| Sistema | Color hex (web) | Valor KML | Ancho de línea |
|---------|----------------|-----------|---------------|
| Metro L1 | `#FF7400` (naranja) | `FF0074FF` | 5 |
| Metro L2 | `#F5A800` (amarillo) | `FF00A8F5` | 5 |
| Metro L3 | `#0060AF` (azul) | `FFAF6000` | 5 |
| Metro L4 | `#007F3F` (verde) | `FF3F7F00` | 5 |
| Metro L5 | `#8B008B` (morado) | `FF8B008B` | 4 |
| Metro Los Teques | `#446688` (gris-azul) | `FF886644` | 4 |
| Ferrocarril (IFE) | `#AA4422` (marrón) | `FF2244AA` | 4 |
| Metrocable | `#790D9B` (violeta) | `FF9B0D79` | 4 |
| Cabletrén | `#32CD32` (verde lima) | `FF32CD32` | 4 |
| BusCaracas / L7 | `#CC2222` (rojo) | `FF2222CC` | 4 |
| Metrobús | `#CC6600` (naranja suave) | `FF0066CC` | 3 |
| TransChacao | `#008080` (turquesa) | `FF808000` | 3 |
| Líneas privadas (P01) | `#FF7400` | `FF0074FF` | 3 |
| Líneas privadas (P02) | `#FF2200` | `FF0022FF` | 3 |
| Líneas privadas (P04) | `#00AAFF` | `FFFFAA00` | 3 |
| Líneas privadas (P06) | `#9900CC` | `FFCC0099` | 3 |
| Líneas privadas (P08) | `#0066FF` | `FFFF6600` | 3 |

---

## 2. Iconos estándar por tipo de elemento

Todos los iconos usan el CDN de Google Maps para garantizar disponibilidad.

| Tipo | Icono | Uso |
|------|-------|-----|
| Estación de metro | `http://maps.google.com/mapfiles/kml/shapes/rail.png` | Toda estación subterránea |
| Teleférico / cable | `http://maps.google.com/mapfiles/kml/shapes/airports.png` | Metrocable, Cabletrén |
| Bus / buseta | `http://maps.google.com/mapfiles/kml/shapes/bus.png` | Metrobús, BRT, privadas |
| Terminal mayor | `http://maps.google.com/mapfiles/kml/paddle/red-stars.png` | Terminales interurbanos |
| Nodo intermodal | `http://maps.google.com/mapfiles/kml/paddle/ylw-stars.png` | Nodos informales clave |

---

## 3. Escalas de iconos por jerarquía

| Jerarquía | Scale | Descripción |
|-----------|-------|-------------|
| Terminal | 1.0 | Inicio/fin de línea |
| Transbordo | 0.85 | Estaciones con conexión a otra línea |
| Estación regular | 0.6 | Estaciones intermedias |
| Parada menor | 0.55 | Paradas de bus sin infraestructura fija |

---

## 4. Nomenclatura de placemarks

### Formato general
```
[SISTEMA·NÚMERO] Nombre [ETIQUETAS]
```

### Etiquetas de transbordo
- `[TERMINAL]` — inicio o fin de línea
- `[TRANSBORDO X]` — conexión con sistema X (ej: `[TRANSBORDO L2]`)
- `[OSM]` — coordenada verificada contra OpenStreetMap
- `[~]` — coordenada estimada (ver SOURCES.md)
- `[DOC]` — coordenada documental

### Ejemplos correctos
```
L1·12 Plaza Venezuela [TRANSBORDO L3 L4][OSM]
L3·09 La Rinconada [TERMINAL][TRANSBORDO Ferrocarril][OSM]
P01 | Origen: Av. San Martín / Catia
MB-A | Colinas de Bello Monte [Origen]
```

### Ejemplos incorrectos
```
Metro Plaza Venezuela v4 ← sin versiones
[L1-12] Plaza Venezuela ← guiones no guiones medios
Estación La Rinconada (Terminal) ← paréntesis, no corchetes
```

---

## 5. IDs de estilos

Los IDs de estilos siguen el patrón `{sistema}_{variante}`:

```
l1_n       ← L1 normal
l1_h       ← L1 highlight
l1_term    ← L1 ícono terminal
l1_stop    ← L1 ícono estación regular
l1_xfer    ← L1 ícono transbordo
l2_line    ← L2 línea (sin StyleMap porque no hay hover en KML simple)
```

---

## 6. Visibilidad por defecto de capas

| Capa | `<visibility>` | Justificación |
|------|---------------|---------------|
| Metro L1–L4 | `1` | Sistema primario, siempre relevante |
| Metrocable | `1` | Parte del sistema formal Metro |
| Cabletrén | `1` | Parte del sistema formal Metro |
| BusCaracas L7 | `1` | Sistema BRT integrado al Metro |
| Terminales | `1` | Referencia esencial para usuarios |
| Metrobús | `0` | Información secundaria, rutas frecuentemente cambiantes |
| TransChacao | `0` | Cobertura geográfica limitada |
| Líneas Privadas | `0` | Alta variabilidad operativa |
| Metro Los Teques | `0` | Sistema separado, fuera del área urbana de Caracas |
| Ferrocarril | `0` | Sistema regional, no urbano |

---

## 7. Restricciones XML

- Usar siempre `<name>`, **nunca** `<n>`. El estándar KML 2.2 (OGC) define `<name>`.
- No usar `<atom:link>` auto-referencial. El NetworkLink externo cumple esa función.
- No incrustar arte ASCII (`╔══╗`) ni decoradores visuales en campos XML.
- El campo `<description>` debe contener información funcional (horarios, fechas, fuentes), no metadatos del proyecto.

---

## 8. Convención de archivos de datos

Cada archivo en `data/` debe:
1. Declarar su propio `<Document>` con `<name>` descriptivo y sin versión
2. Definir solo los estilos que usa (no duplicar estilos de otros archivos)
3. Contener un único sistema o dominio temático
4. Tener `<visibility>` en cada `<Folder>` de acuerdo a la tabla de la sección 6

---

*Esta guía es el único lugar donde se documentan las convenciones visuales del proyecto.*
