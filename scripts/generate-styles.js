const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'styles.yaml');
const DATA_DIR = path.join(ROOT, 'data');

function hexToKmlColor(hex) {
  // Convert #RRGGBB to KML AABBGGRR format
  const r = hex.slice(1, 3);
  const g = hex.slice(3, 5);
  const b = hex.slice(5, 7);
  return `FF${b}${g}${r}`;
}

function generateStyleXml(key, style, scales) {
  const styles = [];

  // Determine if this is a metro line (needs StyleMap + multiple variants)
  const isMetroLine = ['l1', 'l2', 'l3', 'l4', 'l5'].includes(key);
  const isLineWithWidth = style.width_line !== undefined;
  const isHubStyle = style.scale !== undefined;

  if (isHubStyle) {
    // Hub styles (terminales.kml)
    styles.push(
      `  <Style id="${key}">` +
      `<IconStyle>` +
      `<scale>${style.scale}</scale>` +
      `<Icon><href>${style.icon}</href></Icon>` +
      `</IconStyle>` +
      `<LabelStyle><scale>${style.label_scale}</scale></LabelStyle>` +
      `</Style>`
    );
  } else if (isMetroLine && key === 'l1') {
    // L1 has StyleMap (normal + highlight)
    styles.push(
      `  <StyleMap id="${key}">` +
      `<Pair><key>normal</key><styleUrl>#${key}_n</styleUrl></Pair>` +
      `<Pair><key>highlight</key><styleUrl>#${key}_h</styleUrl></Pair>` +
      `</StyleMap>`
    );
    styles.push(
      `  <Style id="${key}_n">` +
      `<LineStyle><color>${style.color_kml}</color><width>${style.width_line}</width></LineStyle>` +
      `</Style>`
    );
    styles.push(
      `  <Style id="${key}_h">` +
      `<LineStyle><color>${style.color_kml}</color><width>${style.width_line + 2}</width></LineStyle>` +
      `</Style>`
    );
    // Terminal style
    styles.push(
      `  <Style id="${key}_term">` +
      `<IconStyle><color>${style.color_kml}</color><scale>${scales.terminal}</scale>` +
      `<Icon><href>${style.icon}</href></Icon></IconStyle>` +
      `<LabelStyle><scale>${scales.label_terminal}</scale></LabelStyle>` +
      `</Style>`
    );
    // Stop style
    styles.push(
      `  <Style id="${key}_stop">` +
      `<IconStyle><color>${style.color_kml}</color><scale>${scales.stop}</scale>` +
      `<Icon><href>${style.icon}</href></Icon></IconStyle>` +
      `<LabelStyle><scale>${scales.label_stop}</scale></LabelStyle>` +
      `</Style>`
    );
    // Transfer style
    styles.push(
      `  <Style id="${key}_xfer">` +
      `<IconStyle><color>FFFFFFFF</color><scale>${scales.xfer}</scale>` +
      `<Icon><href>${style.icon}</href></Icon></IconStyle>` +
      `<LabelStyle><scale>${scales.label_xfer}</scale></LabelStyle>` +
      `</Style>`
    );
  } else if (isMetroLine && style.type === 'single_station') {
    // L5 single station: only stop style
    styles.push(
      `  <Style id="${key}_stop">` +
      `<IconStyle><color>${style.color_kml}</color><scale>0.8</scale>` +
      `<Icon><href>${style.icon}</href></Icon></IconStyle>` +
      `<LabelStyle><scale>0.7</scale></LabelStyle>` +
      `</Style>`
    );
  } else if (isMetroLine) {
    // Other metro lines (L2-L5): line + terminal + stop
    styles.push(
      `  <Style id="${key}_line">` +
      `<LineStyle><color>${style.color_kml}</color><width>${style.width_line}</width></LineStyle>` +
      `</Style>`
    );
    styles.push(
      `  <Style id="${key}_term">` +
      `<IconStyle><color>${style.color_kml}</color><scale>${scales.terminal}</scale>` +
      `<Icon><href>${style.icon}</href></Icon></IconStyle>` +
      `<LabelStyle><scale>${scales.label_terminal}</scale></LabelStyle>` +
      `</Style>`
    );
    styles.push(
      `  <Style id="${key}_stop">` +
      `<IconStyle><color>${style.color_kml}</color><scale>${scales.stop}</scale>` +
      `<Icon><href>${style.icon}</href></Icon></IconStyle>` +
      `<LabelStyle><scale>${scales.label_stop}</scale></LabelStyle>` +
      `</Style>`
    );
  } else if (isLineWithWidth) {
    // Cable, CT, BRT, teques, ffe: line + stop
    styles.push(
      `  <Style id="${key}_line">` +
      `<LineStyle><color>${style.color_kml}</color><width>${style.width_line}</width></LineStyle>` +
      `</Style>`
    );
    styles.push(
      `  <Style id="${key}_stop">` +
      `<IconStyle><color>${style.color_kml}</color><scale>0.7</scale>` +
      `<Icon><href>${style.icon}</href></Icon></IconStyle>` +
      `<LabelStyle><scale>0.6</scale></LabelStyle>` +
      `</Style>`
    );
  } else {
    // Metrobús, TransChacao, private lines: terminal only
    const scale = key.startsWith('p') ? 0.85 : (key === 'mb' ? 0.8 : 0.75);
    const labelScale = key.startsWith('p') ? 0.65 : (key === 'mb' ? 0.65 : 0.6);
    styles.push(
      `  <Style id="${key}_term">` +
      `<IconStyle><color>${style.color_kml}</color><scale>${scale}</scale>` +
      `<Icon><href>${style.icon}</href></Icon></IconStyle>` +
      `<LabelStyle><scale>${labelScale}</scale></LabelStyle>` +
      `</Style>`
    );
  }

  return styles.join('\n');
}

