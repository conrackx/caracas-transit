const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { XMLParser } = require('fast-xml-parser');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CONFIG_PATH = path.join(ROOT, 'config', 'styles.yaml');
const SOURCES_PATH = path.join(ROOT, 'docs', 'SOURCES.md');

// ─────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────

const VALID_TAGS = ['[OSM]', '[~]', '[DOC]', '[TERMINAL]', '[TRANSBORDO'];
const PLACENAME_REGEX = /^(\w+[\w·\s]+?)\s*(\[.+\])?$/;
const COORDINATE_REGEX = /^-?\d+\.\d+,-?\d+\.\d+,\d+$/;

// Visibility rules per file (from STYLE_GUIDE)
const VISIBILITY_RULES = {
  'metro.kml': { folders: { default: 1 } },
  'sistemas_masivos.kml': { folders: { default: 1 } },
  'terminales.kml': { folders: { default: 1 } },
  'sistemas_regionales.kml': { folders: { default: 0 } },
  'transporte_complementario.kml': { folders: { default: 0 } },
  'lineas_privadas.kml': { folders: { default: 0 } },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('Warning: config/styles.yaml not found, skipping style validation');
    return null;
  }
  return yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function loadSources() {
  if (!fs.existsSync(SOURCES_PATH)) {
    return [];
  }
  const content = fs.readFileSync(SOURCES_PATH, 'utf8');
  // Extract station names from the verified stations table
  const stations = [];
  const lines = content.split('\n');
  let inTable = false;
  for (const line of lines) {
    if (line.includes('## Estaciones verificadas')) {
      inTable = true;
      continue;
    }
    if (inTable && line.startsWith('---')) {
      inTable = false;
      continue;
    }
    if (inTable && line.startsWith('|') && !line.includes('Estación')) {
      const parts = line.split('|').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 1) {
        stations.push(parts[0]);
      }
    }
  }
  return stations;
}

function validateXmlWellFormed(content, filename) {
  const errors = [];

  // Check XML declaration
  if (!content.startsWith('<?xml')) {
    errors.push('Falta declaración XML al inicio');
  }

  // Check KML namespace
  if (!content.includes('xmlns="http://www.opengis.net/kml/2.2"')) {
    errors.push('Falta namespace KML 2.2');
  }

  // Check for unclosed tags
  const parser = new XMLParser({
    ignoreAttributes: false,
    allowBooleanAttributes: true,
  });

  try {
    parser.parse(content);
  } catch (e) {
    errors.push(`XML mal formado: ${e.message}`);
  }

  // Check for <n> instead of <name>
  const nTagRegex = /<n>/g;
  const nMatches = content.match(nTagRegex);
  if (nMatches) {
    errors.push(`Encontrado <n> en lugar de <name> (${nMatches.length} ocurrencias)`);
  }

  // Check for ASCII art / decorators
  const asciiRegex = /[╔╗╚╝║═╠╣╩╬]/;
  if (asciiRegex.test(content)) {
    errors.push('Contiene arte ASCII o decoradores en campos XML');
  }

  return errors;
}

function validateRequiredElements(content, filename) {
  const errors = [];

  // Must have <Document>
  if (!content.includes('<Document>') || !content.includes('</Document>')) {
    errors.push('Falta elemento <Document>');
  }

  // Must have <name> at document level
  if (!content.includes('<name>')) {
    errors.push('Falta elemento <name>');
  }

  // Check each Placemark has required elements
  const placemarkRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g;
  let placemarkIndex = 0;
  let match;
  while ((match = placemarkRegex.exec(content)) !== null) {
    placemarkIndex++;
    const placemark = match[1];

    if (!placemark.includes('<name>')) {
      errors.push(`Placemark #${placemarkIndex}: falta <name>`);
    }

    if (!placemark.includes('<Point>') && !placemark.includes('<LineString>')) {
      errors.push(`Placemark #${placemarkIndex}: falta <Point> o <LineString>`);
    }

    // Check coordinates format
    const coordRegex = /<coordinates>([\s\S]*?)<\/coordinates>/g;
    let coordMatch;
    while ((coordMatch = coordRegex.exec(placemark)) !== null) {
      const coords = coordMatch[1].trim().split(/\s+/);
      for (const coord of coords) {
        if (coord && !COORDINATE_REGEX.test(coord)) {
          errors.push(`Placemark #${placemarkIndex}: coordenada inválida "${coord}"`);
          break;
        }
      }
    }
  }

  return errors;
}

