#!/usr/bin/env node
// Usage: fetch-index.mjs [--org <login>] [--refresh] [--max-age-hours <n>]
// Stdout line 1: absolute path of the index file. Line 2: "fresh <n>" (just fetched, n projects) or "cached".
// Exit 1 with a message on stderr if `gh` fails (not installed, not logged in, no org access).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const QUERY = `query($org:String!,$endCursor:String){organization(login:$org){
  repositories(first:50,after:$endCursor,isArchived:false){pageInfo{hasNextPage endCursor}
  nodes{name url defaultBranchRef{name} object(expression:"HEAD:CAPABILITIES.md"){... on Blob{text}}}}}}`;
const JQ = '.data.organization.repositories.nodes[] | select(.object.text) | {name, url, branch: .defaultBranchRef.name, text: .object.text}';

export function buildIndex(repos) {
  return [...repos]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((r) => `<!-- ==== repo: ${r.name} | ${r.url}/blob/${r.branch} ==== -->\n\n${r.text.trim()}\n`)
    .join('\n');
}

export function parseLines(stdout) {
  return stdout.split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

function main() {
  const { values } = parseArgs({
    options: {
      org: { type: 'string', default: 'nodesoccoop' },
      refresh: { type: 'boolean', default: false },
      'max-age-hours': { type: 'string', default: '24' },
    },
  });
  const dir = join(homedir(), '.cache', 'claude-capabilities');
  const file = join(dir, `${values.org}.md`);
  const maxAgeMs = Number(values['max-age-hours']) * 3600_000;

  if (!values.refresh && existsSync(file) && Date.now() - statSync(file).mtimeMs < maxAgeMs) {
    console.log(`${file}\ncached`);
    return;
  }

  let stdout;
  try {
    stdout = execFileSync(
      'gh',
      ['api', 'graphql', '--paginate', '-f', `org=${values.org}`, '-f', `query=${QUERY}`, '--jq', JQ],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch (err) {
    console.error(`gh failed: ${(err.stderr || err.message).trim()}`);
    process.exit(1);
  }
  const repos = parseLines(stdout);
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, buildIndex(repos));
  console.log(`${file}\nfresh ${repos.length}`);
}

if (process.argv[1]?.endsWith('fetch-index.mjs')) main();
