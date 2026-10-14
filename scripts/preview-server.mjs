import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { handleRequest } from '../src/server/handler.mjs';

const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest':'application/manifest+json' };
const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) {
      const chunks=[];let size=0;
      for await (const chunk of req) { size+=chunk.length; if(size>65536){res.writeHead(413);res.end('Permintaan terlalu besar.');return;} chunks.push(chunk); }
      const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(', '):value);
      const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
      const result=await handleRequest(request);res.writeHead(result.status,Object.fromEntries(result.headers.entries()));res.end(Buffer.from(await result.arrayBuffer()));return;
    }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const parts = pathname.split('/').filter(Boolean);
    if (parts.some(part => part.startsWith('.') || part.includes('\\'))) throw new Error('Invalid path');
    const filename = path.resolve(publicRoot, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!filename.startsWith(publicRoot)) throw new Error('Outside public directory');
    const info = await stat(filename);
    if (!info.isFile()) throw new Error('Not a file');
    const data = await readFile(filename);
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy':'same-origin' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Halaman tidak ditemukan.');
  }
});
let port = Number(process.env.PORT || 4173);
server.on('error', err => {
  if (err.code === 'EADDRINUSE' && port < 4190) { port += 1; server.listen(port, '127.0.0.1'); }
  else { console.error(err.message); process.exit(1); }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}\nServing only the public design preview directory.`));
