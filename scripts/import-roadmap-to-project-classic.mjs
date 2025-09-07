#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROADMAP_PATH = path.resolve('.agent-os/product/roadmap.md');
const OWNER = process.env.GH_OWNER || (execSync('git config --get remote.origin.url').toString().trim().match(/github.com[/:]([^/]+)\//)?.[1] || '').trim();
const REPO = process.env.GH_REPO || (execSync('git remote get-url origin').toString().trim().match(/github.com[/:][^/]+\/([^/.]+)(?:\.git)?$/)?.[1] || '').trim();

if (!OWNER || !REPO) {
  console.error('Unable to determine OWNER/REPO. Set GH_OWNER and GH_REPO.');
  process.exit(1);
}

function sh(cmd, opts={}) {
  return execSync(cmd, { stdio: ['ignore','pipe','pipe'], ...opts }).toString();
}

function ghApi(method, endpoint, data, extraHeaders={}) {
  const hdrs = Object.entries({ 'Accept': 'application/vnd.github.inertia+json', ...extraHeaders })
    .map(([k,v]) => `-H '${k}: ${v}'`).join(' ');
  const body = data ? Object.entries(data).map(([k,v]) => `-f ${JSON.stringify(`${k}=${String(v)}`)}`).join(' ') : '';
  const cmd = `gh api --method ${method} ${hdrs} ${body} '${endpoint}'`;
  return JSON.parse(sh(cmd));
}

const md = fs.readFileSync(ROADMAP_PATH, 'utf8').split(/\r?\n/);

const items = [];
let phase = null;
let section = null;
for (let i=0; i<md.length; i++) {
  const line = md[i];
  const phaseMatch = line.match(/^##\s+Phase\s+([0-9]+(?:\.[0-9]+)?)\s*:\s*(.+)$/);
  if (phaseMatch) {
    phase = { key: phaseMatch[1], title: `Phase ${phaseMatch[1]}: ${phaseMatch[2]}` };
    section = null;
    continue;
  }
  const sectionMatch = line.match(/^###\s+(.+?)\s*$/);
  if (sectionMatch) {
    section = sectionMatch[1];
    continue;
  }
  const itemMatch = line.match(/^\- \[(x| )\] (.+)$/i);
  if (itemMatch && phase) {
    const checked = itemMatch[1].toLowerCase() === 'x';
    let title = itemMatch[2].trim();
    let size = null;
    const sizeMatch = title.match(/`([SML])`/);
    if (sizeMatch) {
      size = sizeMatch[1];
      title = title.replace(/`[SML]`/, '').trim();
    }
    // acceptance bullets
    const acceptance = [];
    let j = i + 1;
    while (j < md.length) {
      const ln = md[j];
      if (/^\s*\- \[/.test(ln) || /^##\s/.test(ln) || /^###\s/.test(ln)) break;
      if (/^\s*$/.test(ln)) { j++; continue; }
      const acc = ln.match(/^\s*\-\s+(.*)$/);
      if (acc) acceptance.push(acc[1]); else break;
      j++;
    }
    items.push({ phaseKey: phase.key, phaseTitle: phase.title, section, title, size, done: checked, acceptance });
  }
}

// Ensure classic project exists
const projects = ghApi('GET', `/repos/${OWNER}/${REPO}/projects`, null);
let project = projects.find(p => p.name === 'Roadmap');
if (!project) {
  project = ghApi('POST', `/repos/${OWNER}/${REPO}/projects`, { name: 'Roadmap', body: 'Auto-generated from .agent-os/product/roadmap.md' });
  console.error(`Created project Roadmap (id=${project.id})`);
} else {
  console.error(`Using existing project Roadmap (id=${project.id})`);
}

// Ensure columns per phase
const existingCols = ghApi('GET', `/projects/${project.id}/columns`, null);
const phaseKeys = Array.from(new Set(items.map(i => i.phaseKey))).sort((a,b)=>parseFloat(a)-parseFloat(b));
const desiredCols = phaseKeys.map(k => items.find(i => i.phaseKey===k).phaseTitle);
const colMap = new Map();
for (const col of existingCols) colMap.set(col.name, col.id);
for (const name of desiredCols) {
  if (!colMap.has(name)) {
    const c = ghApi('POST', `/projects/${project.id}/columns`, { name });
    colMap.set(name, c.id);
    console.error(`Created column: ${name}`);
  }
}

// Ensure labels
function ensureLabel(name, color, desc='') {
  try { sh(`gh label create ${JSON.stringify(name)} --color ${color} --description ${JSON.stringify(desc)} -R ${OWNER}/${REPO}`); }
  catch(e) { /* ignore if exists */ }
}
ensureLabel('roadmap','0e8a16','Imported from roadmap.md');
for (const k of phaseKeys) ensureLabel(`phase:${k}`,'1f76ff',`Phase ${k}`);
ensureLabel('size:S','bfd4f2','Small');
ensureLabel('size:M','7aa6c2','Medium');
ensureLabel('size:L','1d76db','Large');

// Helper to find existing issue by exact title
function findIssueByTitle(title) {
  try {
    const json = sh(`gh issue list -R ${OWNER}/${REPO} --state all --search ${JSON.stringify(`in:title \"${title}\"`)} --json number,title,id,state | jq -c 'map(select(.title==${JSON.stringify(title)})) | .[0]'`);
    if (!json.trim() || json.trim() === 'null') return null;
    return JSON.parse(json);
  } catch(e) { return null; }
}

for (const it of items) {
  const issueTitle = `Phase ${it.phaseKey}: ${it.title}`;
  let issue = findIssueByTitle(issueTitle);
  if (!issue) {
    const bodyLines = [];
    bodyLines.push(`Imported from roadmap: ${it.phaseTitle}${it.section?` — ${it.section}`:''}`);
    if (it.size) bodyLines.push(`\nSize: ${it.size}`);
    if (it.acceptance.length) {
      bodyLines.push('\nAcceptance Criteria:');
      for (const a of it.acceptance) bodyLines.push(`- ${a}`);
    }
    const body = bodyLines.join('\n');
    const labels = ['roadmap', `phase:${it.phaseKey}`];
    if (it.size) labels.push(`size:${it.size}`);
    const created = ghApi('POST', `/repos/${OWNER}/${REPO}/issues`, { title: issueTitle, body, labels: labels.join(',') }, { 'Accept': 'application/vnd.github+json' });
    issue = { id: created.id, number: created.number, title: created.title, state: created.state };
    console.error(`Created issue #${issue.number}: ${issue.title}`);
    if (it.done) {
      ghApi('PATCH', `/repos/${OWNER}/${REPO}/issues/${issue.number}`, { state: 'closed' }, { 'Accept': 'application/vnd.github+json' });
      console.error(`Closed issue #${issue.number} (marked done in roadmap)`);
    }
  } else {
    console.error(`Found existing issue #${issue.number}: ${issue.title}`);
  }
  // Add to project column
  const columnId = colMap.get(it.phaseTitle);
  if (!columnId) { console.error(`Missing column for ${it.phaseTitle}`); continue; }
  try {
    ghApi('POST', `/projects/columns/${columnId}/cards`, { content_id: issue.id, content_type: 'Issue' });
    console.error(`Added issue #${issue.number} to column ${it.phaseTitle}`);
  } catch(e) {
    const stderr = e.stderr ? e.stderr.toString() : '';
    if (!stderr.includes('already exists')) console.error(`Could not add issue #${issue.number}: ${stderr}`);
  }
}

console.error(`Done. Project: https://github.com/${OWNER}/${REPO}/projects`);
