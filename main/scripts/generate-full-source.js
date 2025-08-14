// Simple script to dump source tree into JRVI_FULL_SOURCE.md
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'JRVI_FULL_SOURCE.md');

const includeDirs = ['src', 'server', 'logic', 'memory', 'tests'];

function walk(dir, list = []) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (['node_modules', 'dist', '.git', 'jrvi'].includes(entry)) continue;
      walk(p, list);
    } else {
      list.push(p);
    }
  }
  return list;
}

function main() {
  let md = '# JRVI Full Source (Generated)\n\n';
  for (const dir of includeDirs) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    const files = walk(abs).sort();
    for (const f of files) {
      const rel = path.relative(ROOT, f);
      md += `\n## ${rel}\n\n`;
      const ext = path.extname(f).toLowerCase();
      const lang = ext.replace('.', '') || 'text';
      const content = fs.readFileSync(f, 'utf8');
      md += '```' + lang + '\n' + content + '\n```\n';
    }
  }
  fs.writeFileSync(OUT, md, 'utf8');
  console.log('Wrote', OUT);
}

main();