function getStylesForFile(stylesConfig, filename, scales) {
  const styleBlocks = [];
  for (const [key, style] of Object.entries(stylesConfig)) {
    if (key === 'scales') continue;
    if (style.files && style.files.includes(filename)) {
      styleBlocks.push(generateStyleXml(key, style, scales));
    }
  }
  return styleBlocks.join('\n\n');
}

function main() {
  const updateMode = process.argv.includes('--update');

  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('Error: config/styles.yaml not found');
    process.exit(1);
  }

  const config = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const scales = config.scales;
  delete config.scales;

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.kml'));
  let hasErrors = false;

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract existing styles section (between XML declaration and first Folder or comment separator)
    const expectedStyles = getStylesForFile(config, file, scales);

    if (updateMode) {
      // Replace styles section in the file
      // Find the styles section: from after <description> to before first Folder or trayecto comment
      const styleStartRegex = /(<\/description>\s*\n)([\s\S]*?)(\n\s*<!--|<Folder>)/;
      const match = content.match(styleStartRegex);

      if (match) {
        const newContent = content.replace(
          styleStartRegex,
          `$1\n${expectedStyles}$3`
        );
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`[UPDATE] ${file} - estilos actualizados`);
      } else {
        console.warn(`[SKIP] ${file} - no se encontró sección de estilos para actualizar`);
      }
    } else {
      // Validate: check that key style IDs exist in the file
      const fileStyles = [];
      for (const [key, style] of Object.entries(config)) {
        if (key === 'scales') continue;
        if (style.files && style.files.includes(file)) {
          // Check for expected style IDs
          if (key === 'l1') {
            fileStyles.push('l1', 'l1_n', 'l1_h', 'l1_term', 'l1_stop', 'l1_xfer');
          } else if (['l2', 'l3', 'l4'].includes(key)) {
            fileStyles.push(`${key}_line`, `${key}_term`, `${key}_stop`);
          } else if (key === 'l5') {
            fileStyles.push(`${key}_stop`);
          } else if (['cable', 'ct', 'brt', 'teques', 'ffe'].includes(key)) {
            fileStyles.push(`${key}_line`, `${key}_stop`);
          } else if (['mb', 'tc'].includes(key)) {
            fileStyles.push(`${key}_term`);
          } else if (key.startsWith('p')) {
            fileStyles.push(`${key}_line`, 'priv_term');
          } else if (key.startsWith('hub')) {
            fileStyles.push(key);
          }
        }
      }

      const missing = fileStyles.filter(id => !content.includes(`id="${id}"`));
      if (missing.length > 0) {
        console.error(`[FAIL] ${file} - estilos faltantes: ${missing.join(', ')}`);
        hasErrors = true;
      } else {
        console.log(`[OK] ${file} - todos los estilos presentes (${fileStyles.length})`);
      }

      // Validate colors
      for (const [key, style] of Object.entries(config)) {
        if (key === 'scales') continue;
        if (style.files && style.files.includes(file) && style.color_kml) {
          if (!content.includes(style.color_kml)) {
            console.error(`[FAIL] ${file} - color incorrecto para ${key}: esperado ${style.color_kml}`);
            hasErrors = true;
          }
        }
      }
    }
  }

  if (!updateMode && hasErrors) {
    console.log('\nEjecuta `npm run generate-styles -- --update` para corregir los estilos');
    process.exit(1);
  }

  if (!updateMode) {
    console.log('\nTodos los estilos son válidos');
  }
}

main();
