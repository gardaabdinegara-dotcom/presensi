import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(path.join(root, 'dist'), { recursive: true });
await cp(path.join(root, 'public'), path.join(root, 'dist'), { recursive: true });
console.log('Static design preview built in dist/. No credentials or runtime data are included.');
