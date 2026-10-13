import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import { configuration } from './config.mjs';
import { readStore,appendEvents,applyEvents } from './sheets.mjs';
import { secureToken,sha256,sign,sessionUser,publicUser,cookieHeader,verifyPassword,requireOrigin,requireCsrf,qrToken } from './auth.mjs';
import { viewData,settingsFor,canManageSession,dateFor } from './domain.mjs';
import { mutation,problem,text } from './mutations.mjs';

const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'};
const response=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{...headers,...extra}});
async function readJson(request){if(Number(request.headers.get('content-length')||0)>65536)problem('Permintaan terlalu besar.',413);const reader=request.body?.getReader();let size=0,parts=[];if(reader)while(true){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();problem('Permintaan terlalu besar.',413);}parts.push(Buffer.from(value));}try{return JSON.parse(Buffer.concat(parts).toString()||'{}');}catch{problem('Format permintaan tidak valid.');}}
function routeFor(url){const route=url.searchParams.get('route');return route?`/api/${route.replace(/^\/+|\/+$/g,'')}`:url.pathname.replace(/\/$/,'');}
const safeMessages={SERVICE_ACCOUNT_NOT_CONFIGURED:'Service account belum dikonfigurasi di server.',SERVICE_ACCOUNT_INVALID:'Format service account di server tidak valid.',SPREADSHEET_NOT_CONFIGURED:'ID spreadsheet belum dikonfigurasi.',AUTH_SECRET_NOT_CONFIGURED:'AUTH_SECRET server belum dikonfigurasi.',SHEETS_ACCESS_DENIED:'Server belum dapat mengakses Google Sheets. Periksa izin Editor dan aktivasi Sheets API.',SHEETS_RATE_LIMIT:'Google Sheets sedang membatasi permintaan. Tunggu sebentar lalu coba lagi.',SPREADSHEET_NOT_FOUND:'Spreadsheet tidak ditemukan.',SHEETS_UNAVAILABLE:'Google Sheets belum dapat dihubungi. Perubahan belum dikonfirmasi tersimpan.',INVALID_DATABASE_ROW:'Ada baris database aplikasi yang tidak valid. Periksa tab GAN_ sebelum melanjutkan.'};
export async function handleRequest(request){
  try{
    const url=new URL(request.url),route=routeFor(url),method=request.method;
    if(method==='GET'&&route==='/api/status')return response({configured:Boolean(configuration().spreadsheetId&&configuration().secret.length>=32&&(process.env.GOOGLE_SERVICE_ACCOUNT_JSON||process.env.GOOGLE_APPLICATION_CREDENTIALS)),name:'Garda Abdi Negara',demo:true});
    if(!configuration().secret||configuration().secret.length<32)throw new Error('AUTH_SECRET_NOT_CONFIGURED');
    if(method==='POST'&&route==='/api/login'){
      requireOrigin(request);const body=await readJson(request);const username=text(body.username,'Username',40).toLowerCase();const password=typeof body.password==='string'?body.password:'';if(password.length>128)problem('Username atau password tidak sesuai.',401);
      const store=await readStore({fresh:true});const ip=(request.headers.get('x-forwarded-for')||'local').split(',')[0].trim();const accountKey=sign(`login:${username}`),ipKey=sign(`ip:${ip}`);const recent=[...store.Auth.values()].filter(item=>item.type==='attempt'&&!item.success&&item.at>Date.now()-15*60*1000);
      if(recent.filter(item=>item.accountKey===accountKey).length>=5||recent.filter(item=>item.ipKey===ipKey).length>=25)return response({error:'Terlalu banyak percobaan. Coba kembali setelah 15 menit.'},429,{'Retry-After':'900'});
      const user=[...store.Users.values()].find(item=>item.username===username&&item.active);
      const valid=user?await verifyPassword(password,user.passwordHash):false;
      const attempt={collection:'Auth',id:randomUUID(),value:{type:'attempt',accountKey,ipKey,at:Date.now(),success:valid}};
      if(!valid){await appendEvents([attempt],{actorId:'login'});return response({error:'Username atau password tidak sesuai.'},401);}
      const token=secureToken();const value={type:'session',userId:user.id,authVersion:user.authVersion,expiresAt:Date.now()+configuration().sessionHours*3600000,createdAt:Date.now()};
      await appendEvents([attempt,{collection:'Auth',id:sha256(token),value}],{actorId:user.id});
      return response({user:publicUser(user),csrf:sign(`csrf:${token}`)},200,{'Set-Cookie':cookieHeader(token)});
    }
    const store=await readStore();const auth=sessionUser(request,store);
    if(!auth)return response({error:'Silakan masuk untuk menggunakan data real.'},401);
    if(method==='GET'&&route==='/api/session')return response({user:publicUser(auth.user),csrf:auth.csrf});
    if(method==='POST'&&route==='/api/logout'){requireCsrf(request,auth);await appendEvents([{collection:'Auth',id:sha256(auth.token),remove:true}],{actorId:auth.user.id});return response({ok:true},200,{'Set-Cookie':cookieHeader()});}
    if(method==='GET'&&route==='/api/data')return response({data:viewData(store,auth.user,url.searchParams.get('period')),csrf:auth.csrf});
    if(method==='POST'&&route==='/api/qr'){
      requireCsrf(request,auth);const body=await readJson(request);const session=store.Sessions.get(body.sessionId);const settings=settingsFor(store);if(!session||!canManageSession(auth.user,session))problem('Akses sesi tidak diizinkan.',403);if(session.status!=='active'||session.date!==dateFor(settings.timezone))problem('QR hanya tersedia untuk sesi aktif hari ini.',409);
      const expiresAt=Date.now()+10*60*1000;const token=qrToken(session.id,expiresAt);const origin=configuration().origin||url.origin;const link=`${origin}/?qr=${encodeURIComponent(token)}&session=${encodeURIComponent(session.id)}`;
      const image=await QRCode.toDataURL(link,{width:320,margin:2,errorCorrectionLevel:'M',color:{dark:'#102732',light:'#ffffff'}});return response({image,link,expiresAt});
    }
    if(method==='POST'&&route==='/api/mutate'){
      requireCsrf(request,auth);const body=await readJson(request);const operation=text(body.operation,'Tindakan',40);const operationId=text(body.operationId,'ID permintaan',80);if(!/^[a-zA-Z0-9-]{12,80}$/.test(operationId))problem('ID permintaan tidak valid.');
      if(auth.user.mustChangePassword&&operation!=='changePassword')problem('Ganti password awal sebelum melakukan perubahan.',403);
      const fresh=await readStore({fresh:true});const current=sessionUser(request,fresh);if(!current)problem('Sesi tidak berlaku. Masuk kembali.',401);
      const existing=fresh.Audit.get(operationId);if(existing){if(existing.actorId!==auth.user.id||existing.action!==operation)problem('ID permintaan sudah digunakan.',409);return response({data:viewData(fresh,current.user,body.period),message:'Permintaan ini sudah tersimpan sebelumnya.',csrf:auth.csrf});}
      const result=await mutation(fresh,current.user,operation,body.payload||{});const audit={collection:'Audit',id:operationId,value:{at:new Date().toISOString(),actorId:current.user.id,actor:current.user.name,action:operation,target:result.events.map(item=>`${item.collection}:${item.id}`).join(',')}};
      if(result.events.length)await appendEvents([...result.events,audit],{actorId:current.user.id,operationId});
      const updated=applyEvents(fresh,result.events);const user=updated.Users.get(current.user.id)||current.user;
      return response({data:viewData(updated,user,body.period),message:result.message,csrf:auth.csrf,relogin:operation==='changePassword'},200,operation==='changePassword'?{'Set-Cookie':cookieHeader()}:{});
    }
    return response({error:'Endpoint tidak ditemukan.'},404);
  }catch(error){const known=safeMessages[error.message];const status=error.status||500;const message=known||error.status?known||error.message:'Permintaan belum berhasil diproses. Periksa konfigurasi server dan coba kembali.';return response({error:message},status);}
}
