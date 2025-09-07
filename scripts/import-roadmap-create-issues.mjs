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

function sh(cmd, opts={}) { return execSync(cmd, { stdio: ['ignore','pipe','pipe'], ...opts }).toString(); }
function ghApi(method, endpoint, data, extraHeaders={}) {
  const hdrs = Object.entries({ 'Accept': 'application/vnd.github+json', ...extraHeaders })
    .map(([k,v]) => `-H '${k}: ${v}'`).join(' ');
  let body = '';
  if (data) {
    const parts = [];
    for (const [k,v] of Object.entries(data)) {
      if (Array.isArray(v)) {
        for (const val of v) parts.push(`-f ${JSON.stringify(`${k}[]=${String(val)}`)}`);
      } else {
        parts.push(`-f ${JSON.stringify(`${k}=${String(v)}`)}`);
      }
    }
    body = parts.join(' ');
  }
  const cmd = `gh api --method ${method} ${hdrs} ${body} '${endpoint}'`;
  return JSON.parse(sh(cmd));
}

const md = fs.readFileSync(ROADMAP_PATH, 'utf8').split(/\r?\n/);
const items = [];
let phase = null; let section = null;
for (let i=0; i<md.length; i++) {
  const line = md[i];
  const phaseMatch = line.match(/^##\s+Phase\s+([0-9]+(?:\.[0-9]+)?)\s*:\s*(.+)$/);
  if (phaseMatch) { phase = { key: phaseMatch[1], title: `Phase ${phaseMatch[1]}: ${phaseMatch[2]}` }; section = null; continue; }
  const sectionMatch = line.match(/^###\s+(.+?)\s*$/); if (sectionMatch) { section = sectionMatch[1]; continue; }
  const itemMatch = line.match(/^\- \[(x| )\] (.+)$/i);
  if (itemMatch && phase) {
    const checked = itemMatch[1].toLowerCase() === 'x';
    let title = itemMatch[2].trim();
    let size = null; const sizeMatch = title.match(/`([SML])`/);
    if (sizeMatch) { size = sizeMatch[1]; title = title.replace(/`[SML]`/, '').trim(); }
    const acceptance = []; let j = i + 1;
    while (j < md.length) {
      const ln = md[j];
      if (/^\s*\- \[/.test(ln) || /^##\s/.test(ln) || /^###\s/.test(ln)) break;
      if (/^\s*$/.test(ln)) { j++; continue; }
      const acc = ln.match(/^\s*\-\s+(.*)$/); if (acc) acceptance.push(acc[1]); else break; j++;
    }
    items.push({ phaseKey: phase.key, phaseTitle: phase.title, section, title, size, done: checked, acceptance });
  }
}

// Ensure labels
function ensureLabel(name, color, desc='') { try { sh(`gh label create ${JSON.stringify(name)} --color ${color} --description ${JSON.stringify(desc)} -R ${OWNER}/${REPO}`); } catch(e) {} }
const phaseKeys = Array.from(new Set(items.map(i => i.phaseKey))).sort((a,b)=>parseFloat(a)-parseFloat(b));
ensureLabel('roadmap','0e8a16','Imported from roadmap.md');
for (const k of phaseKeys) ensureLabel(`phase:${k}`,'1f76ff',`Phase ${k}`);
ensureLabel('size:S','bfd4f2','Small'); ensureLabel('size:M','7aa6c2','Medium'); ensureLabel('size:L','1d76db','Large');

function findIssueByTitle(title) {
  try { const json = sh(`gh issue list -R ${OWNER}/${REPO} --state all --search ${JSON.stringify(`in:title \"${title}\"`)} --json number,title,id,state | jq -c 'map(select(.title==${JSON.stringify(title)})) | .[0]'`);
    if (!json.trim() || json.trim()==='null') return null; return JSON.parse(json);
  } catch(e) { return null; }
}

const created = [];
for (const it of items) {
  const issueTitle = `Phase ${it.phaseKey}: ${it.title}`;
  let issue = findIssueByTitle(issueTitle);
  if (!issue) {
    const bodyLines = [];
    bodyLines.push(`Imported from roadmap: ${it.phaseTitle}${it.section?` — ${it.section}`:''}`);
    if (it.size) bodyLines.push(`\nSize: ${it.size}`);
    if (it.acceptance.length) { bodyLines.push('\nAcceptance Criteria:'); for (const a of it.acceptance) bodyLines.push(`- ${a}`); }
    const body = bodyLines.join('\n');
    const labels = ['roadmap', `phase:${it.phaseKey}`]; if (it.size) labels.push(`size:${it.size}`);
    const res = ghApi('POST', `/repos/${OWNER}/${REPO}/issues`, { title: issueTitle, body, labels });
    issue = { id: res.id, number: res.number, title: res.title, state: res.state };
    if (it.done) { ghApi('PATCH', `/repos/${OWNER}/${REPO}/issues/${issue.number}`, { state: 'closed' }); }
    created.push({ number: issue.number, title: issue.title, state: it.done?'closed':'open' });
    console.error(`Created #${issue.number} (${it.done?'closed':'open'}): ${issue.title}`);
  } else {
    console.error(`Exists #${issue.number} (${issue.state}): ${issue.title}`);
  }
}

console.error(`Created/updated ${created.length} issues. View: https://github.com/${OWNER}/${REPO}/issues?q=label%3Aroadmap`);
