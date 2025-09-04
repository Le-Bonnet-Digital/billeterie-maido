// tools/po-notes.cjs
/* eslint-disable no-console */
const fs = require('fs');
const { execSync } = require('child_process');

function nowISO() {
  return new Date().toISOString();
}

function getBranch() {
  try { return execSync('git rev-parse --abbrev-ref HEAD').toString().trim(); }
  catch { return ''; }
}

function detectUSFromBranch(branch) {
  const m = branch.match(/US-\d+/i);
  return m ? m[0].toUpperCase() : null;
}

function readFile(path) {
  try { return fs.readFileSync(path, 'utf8'); } catch { return null; }
}

function writeFile(path, content) {
  fs.writeFileSync(path, content, 'utf8');
}

function ensureInteractionsSection(md) {
  if (!/##\s*INTERACTIONS/i.test(md)) {
    md = md.trimEnd() + `

## INTERACTIONS

\`\`\`yaml
\`\`\`
`;
  }
  return md;
}

function appendYamlEntry(md, yamlBlock) {
  // insert before closing ```yaml of last interactions code block, or append new block
  const re = /##\s*INTERACTIONS[\s\S]*?```yaml([\s\S]*?)```/i;
  const hasBlock = re.test(md);
  if (hasBlock) {
    return md.replace(re, (full, inner) => {
      const updated = inner.trimEnd() + '\n' + yamlBlock.trimEnd() + '\n';
      return full.replace(inner, '\n' + updated);
    });
  }
  // no block: create one
  return md.replace(/##\s*INTERACTIONS/i, (m) => {
    return `${m}\n\n\`\`\`yaml\n${yamlBlock.trimEnd()}\n\`\`\`\n`;
  });
}

function entryExistsForUS(md, usId) {
  const re = new RegExp(`^-\\s*who:\\s*Codex[\\s\\S]*?topic:\\s*${usId}\\b`, 'im');
  return re.test(md);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--add' || a === '--ensure') opts.mode = a.slice(2);
    else if (a === '--us') opts.us = args[++i];
    else if (a === '--title') opts.title = args[++i];
    else if (a === '--env') opts.env = args[++i];
    else if (a === '--context') opts.context = args[++i];
    else if (a === '--ask') opts.ask = args[++i];
    else if (a === '--auto') opts.auto = true;
  }
  return opts;
}

function main() {
  const opts = parseArgs();
  if (!opts.mode) {
    console.error('Usage: node tools/po-notes.cjs --add|--ensure [--us US-XX] [--title "…"] [--env URL] [--context "branch or PR"] [--ask "steps"] [--auto]');
    process.exit(2);
  }

  const branch = getBranch();
  const us = (opts.us || detectUSFromBranch(branch) || '').toUpperCase();
  if (!us) {
    console.error('Impossible de détecter US-XX. Passe --us US-XX ou nomme la branche ex: feat/US-12-xxx');
    process.exit(1);
  }

  const poPath = 'PO_NOTES.md';
  let md = readFile(poPath);
  if (!md) {
    console.error('PO_NOTES.md introuvable à la racine du repo.');
    process.exit(1);
  }
  md = ensureInteractionsSection(md);

  if (opts.mode === 'ensure') {
    if (!entryExistsForUS(md, us)) {
      console.error(`Aucune entrée INTERACTIONS pour ${us} dans PO_NOTES.md. Ajoute-la avec --add.`);
      process.exit(1);
    }
    console.log(`OK: entrée INTERACTIONS trouvée pour ${us}.`);
    return;
  }

  // mode add
  const title = opts.title || 'Tâche';
  const env = opts.env || '<stage/prod URL>';
  const context = opts.context || `branch: ${branch}`;
  let ask = opts.ask;
  if (!ask) {
    // gabarit “ask” générique, court et actionnable
    ask = [
      '1) Lancer le parcours utilisateur concerné et vérifier le résultat attendu.',
      "2) Contrôler l'email/log attendu (si applicable).",
      '3) Vérifier les métriques/logs correspondants (Stripe/DB/Sentry).'
    ].join('\n');
  }

  const yaml = [
    '- who: Codex',
    `  when: ${nowISO()}`,
    `  topic: ${us} — ${title}`,
    '  ask: |',
    `    ${ask.split('\n').join('\n    ')}`,
    `  context: ${context}, env: ${env}`,
    '  status: pending',
    ''
  ].join('\n');

  if (entryExistsForUS(md, us) && !opts.auto) {
    console.error(`Une entrée pour ${us} existe déjà. Utilise --auto pour forcer l’append ou supprime l’ancienne si obsolète.`);
    process.exit(1);
  }

  const updated = appendYamlEntry(md, yaml);
  writeFile(poPath, updated);
  console.log(`Entrée INTERACTIONS ajoutée pour ${us} dans PO_NOTES.md.`);
}

main();
