import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import {readStore,appendEvents} from '../src/server/sheets.mjs';
import {dateFor,settingsFor} from '../src/server/domain.mjs';

const base=process.env.SMOKE_ORIGIN||'http://127.0.0.1:4173';
const content=await readFile(new URL('../AKSES_ADMIN_LOKAL.txt',import.meta.url),'utf8');
const adminUsername=content.match(/Username: (.+)/)[1].trim();
const adminPassword=content.match(/Password awal: (.+)/)[1].trim();
const initial=await readStore({fresh:true});const today=dateFor(settingsFor(initial).timezone),period=today.slice(0,7);
const marker=`QA-${randomBytes(4).toString('hex')}`;const credentials={};const clients=[];let studentId,sessionId,assignmentId;
async function request(path,body,client,expected=200){const headers={'content-type':'application/json',origin:base};if(client){headers.cookie=client.cookie;if(client.csrf)headers['x-csrf-token']=client.csrf;}const res=await fetch(base+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)});const result=await res.json();assert.equal(res.status,expected,`${path}: ${result.error||'unexpected response'}`);return{result,cookie:res.headers.get('set-cookie')?.split(';')[0]};}
async function login(username,password){const {result,cookie}=await request('/api/login',{username,password});const client={cookie,csrf:result.csrf,user:result.user};clients.push(client);return client;}
async function change(client,currentPassword,newPassword){await mutate(client,'changePassword',{currentPassword,newPassword});return login(client.user.username,newPassword);}
async function mutate(client,operation,payload,expected=200,operationId=randomUUID()){const {result}=await request('/api/mutate',{operation,payload,operationId,period},client,expected);return result;}
try{
  await request('/api/data',undefined,null,401);console.log('PASS: unauthenticated access denied');
  const admin=await login(adminUsername,adminPassword);console.log('PASS: admin login against real spreadsheet');
  const created=await mutate(admin,'saveStudent',{name:`${marker} Siswa`,target:'Kedinasan',group:'Intensif A',gender:'L'});studentId=created.data.students.find(item=>item.name===`${marker} Siswa`).id;
  const session=await mutate(admin,'saveSession',{name:`${marker} Sesi`,date:today,start:'00:00',end:'23:59',group:'Intensif A',type:'SKD'});sessionId=session.data.allSessions.find(item=>item.name===`${marker} Sesi`).id;
  await mutate(admin,'setSessionStatus',{sessionId,status:'active'});
  const password=`QA!${randomBytes(14).toString('base64url')}`;
  for(const role of ['teacher','student','parent']){
    const payload={username:`${marker.toLowerCase()}.${role}`,name:`${marker} ${role}`,role,active:true,password,groups:role==='teacher'?['Intensif A']:[],studentIds:role==='student'||role==='parent'?[studentId]:[]};
    const result=await mutate(admin,'saveAccount',payload);credentials[role]={...payload,id:result.data.accounts.find(item=>item.username===payload.username).id};
  }
  const testPayload={studentId,category:'skd',date:today,twk:100,tiu:120,tkp:180};const op=randomUUID();await mutate(admin,'saveTest',testPayload,200,op);const replay=await mutate(admin,'saveTest',testPayload,200,op);assert.equal(replay.data.tests[studentId].length,1);console.log('PASS: duplicate retry does not create a second test');
  await mutate(admin,'saveTest',{studentId,category:'skd',date:today,twk:0,tiu:0,tkp:0});
  const health=await mutate(admin,'saveHealth',{studentId,date:today,height:172,weight:64,systolic:118,diastolic:76,note:`${marker} catatan uji`});assert.equal(health.data.health[studentId].height,172);
  const assignment=await mutate(admin,'saveAssignment',{name:`${marker} Tugas`,category:'SKD',group:'Intensif A',due:today,description:'Data uji aplikasi, bukan data siswa nyata.'});assignmentId=assignment.data.assignments.find(item=>item.name===`${marker} Tugas`).id;
  let pupil=await login(credentials.student.username,password);const newPassword=`QA!${randomBytes(14).toString('base64url')}`;pupil=await change(pupil,password,newPassword);
  await mutate(pupil,'saveSettings',{},403);const pupilData=(await request('/api/data',undefined,pupil)).result.data;assert.deepEqual(pupilData.students.map(item=>item.id),[studentId]);assert.equal(pupilData.accounts.length,0);assert.equal(JSON.stringify(pupilData).includes('passwordHash'),false);console.log('PASS: student cannot access admin data or settings');
  const qr=(await request('/api/qr',{sessionId},admin)).result;assert.ok(qr.image.startsWith('data:image/png;base64,'));const token=new URL(qr.link).searchParams.get('qr');
  await mutate(pupil,'submitAttendance',{sessionId,studentId,status:'hadir',qr:token});await mutate(pupil,'submitAttendance',{sessionId,studentId,status:'hadir'},409);
  await mutate(pupil,'saveSubmission',{assignmentId,studentId,note:`${marker} hasil tugas`,status:'submitted'});
  await mutate(admin,'approveAttendance',{sessionId,studentId});await mutate(admin,'setSessionStatus',{sessionId,status:'closed'});
  await mutate(admin,'saveSubmission',{assignmentId,studentId,status:'verified',score:90,note:'Data pengujian.'});
  const report=await mutate(admin,'publishReport',{studentId,period,note:`${marker} rapor pengujian`});assert.equal(report.data.reports[studentId].published,true);assert.equal(report.data.reports[studentId].snapshot.summary.skd,200);console.log('PASS: QR submission, approval, assignment and report publication');
  await mutate(admin,'saveTest',{studentId,category:'skd',date:today,twk:150,tiu:175,tkp:225});
  const parent=await login(credentials.parent.username,password);const parentData=(await request('/api/data',undefined,parent)).result.data;assert.equal(parentData.reports[studentId].snapshot.summary.skd,200);assert.equal(parentData.students.length,1);assert.equal(parentData.accounts.length,0);assert.equal(parentData.audit.length,0);console.log('PASS: published report remains stable and parent sees only own child');
  const csrf=await fetch(base+'/api/mutate',{method:'POST',headers:{'content-type':'application/json',origin:'https://wrong.example',cookie:admin.cookie,'x-csrf-token':admin.csrf},body:JSON.stringify({operation:'saveSettings',payload:{},operationId:randomUUID()})});assert.equal(csrf.status,403);console.log('PASS: foreign origin rejected');
  console.log('Real spreadsheet smoke test: PASSED');
}finally{
  const store=await readStore({fresh:true});const events=[];
  for(const name of ['Users','Students','Sessions','Assignments'])for(const item of store[name].values())if(item.name?.startsWith(marker))events.push({collection:name,id:item.id,remove:true});
  for(const name of ['Attendance','Tests','Submissions','Health','Reports'])for(const item of store[name].values())if(item.studentId===studentId||name==='Reports'&&item.snapshot?.student?.id===studentId)events.push({collection:name,id:item.id,remove:true});
  for(const client of clients){const token=client.cookie?.split('=')[1];if(token){const{sha256}=await import('../src/server/auth.mjs');const key=sha256(token);if(store.Auth.has(key))events.push({collection:'Auth',id:key,remove:true});}}
  if(events.length)await appendEvents(events,{actorId:'qa-cleanup',operationId:randomUUID()});
  const final=await readStore({fresh:true});assert.equal(final.Students.size,initial.Students.size);assert.equal(final.Users.size,initial.Users.size);console.log(`PASS: ${events.length} test entities removed from active data; event history retained`);
}
