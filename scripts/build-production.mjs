import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const buildResult = spawnSync('npx next build', {
  shell: true,
  stdio: 'inherit',
  cwd: process.cwd(),
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const standaloneNextDir = path.join(standaloneDir, '.next');
const staticSourceDir = path.join(rootDir, '.next', 'static');
const staticTargetDir = path.join(standaloneNextDir, 'static');
const publicSourceDir = path.join(rootDir, 'public');
const publicTargetDir = path.join(standaloneDir, 'public');

if (!existsSync(standaloneDir)) {
  throw new Error('Standalone build output was not generated.');
}

mkdirSync(standaloneNextDir, { recursive: true });

if (existsSync(staticSourceDir)) {
  cpSync(staticSourceDir, staticTargetDir, { recursive: true, force: true });
}

if (existsSync(publicSourceDir)) {
  cpSync(publicSourceDir, publicTargetDir, { recursive: true, force: true });
}
