# Caracas Transit — Cartografía del Transporte Urbano

Cartografía digital del sistema de transporte público de Caracas en formato KML.
Cubre el Metro de Caracas, Metrocable, Cabletrén, BusCaracas, Metrobús, TransChacao,
Metro de Los Teques, Ferrocarril Valles del Tuy y 16 líneas privadas documentadas.

---

## Usar en Google Earth (recomendado)

Descarga [`networklink.kml`](networklink.kml) y ábrelo en Google Earth Pro.

Eso es todo. Google Earth descargará el mapa completo y lo mantendrá actualizado
automáticamente cada 24 horas sin que tengas que hacer nada más.

> **Google Maps (My Maps)** no soporta actualización automática.
> Para usarlo allí, importa manualmente `caracas_transporte.kml` cada vez que quieras la versión más reciente.

---

## Estructura del repositorio

```
caracas-transit/
├── README.md                          Este archivo
├── caracas_transporte.kml             Índice maestro (solo NetworkLinks)
├── networklink.kml                    Entrada para el usuario final
├── data/
│   ├── metro.kml                      Metro de Caracas L1–L5
│   ├── sistemas_masivos.kml           Metrocable, Cabletrén, BusCaracas L7
│   ├── sistemas_regionales.kml        Metro Los Teques, Ferrocarril Valles del Tuy
│   ├── transporte_complementario.kml  Metrobús (10 rutas), TransChacao
│   ├── lineas_privadas.kml            16 líneas privadas y busetas
│   └── terminales.kml                 Terminales y nodos intermodales
└── docs/
    ├── SOURCES.md                     Fuentes y coordenadas verificadas
    └── STYLE_GUIDE.md                 Estándares de colores, iconos y nomenclatura
```

---

## Precisión de coordenadas

| Etiqueta | Origen | Precisión |
|----------|--------|-----------|
| `[OSM]` | Wikidata verificado contra OpenStreetMap | < 10 m |
| `[~]` | Interpolación geográfica o conocimiento de la arteria | ± 300 m |
| `[DOC]` | Fuente documental sin coordenada GPS disponible | ± 500 m |

Las 15 estaciones con coordenadas `[OSM]` están documentadas en [`docs/SOURCES.md`](docs/SOURCES.md).

---

## Capas del mapa

| Capa | Visible por defecto | Contenido |
|------|---------------------|-----------|
| Metro de Caracas | Sí | L1–L5, 51 estaciones |
| Sistemas Masivos | Sí | Metrocable MC1/MC2, Cabletrén, BusCaracas L7 |
| Terminales | Sí | 3 terminales interurbanos, 1 urbano, 3 nodos |
| Sistemas Regionales | No | Metro Los Teques, Ferrocarril Valles del Tuy |
| Transporte Complementario | No | Metrobús (10 rutas), TransChacao |
| Líneas Privadas | No | 16 busetas documentadas |

---

## Contribuir

1. Abre un **Issue** describiendo el problema y la fuente que lo respalda
2. O envía un **Pull Request** editando el archivo en `data/` correspondiente

Antes de contribuir, lee [`docs/STYLE_GUIDE.md`](docs/STYLE_GUIDE.md).

---

*Proyecto abierto para mejorar la accesibilidad a información de movilidad en Caracas.*