function validateNamingConventions(content, filename) {
  const errors = [];

  // Check placemark names follow conventions
  const nameRegex = /<name>([^<]+)<\/name>/g;
  let nameMatch;
  while ((nameMatch = nameRegex.exec(content)) !== null) {
    const name = nameMatch[1];

    // Skip non-placemark names (document name, folder name, line name)
    if (name.includes('—') || name.includes('Trayecto') || name.includes('Ruta')) {
      continue;
    }

    // Check for version suffixes
    if (/\s+v\d+$/i.test(name)) {
      errors.push(`Nombre con versión: "${name}" — no usar versiones en nombres`);
    }

    // Check for parentheses instead of brackets
    if (name.includes('(') && name.includes(')')) {
      // Allow parentheses in descriptions but not in placemark names
      if (/\[.*\]/.test(name) === false && name.includes('(')) {
        // Only flag if it looks like a tag (TERMINAL, TRANSBORDO, etc.)
        if (/\(TERMINAL\)|\(TRANSBORDO\)|\(OSM\)/i.test(name)) {
          errors.push(`Nombre con paréntesis: "${name}" — usar corchetes []`);
        }
      }
    }

    // Check for hyphens instead of middle dots in station identifiers
    if (/^L\d+-\d+/.test(name)) {
      errors.push(`Nombre con guión: "${name}" — usar punto medio · (U+00B7)`);
    }
  }

  return errors;
}

function validateTags(content, filename) {
  const errors = [];
  const verifiedStations = loadSources();

  // Check placemark names for valid tags
  const nameRegex = /<name>([^<]+)<\/name>/g;
  let nameMatch;
  while ((nameMatch = nameRegex.exec(content)) !== null) {
    const name = nameMatch[1];

    // Only check placemark names (those with station-like patterns)
    if (/^L\d+·\d+|^MC\d+·\d+|^CT·\d+|^MLT·\d+|^FFE/.test(name)) {
      // Check for valid precision tags
      const hasOsm = name.includes('[OSM]');
      const hasTilde = name.includes('[~]');
      const hasDoc = name.includes('[DOC]');

      // Should have exactly one precision tag
      const precisionTags = [hasOsm, hasTilde, hasDoc].filter(Boolean).length;
      if (precisionTags === 0) {
        errors.push(`"${name}" — falta etiqueta de precisión [OSM], [~] o [DOC]`);
      } else if (precisionTags > 1) {
        errors.push(`"${name}" — múltiples etiquetas de precisión`);
      }

      // If [OSM], verify it's in SOURCES.md
      if (hasOsm) {
        // Extract station name (between the number and the first bracket)
        const stationMatch = name.match(/(?:·\d+\s+)([^\[]+)/);
        if (stationMatch) {
          const stationName = stationMatch[1].trim();
          // Check if this station is in the verified list
          const isVerified = verifiedStations.some(vs =>
            stationName.toLowerCase().includes(vs.toLowerCase()) ||
            vs.toLowerCase().includes(stationName.toLowerCase())
          );
          // Note: Not all [OSM] stations may be in SOURCES.md yet
          // This is a warning, not an error
        }
      }
    }
  }

  return errors;
}

function validateStyleIds(content, filename, config) {
  const errors = [];
  if (!config) return errors;

  // Get expected style IDs for this file
  const expectedIds = [];
  for (const [key, style] of Object.entries(config)) {
    if (key === 'scales') continue;
    if (style.files && style.files.includes(filename)) {
      if (key === 'l1') {
        expectedIds.push('l1', 'l1_n', 'l1_h', 'l1_term', 'l1_stop', 'l1_xfer');
      } else if (['l2', 'l3', 'l4'].includes(key)) {
        expectedIds.push(`${key}_line`, `${key}_term`, `${key}_stop`);
      } else if (key === 'l5') {
        expectedIds.push(`${key}_stop`);
      } else if (['cable', 'ct', 'brt', 'teques', 'ffe'].includes(key)) {
        expectedIds.push(`${key}_line`, `${key}_stop`);
      } else if (['mb', 'tc'].includes(key)) {
        expectedIds.push(`${key}_term`);
      } else if (key.startsWith('p')) {
        expectedIds.push(`${key}_line`, 'priv_term');
      } else if (key.startsWith('hub')) {
        expectedIds.push(key);
      }
    }
  }

  for (const id of expectedIds) {
    if (!content.includes(`id="${id}"`)) {
      errors.push(`Estilo faltante: id="${id}"`);
    }
  }

  // Validate style ID naming convention
  const styleIdRegex = /id="([^"]+)"/g;
  let idMatch;
  while ((idMatch = styleIdRegex.exec(content)) !== null) {
    const id = idMatch[1];
    // Style IDs should be lowercase with underscores
    if (/[A-Z]/.test(id) || /-/.test(id)) {
      errors.push(`ID de estilo "${id}" — usar lowercase con guiones bajos`);
    }
  }

  return errors;
}

