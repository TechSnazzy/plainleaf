import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const names = execFileSync(
  'git',
  ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean);
let failed = false;
const forbidden = /(^|\/)\.env(?:\.|$)|\.(?:pem|key|p12|pfx|mobileprovision)$/i;
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/,
];
for (const file of names) {
  if (forbidden.test(file)) {
    console.error(`Forbidden secret file: ${file}`);
    failed = true;
  }
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (patterns.some((p) => p.test(content))) {
    console.error(`Possible credential in ${file}; value suppressed.`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(
  'Working-tree credential-pattern scan passed. Full-history release scan is separately required.',
);
