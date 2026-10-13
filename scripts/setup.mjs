import { inspectSpreadsheet,initializeSchema,readStore,appendEvents } from '../src/server/sheets.mjs';
import { hashPassword } from '../src/server/auth.mjs';
import { defaultSettings } from '../src/server/domain.mjs';
import { randomBytes,randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { projectRoot } from '../src/server/config.mjs';
try {
  if(process.argv.includes('--inspect')) {const result=await inspectSpreadsheet();console.log(JSON.stringify({title:result.title,tabs:result.tabs.map(tab=>({title:tab.title,rows:tab.gridProperties.rowCount}))},null,2));}
  else {
    const schema=await initializeSchema();
    console.log(JSON.stringify(schema,null,2));
    const store=await readStore({fresh:true});
    if(!store.Users.size) {
      const password=process.env.INITIAL_ADMIN_PASSWORD||`Garda!${randomBytes(15).toString('base64url')}`;
      const username=process.env.INITIAL_ADMIN_USERNAME||'admin.gan';
      const user={username,name:'Administrator GAN',role:'admin',active:true,studentIds:[],groups:defaultSettings.groups,passwordHash:await hashPassword(password),authVersion:randomUUID(),createdAt:new Date().toISOString()};
      await appendEvents([{collection:'Users',id:randomUUID(),value:user},{collection:'Settings',id:'main',value:defaultSettings}],{actorId:'initial-setup'});
      const content=`AKSES ADMIN GARDA ABDI NEGARA\n\nUsername: ${username}\nPassword awal: ${password}\n\nGunakan tombol Gunakan Data Real. Ganti password di menu akun setelah masuk.\nFile ini bersifat rahasia, diabaikan Git dan tidak dimasukkan hasil build/deploy.\n`;
      await writeFile(`${projectRoot}AKSES_ADMIN_LOKAL.txt`,content,{flag:'wx',mode:0o600});
      console.log('Admin pertama dibuat. Informasi masuk tersimpan di AKSES_ADMIN_LOKAL.txt (tidak ditampilkan di log).');
    } else console.log('Akun yang sudah ada dipertahankan; tidak ada password yang diubah.');
  }
}catch(error){console.error(`Setup belum berhasil: ${error.message}`);process.exitCode=1;}
