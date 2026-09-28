import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('src/assets/css');
const IDEIA = 'C:/Users/warle/OneDrive/Desktop/ideia_css.css';

const lines = fs.readFileSync(IDEIA, 'utf8').split(/\r?\n/);

function slice(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

function write(rel, content, header) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = header ? `/* ${header} */\n\n${content.trim()}\n` : `${content.trim()}\n`;
  fs.writeFileSync(file, body);
  console.log('wrote', rel);
}

// Sections by line number (1-based, from ideia_css.css)
const sections = {
  'sidebar/cabecalho.css': slice(275, 328),
  'formularios/container.css': slice(329, 374),
  'formularios/field.css': slice(375, 412),
  'formularios/labels.css': slice(413, 455),
  'formularios/input.css': [slice(456, 519), slice(754, 779)].join('\n\n'),
  'formularios/dropdown.css': slice(520, 648),
  'formularios/calendar.css': slice(649, 689),
  'formularios/textarea.css': slice(690, 699),
  'formularios/input-group.css': slice(700, 753),
  'formularios/checkbox.css': slice(780, 848),
  'formularios/switch.css': slice(849, 886),
  'formularios/radio.css': slice(887, 925),
  'formularios/buttons.css': slice(926, 1028),
  'formularios/tabView.css': slice(1029, 1070),
  'formularios/fieldSet.css': slice(1071, 1134),
  'formularios/picklist.css': slice(1135, 1224),
  'formularios/message.css': slice(1225, 1254),
  'formularios/divider.css': slice(1255, 1292),
  'formularios/tag.css': slice(1293, 1332),
  'formularios/footer.css': slice(1333, 1391),
  'formularios/config.css': slice(1392, 1523),
  'formularios/lista-scroll.css': slice(1524, 1594),
  'formularios/validacao-digital.css': slice(1595, 1733),
  'formularios/responsive.css': slice(1755, 1791),
  'raiz/base.css': [slice(69, 92), slice(1734, 1754)].join('\n\n'),
};

for (const [rel, content] of Object.entries(sections)) {
  write(rel, content, rel);
}

// Sidebar larguras — já em sidebar/larguras.css (não requer fonte legada)
// Listas — já em listas/*.css (não requer components/tables/)

console.log('done — seções ideia_css gravadas; larguras/listas não sobrescritas');
