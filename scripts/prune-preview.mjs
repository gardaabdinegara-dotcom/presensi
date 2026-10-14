import {readFile,writeFile} from 'node:fs/promises';
import {parse} from 'acorn';
const core='public/program.js';
const declarations=new Set();
for(const filename of ['public/features.js','public/actions.js']){const ast=parse(await readFile(filename,'utf8'),{ecmaVersion:'latest'});for(const node of ast.body)if(node.type==='FunctionDeclaration')declarations.add(node.id.name);}
for(const name of ['topNav','studentSpotlight','reportTeaser'])declarations.add(name);
let source=await readFile(core,'utf8');const ast=parse(source,{ecmaVersion:'latest'});const ranges=ast.body.filter(node=>node.type==='FunctionDeclaration'&&declarations.has(node.id.name)).map(node=>[node.start,node.end]).sort((a,b)=>b[0]-a[0]);
for(const[start,end]of ranges)source=source.slice(0,start)+source.slice(end);
source=source.replace("${design === 'patriot' ? topNav() : sidebar()}","${sidebar()}");
await writeFile(core,source.replace(/\n{3,}/g,'\n\n'));
console.log(`Removed ${ranges.length} superseded preview functions from production core.`);