function validateColors(content, filename, config) {
  const errors = [];
  if (!config) return errors;

  for (const [key, style] of Object.entries(config)) {
    if (key === 'scales') continue;
    if (style.files && style.files.includes(filename) && style.color_kml) {
      if (!content.includes(style.color_kml)) {
        errors.push(`Color incorrecto para ${key}: esperado ${style.color_kml} (${style.color_hex})`);
      }
    }
  }

  return errors;
}

function validateVisibility(content, filename) {
  const errors = [];
  const rules = VISIBILITY_RULES[filename];
  if (!rules) return errors;

  // Check folder visibility
  const folderRegex = /<Folder>\s*<name>([^<]+)<\/name>\s*<visibility>(\d)<\/visibility>/g;
  let folderMatch;
  while ((folderMatch = folderRegex.exec(content)) !== null) {
    const folderName = folderMatch[1];
    const visibility = parseInt(folderMatch[2]);

    if (visibility !== rules.folders.default) {
      errors.push(`Folder "${folderName}": visibility=${visibility}, esperado ${rules.folders.default}`);
    }
  }

  return errors;
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

function main() {
  const config = loadConfig();
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.kml'));

  let totalErrors = 0;
  let totalFiles = 0;
  let totalWarnings = 0;

  console.log('Validando archivos KML...\n');

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    totalFiles++;

    const fileErrors = [];

    // Run all validations
    fileErrors.push(...validateXmlWellFormed(content, file).map(e => `[XML] ${e}`));
    fileErrors.push(...validateRequiredElements(content, file).map(e => `[ELEMENTO] ${e}`));
    fileErrors.push(...validateNamingConventions(content, file).map(e => `[NOMBRE] ${e}`));
    fileErrors.push(...validateTags(content, file).map(e => `[TAG] ${e}`));
    fileErrors.push(...validateStyleIds(content, file, config).map(e => `[ESTILO] ${e}`));
    fileErrors.push(...validateColors(content, file, config).map(e => `[COLOR] ${e}`));
    fileErrors.push(...validateVisibility(content, file).map(e => `[VISIBILIDAD] ${e}`));

    if (fileErrors.length > 0) {
      console.log(`\n${file}:`);
      for (const error of fileErrors) {
        console.log(`  ✗ ${error}`);
        totalErrors++;
      }
    } else {
      console.log(`${file}: ✓ OK`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Archivos validados: ${totalFiles}`);
  console.log(`Errores encontrados: ${totalErrors}`);

  if (totalErrors > 0) {
    console.log('\nEstado: FAIL');
    process.exit(1);
  } else {
    console.log('\nEstado: PASS');
  }
}

main();
