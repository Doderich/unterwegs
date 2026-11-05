import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let directory: string;
let bin: string;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'unterwegs-testflight-'));
  bin = join(directory, 'bin');
  mkdirSync(bin);
  mkdirSync(join(directory, 'scripts'));
  cpSync(join(__dirname, '../../scripts/ios-testflight.sh'), join(directory, 'scripts/ios-testflight.sh'));
  writeFileSync(join(directory, 'app.json'), JSON.stringify({ expo: { version: '1.4.0' } }));
  writeFileSync(
    join(directory, '.env.local'),
    'UNTERWEGS_APP_ID=com.example.unterwegs\nUNTERWEGS_IOS_BUNDLE_ID=com.example.unterwegs.ios\nUNTERWEGS_APPLE_TEAM_ID=EXAMPLETEAM\nUNTERWEGS_UPDATE_CHANNEL=production\n',
  );
  writeFileSync(
    join(bin, 'npx'),
    `#!/usr/bin/env node
const fs=require('node:fs');
const name=process.env.UNTERWEGS_UPDATE_CHANNEL==='staging'?'UnterwegsStaging':'Unterwegs';
fs.mkdirSync('ios/'+name+'.xcworkspace',{recursive:true});
`,
    { mode: 0o755 },
  );
  writeFileSync(
    join(bin, 'xcodebuild'),
    `#!/usr/bin/env node
require('node:fs').appendFileSync('calls.jsonl', JSON.stringify({args:process.argv.slice(2),channel:process.env.UNTERWEGS_UPDATE_CHANNEL,build:process.env.UNTERWEGS_BUILD_NUMBER})+'\\n');
`,
    { mode: 0o755 },
  );
});
afterEach(() => rmSync(directory, { recursive: true, force: true, maxRetries: 3 }));
function run(...args: string[]) {
  return spawnSync('bash', ['scripts/ios-testflight.sh', ...args], {
    cwd: directory,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
  });
}
function calls(): { args: string[]; channel: string; build: string }[] {
  return readFileSync(join(directory, 'calls.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
}
it('defaults to production and labels the archive with its channel', () => {
  const result = run();
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('Expected App Store Connect record: Unterwegs Production');
  expect(result.stdout).toContain('bundle=com.example.unterwegs.ios');
  expect(calls()).toHaveLength(2);
  const archive = calls()[0];
  expect(archive.channel).toBe('production');
  expect(archive.build).toMatch(/^\d+$/);
  expect(archive.args).toContain(`build/testflight/production-1.4.0-${archive.build}/Unterwegs-production.xcarchive`);
});
it('selects staging for both archive and upload despite the env file default', () => {
  const result = run('--channel', 'staging');
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('Expected App Store Connect record: Unterwegs Staging');
  expect(result.stdout).toContain('bundle=com.example.unterwegs.ios.staging');
  expect(calls().every((call) => call.channel === 'staging')).toBe(true);
  const archive = calls()[0];
  expect(archive.args).toContain(`build/testflight/staging-1.4.0-${archive.build}/Unterwegs-staging.xcarchive`);
  expect(archive.args).toContain('UnterwegsStaging');
});
it('can create a staging archive without uploading it', () => {
  expect(run('--channel', 'staging', '--no-upload').status).toBe(0);
  expect(calls()).toHaveLength(1);
  expect(calls()[0].args[0]).toBe('archive');
});
it('rejects invalid or incomplete channel arguments before building', () => {
  expect(run('--channel', 'preview').status).not.toBe(0);
  expect(run('--channel').status).not.toBe(0);
});
