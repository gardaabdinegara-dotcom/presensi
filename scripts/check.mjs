import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
let failed=false;
for(const directory of ['public','src/server','api','scripts','tests'])for(const file of await readdir(directory)){if(!/\.m?js$/.test(file))continue;const result=spawnSync(process.execPath,['--check',`${directory}/${file}`],{encoding:'utf8'});if(result.status){failed=true;console.error(`${directory}/${file}\n${result.stderr}`);}}
if(failed)process.exitCode=1;else console.log('All JavaScript syntax checks passed.');
