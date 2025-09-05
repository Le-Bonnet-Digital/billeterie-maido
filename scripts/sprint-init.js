#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const templatesDir = path.join(root, 'docs', 'templates');
const sprintsDir = path.join(root, 'docs', 'sprints');

async function main() {
  const arg = process.argv[2];
  let n;
  if (arg) {
    n = parseInt(arg.replace(/^S/i, ''), 10);
    if (Number.isNaN(n)) {
      console.error('Usage: npm run sprint:init -- <N>');
      process.exit(1);
    }
  } else {
    const entries = await fs
      .readdir(sprintsDir, { withFileTypes: true })
      .catch(() => []);
    const nums = entries
      .filter((e) => e.isDirectory() && /^S\d+$/.test(e.name))
      .map((e) => parseInt(e.name.slice(1), 10));
    n = nums.length ? Math.max(...nums) + 1 : 1;
  }

  const sprintName = `S${n}`;
  const targetDir = path.join(sprintsDir, sprintName);
  try {
    await fs.mkdir(targetDir, { recursive: false });
  } catch (e) {
    console.error(`❌ ${sprintName} existe déjà.`);
    process.exit(1);
  }

  const templates = await fs.readdir(templatesDir);
  for (const file of templates) {
    await fs.copyFile(
      path.join(templatesDir, file),
      path.join(targetDir, file),
    );
  }

  console.log(
    `✅ ${sprintName} initialisé dans ${path.relative(root, targetDir)}.`,
  );
  console.log('⏱️ Lancez un timer de 25 min et suivez AGENTS.md');
}

main();
