#!/usr/bin/env node

import fs from 'node:fs';

const content = fs.readFileSync('BACKLOG.md', 'utf8');
const lines = content.split(/\r?\n/);

let errors = [];
let story = {};
function resetStory() {
  story = { acCount: 0, inAC: false };
}
function validateStory(st) {
  if (st.status !== 'Ready') return;
  const missing = [];
  if (!st.persona) missing.push('persona');
  if (!st.title) missing.push('title');
  if (!st.value) missing.push('value');
  if (!st.priority) missing.push('priority');
  if (st.sp && st.sp.trim() !== '') missing.push('sp should be empty');
  if (!st.acCount || st.acCount < 2)
    missing.push('at least two acceptance criteria');
  if (!st.securityNote) missing.push('security/RLS note');
  if (st.origin === 'auto' && !st.linksApi)
    missing.push('links.api for auto origin');
  if (missing.length) {
    errors.push(`US ${st.id || '(unknown)'}: missing ${missing.join(', ')}`);
  }
}
resetStory();
lines.forEach((rawLine) => {
  const line = rawLine.trim();
  if (line.startsWith('id:')) {
    if (story.id) validateStory(story);
    resetStory();
    story.id = line.substring(3).trim();
  } else if (line.startsWith('persona:')) {
    story.persona = line.substring(8).trim();
  } else if (line.startsWith('title:')) {
    story.title = line.substring(6).trim();
  } else if (line.startsWith('value:')) {
    story.value = line.substring(6).trim();
  } else if (line.startsWith('priority:')) {
    story.priority = line.substring(9).trim();
  } else if (line.startsWith('sp:')) {
    story.sp = line.substring(3).trim();
  } else if (line.startsWith('status:')) {
    story.status = line.substring(7).trim();
  } else if (/^ac:|^AC:/.test(line)) {
    story.inAC = true;
  } else if (story.inAC && /^[-\*]/.test(line)) {
    story.acCount++;
  } else if (line === '') {
    story.inAC = false;
  } else if (line.startsWith('origin:')) {
    story.origin = line.substring(7).trim();
  } else if (line.startsWith('links.api')) {
    const parts = line.split(':');
    story.linksApi = parts.slice(1).join(':').trim();
  } else if (/rls|sécurité/i.test(line)) {
    story.securityNote = true;
  }
});
// validate last story
if (story.id) validateStory(story);

if (errors.length) {
  console.error('Backlog validation failed:');
  errors.forEach((e) => console.error(' - ' + e));
  process.exit(1);
} else {
  console.log('Backlog validation passed.');
}
