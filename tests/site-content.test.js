const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const filePath = path.join(__dirname, '..', 'data', 'site-content.json');

test('el archivo de contenido del sitio existe y tiene estructura de página', () => {
  assert.equal(fs.existsSync(filePath), true, 'Debe existir data/site-content.json');

  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.ok(content.hero, 'Debe existir configuración del hero');
  assert.ok(Array.isArray(content.faq), 'Debe existir una lista de faq');
  assert.ok(Array.isArray(content.process.steps), 'Debe existir lista de pasos del proceso');
});
