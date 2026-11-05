import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = join(__dirname, '../..');
let fixture: string;
let checkout: string;
let remote: string;
let bin: string;
function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: checkout, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function publish(...args: string[]) {
  return spawnSync('bash', ['scripts/publish-update.sh', ...args], {
    cwd: checkout,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
  });
}
function pushChange() {
  writeFileSync(join(checkout, 'change.txt'), 'new source');
  git('add', '.');
  git('commit', '-m', 'Source change');
  git('push', 'origin', 'HEAD');
}
function record(): { status: string; commit: string; updates?: { id: string; platform: string }[] } {
  const releases = join(checkout, 'build/updates');
  return JSON.parse(readFileSync(join(releases, readdirSync(releases)[0], 'release.json'), 'utf8'));
}
beforeEach(() => {
  fixture = mkdtempSync(join(tmpdir(), 'unterwegs-update-'));
  checkout = join(fixture, 'checkout');
  remote = join(fixture, 'origin.git');
  bin = join(fixture, 'bin');
  mkdirSync(checkout);
  mkdirSync(bin);
  mkdirSync(join(checkout, 'scripts'));
  mkdirSync(join(checkout, 'certs'));
  for (const script of ['publish-update.sh', 'update-record.mjs'])
    cpSync(join(root, 'scripts', script), join(checkout, 'scripts', script));
  writeFileSync(join(checkout, 'app.json'), JSON.stringify({ expo: { version: '1.4.0' } }));
  writeFileSync(join(checkout, '.gitignore'), 'build/\n.env.local\ncerts/\n');
  writeFileSync(join(checkout, 'certs/certificate.pem'), 'test certificate');
  writeFileSync(
    join(checkout, '.env.local'),
    'UNTERWEGS_APP_ID=com.example.unterwegs\nUNTERWEGS_UPDATES_URL=https://updates.example.org\nUNTERWEGS_UPDATES_APP_ID=test-app\nUNTERWEGS_UPDATE_CHANNEL=production\nEXPO_PUBLIC_DEFAULT_SERVER_URL=\nEOO_TOKEN=test-token\n',
  );
  writeFileSync(join(bin, 'npm'), '#!/bin/sh\necho checks-ran > build-check-marker\nrm build-check-marker\n', {
    mode: 0o755,
  });
  writeFileSync(
    join(bin, 'npx'),
    `#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path');
fs.writeFileSync('build/publish-args.json',JSON.stringify({args:process.argv.slice(2),channel:process.env.UNTERWEGS_UPDATE_CHANNEL}));
const dir=process.argv[process.argv.indexOf('--outputDir')+1];fs.mkdirSync(dir,{recursive:true});
if(process.env.TEST_PARTIAL_PUBLISH)process.exit(1);
if(!process.env.TEST_MISSING_METADATA)fs.writeFileSync(path.join(dir,'xprem-update-metadata.json'),JSON.stringify(['android','ios'].map(platform=>({id:platform+'-update',platform,runtimeVersion:'1.4.0',branch:process.env.UNTERWEGS_UPDATE_CHANNEL}))));
`,
    { mode: 0o755 },
  );
  git('init', '--initial-branch=main');
  git('config', 'gc.auto', '0');
  git('config', 'maintenance.auto', 'false');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'core.hooksPath', '/dev/null');
  git('config', 'user.email', 'owner@example.org');
  git('config', 'user.name', 'The owner');
  git('add', '.');
  git('commit', '-m', 'Initial source');
  execFileSync('git', ['init', '--bare', '--initial-branch=main', remote], { stdio: 'ignore' });
  git('remote', 'add', 'origin', remote);
  git('push', '-u', 'origin', 'main');
});
afterEach(() => {
  rmSync(fixture, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
});

it('requires an explicit target and refuses target override arguments', () => {
  expect(publish().status).not.toBe(0);
  expect(publish('--channel', 'staging', '--branch', 'production').status).not.toBe(0);
});
it('rejects dirty or unpushed source', () => {
  writeFileSync(join(checkout, 'change.txt'), 'uncommitted');
  expect(publish('--channel', 'staging', '--dry-run').stderr).toContain('Commit first');
  git('add', '.');
  git('commit', '-m', 'Unpushed');
  expect(publish('--channel', 'staging', '--dry-run').stderr).toContain('Push first');
});
it('refreshes remote evidence rather than trusting a stale remote ref', () => {
  git('checkout', '-b', 'feature');
  pushChange();
  execFileSync('git', ['--git-dir', remote, 'branch', '-D', 'feature'], { stdio: 'ignore' });
  expect(publish('--channel', 'staging', '--dry-run').stderr).toContain('Push first');
});
it('allows pushed feature commits only on staging', () => {
  git('checkout', '-b', 'feature');
  pushChange();
  expect(publish('--channel', 'staging', '--dry-run').status).toBe(0);
  expect(
    publish('--channel', 'production', '--confirm-commit', git('rev-parse', 'HEAD'), '--dry-run').stderr,
  ).toContain('origin/main');
});
it('stops when checks fail or change the checkout', () => {
  writeFileSync(join(bin, 'npm'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  expect(publish('--channel', 'staging').status).not.toBe(0);
  writeFileSync(join(bin, 'npm'), '#!/bin/sh\necho modified > change.txt\n', { mode: 0o755 });
  expect(publish('--channel', 'staging').stderr).toContain('Checkout changed');
});
it('rejects missing build configuration before invoking the publisher', () => {
  rmSync(join(checkout, 'certs/certificate.pem'));
  expect(publish('--channel', 'staging', '--dry-run').stderr).toContain('certificate.pem missing');
});
it('requires confirmation of the full production commit', () => {
  expect(publish('--channel', 'production', '--dry-run').stderr).toContain('--confirm-commit');
  expect(publish('--channel', 'production', '--confirm-commit', git('rev-parse', 'HEAD'), '--dry-run').status).toBe(0);
});
it('publishes staging despite the production default in the env file and records both IDs', () => {
  const result = publish('--channel', 'staging');
  expect(result.status).toBe(0);
  expect(record()).toMatchObject({
    status: 'published',
    commit: git('rev-parse', 'HEAD'),
    updates: [{ id: 'android-update' }, { id: 'ios-update' }],
  });
  expect(JSON.parse(readFileSync(join(checkout, 'build/publish-args.json'), 'utf8'))).toMatchObject({
    channel: 'staging',
  });
});
it('retains failed and incomplete publish records without claiming success', () => {
  const previous = process.env.TEST_PARTIAL_PUBLISH;
  process.env.TEST_PARTIAL_PUBLISH = '1';
  try {
    expect(publish('--channel', 'staging').status).not.toBe(0);
    expect(record().status).toBe('failed');
  } finally {
    if (previous === undefined) delete process.env.TEST_PARTIAL_PUBLISH;
    else process.env.TEST_PARTIAL_PUBLISH = previous;
  }
});
it('requires reconciliation when publishing succeeds without server IDs', () => {
  const previous = process.env.TEST_MISSING_METADATA;
  process.env.TEST_MISSING_METADATA = '1';
  try {
    expect(publish('--channel', 'staging').status).not.toBe(0);
    expect(record().status).toBe('published-needs-reconciliation');
  } finally {
    if (previous === undefined) delete process.env.TEST_MISSING_METADATA;
    else process.env.TEST_MISSING_METADATA = previous;
  }
});
