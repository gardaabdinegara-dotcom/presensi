import { randomBytes } from 'node:crypto';
import { access,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const envPath=path.join(root,'.env.local');
try {await access(envPath);console.log('Konfigurasi lokal sudah ada; tidak diubah.');}
catch {
  const credential=path.resolve(root,'../credentials.json');
  await access(credential);
  const content=`GOOGLE_SPREADSHEET_ID=1yyxHMUpSbxrk56Go0cujiMQ5HQ6cdO1pCxAQUdKCtuI\nGOOGLE_APPLICATION_CREDENTIALS=${credential.replaceAll('\\','/')}\nAUTH_SECRET=${randomBytes(48).toString('base64url')}\n`;
  await writeFile(envPath,content,{flag:'wx',mode:0o600});
  console.log('Konfigurasi lokal dibuat. Credentials asli tetap di lokasi semula.');
}
