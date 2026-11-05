import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [directory, status] = process.argv.slice(2);
const file = join(directory, 'release.json');
const record = existsSync(file)
  ? JSON.parse(readFileSync(file, 'utf8'))
  : {
      commit: process.env.OTA_RECORD_COMMIT,
      channel: process.env.OTA_RECORD_CHANNEL,
      branch: process.env.OTA_RECORD_CHANNEL,
      platform: process.env.OTA_RECORD_PLATFORM,
      runtimeVersion: process.env.OTA_RECORD_RUNTIME,
      startedAt: new Date().toISOString(),
    };
record.status = status;
record.updatedAt = new Date().toISOString();
const metadata = join(directory, 'export', 'xprem-update-metadata.json');
if (existsSync(metadata)) record.updates = JSON.parse(readFileSync(metadata, 'utf8'));
if (status === 'published') {
  const expected = record.platform === 'all' ? ['android', 'ios'] : [record.platform];
  if (
    !expected.every((platform) =>
      record.updates?.some(
        (update) =>
          update.id &&
          update.platform === platform &&
          update.runtimeVersion === record.runtimeVersion &&
          update.branch === record.branch,
      ),
    )
  ) {
    record.status = 'published-needs-reconciliation';
    process.exitCode = 1;
    console.error(
      'Server publish succeeded, but complete update IDs are missing. Reconcile with xprem before retrying.',
    );
  }
}
writeFileSync(file, JSON.stringify(record, null, 2) + '\n');
console.log(`Release record: ${file} (${record.status})`);
