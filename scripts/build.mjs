import { cp, mkdir,readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(path.join(root, 'dist'), { recursive: true });
await cp(path.join(root, 'public'), path.join(root, 'dist'), { recursive: true });
const hash=createHash('sha256');
for(const file of ['index.html','app.html','program.js','features.js','actions.js','login.js','styles.css','program.css'])hash.update(await readFile(path.join(root,'public',file)));
const version=hash.digest('hex').slice(0,12);
const worker=await readFile(path.join(root,'public','sw.js'),'utf8');
await writeFile(path.join(root,'dist','sw.js'),worker.replace('gan-shell-v1',`gan-shell-${version}`));
console.log(`Web assets built in dist/ (version ${version}). API source remains in api/ and src/server/. Credentials are excluded.`);
