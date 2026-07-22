/* Lightweight source lint kept dependency-free for this TypeScript/webpack project. */
const fs = require('fs');
const path = require('path');

const roots = ['src', 'test'];
const extensions = new Set(['.ts', '.js', '.css', '.html']);
const failures = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'dist') visit(file);
      continue;
    }
    if (!extensions.has(path.extname(entry.name))) continue;
    const source = fs.readFileSync(file, 'utf8');
    source.split('\n').forEach((line, index) => {
      if (/[ \t]+$/.test(line)) failures.push(`${file}:${index + 1}: trailing whitespace`);
    });
  }
}

roots.forEach(visit);

if (failures.length > 0) {
  console.error(`Lint failed:\n${failures.join('\n')}`);
  process.exit(1);
}

console.log('Source lint passed.');
