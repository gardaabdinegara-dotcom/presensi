import { randomUUID } from 'node:crypto';
import { hashPassword, verifyPassword, verifyQr } from './auth.mjs';
import { canTeach, canReadStudent, canManageSession, inSession, settingsFor, dateFor, timeFor, toMinutes, buildReport } from './domain.mjs';

export function problem(message,status=400){throw Object.assign(new Error(message),{status});}
export function text(value,label,max=120,{optional=false}={}){if(value===undefined||value===null){if(optional)return '';problem(`${label} wajib diisi.`);}if(typeof value!=='string')problem(`${label} tidak valid.`);const result=value.trim();if((!result&&!optional)||result.length>max)problem(`${label} tidak valid.`);return result;}
export function numeric(value,label,min,max,{optional=false}={}){if(optional&&(value===null||value===undefined||value===''))return null;if(value===''||value===null||value===undefined||typeof value==='boolean'||!Number.isFinite(Number(value))||Number(value)<min||Number(value)>max)problem(`${label} harus antara ${min} dan ${max}.`);return Number(value);}
export function isoDate(value,label='Tanggal'){const result=text(value,label,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(result)||Number.isNaN(Date.parse(`${result}T12:00:00Z`))||new Date(`${result}T12:00:00Z`).toISOString().slice(0,10)!==result)problem(`${label} tidak valid.`);return result;}
function enumValue(value,choices,label){if(!choices.includes(value))problem(`${label} tidak valid.`);return value;}
function admin(user){if(user.role!=='admin')problem('Tindakan ini khusus admin.',403);}
function editor(user){if(!['admin','teacher'].includes(user.role))problem('Tindakan ini khusus admin atau pengajar.',403);}
function studentFor(store,user,id,{write=false}={}){const item=store.Students.get(String(id));if(!item||item.active===false)problem('Siswa tidak ditemukan.',404);if(!(write?canTeach(user,item):canReadStudent(user,item)))problem('Akses siswa tidak diizinkan.',403);return item;}
function groupFor(store,user,value){const settings=settingsFor(store);const group=enumValue(value,['Semua kelas',...settings.groups],'Kelas');if(user.role==='teacher'&&(group==='Semua kelas'?settings.groups.some(item=>!(user.groups||[]).includes(item)):!(user.groups||[]).includes(group)))problem('Kelas di luar penugasan pengajar.',403);return group;}
function clean(item){const {_at,_actor,_event,id,...value}=item;return value;}
function event(collection,id,value){return{collection,id,value};}
function sessionFor(store,user,id,{manage=false}={}){const item=store.Sessions.get(String(id));if(!item||item.deleted)problem('Sesi tidak ditemukan.',404);if(manage&&!canManageSession(user,item))problem('Sesi ini bukan penugasan Anda.',403);return item;}
export async function mutation(store,user,operation,payload){
  const settings=settingsFor(store);const today=dateFor(settings.timezone);let events=[];let message='Perubahan berhasil disimpan.';
  if(operation==='saveStudent'){
    admin(user);const existing=payload.id?store.Students.get(payload.id):null;
    if(payload.id&&!existing)problem('Siswa tidak ditemukan.',404);
    if(!existing&&[...store.Students.values()].filter(item=>item.active!==false).length>=settings.capacity)problem('Kapasitas siswa aktif telah terpenuhi.',409);
    const id=existing?.id||randomUUID();const name=text(payload.name,'Nama siswa',70);
    const target=enumValue(payload.target,['Kedinasan','Polri','TNI'],'Jalur');
    const group=enumValue(payload.group,settings.groups,'Kelas');const gender=enumValue(payload.gender,['L','P'],'Jenis kelamin');
    const born=payload.birthDate?isoDate(payload.birthDate,'Tanggal lahir'):'';if(born>today)problem('Tanggal lahir tidak boleh di masa depan.');
    events.push(event('Students',id,{...(existing?clean(existing):{}),name,target,group,gender,birthDate:born,enrolledAt:existing?.enrolledAt||today,active:true,code:existing?.code||`GAN-${String(store.Students.size+1).padStart(3,'0')}`}));
  }else if(operation==='archiveStudent'){
    admin(user);const item=studentFor(store,user,payload.id);events.push(event('Students',item.id,{...clean(item),active:false}));message='Siswa dinonaktifkan; riwayatnya tetap tersimpan.';
  }else if(operation==='saveSession'){
    editor(user);const existing=payload.id?sessionFor(store,user,payload.id,{manage:true}):null;if(existing?.status==='closed')problem('Sesi selesai tidak dapat diubah. Buka kembali jika perlu koreksi.',409);
    const start=text(payload.start,'Jam mulai',5),end=text(payload.end,'Jam selesai',5);if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)||start>=end)problem('Jam kegiatan tidak valid.');
    const teacherId=user.role==='teacher'?user.id:payload.teacherId||user.id;const teacher=store.Users.get(teacherId);if(!teacher?.active||!['admin','teacher'].includes(teacher.role))problem('Pengajar tidak valid.');
    const type=enumValue(payload.type,['Akademik','SKD','Psikotes','Fisik'],'Bidang');
    events.push(event('Sessions',existing?.id||randomUUID(),{...(existing?clean(existing):{}),name:text(payload.name,'Nama kegiatan',80),date:isoDate(payload.date||today),start,end,type,group:groupFor(store,user,payload.group),teacherId,teacher:teacher.name,status:existing?.status||'upcoming',icon:type==='Fisik'?'run':type==='Akademik'?'book':type==='Psikotes'?'star':'chart'}));
  }else if(operation==='setSessionStatus'){
    editor(user);const item=sessionFor(store,user,payload.sessionId,{manage:true});const status=enumValue(payload.status,['active','closed','upcoming'],'Status sesi');
    if(status==='active'&&item.date!==today)problem('Sesi hanya dapat dibuka pada tanggal kegiatannya.');
    if(status==='closed'&&[...store.Attendance.values()].some(record=>record.sessionId===item.id&&record.status==='pending'))problem('Verifikasi atau tolak pengajuan yang menunggu sebelum menutup sesi.',409);
    events.push(event('Sessions',item.id,{...clean(item),status}));message=status==='closed'?'Sesi ditutup. Siswa tanpa catatan dihitung alfa pada rekap.':'Status sesi diperbarui.';
  }else if(['setAttendance','approveAttendance','approveAll','submitAttendance'].includes(operation)){
    const session=sessionFor(store,user,payload.sessionId,{manage:operation!=='submitAttendance'});
    if(operation!=='submitAttendance')editor(user);
    if(operation==='submitAttendance'){
      if(user.role!=='student')problem('Presensi mandiri khusus akun siswa.',403);
      if(session.status!=='active'||session.date!==today)problem('Sesi presensi belum aktif.',409);
      const item=studentFor(store,user,payload.studentId||(user.studentIds||[])[0]);if(!inSession(item,session))problem('Siswa tidak terdaftar pada kelas sesi ini.',403);
      const id=`${session.id}:${item.id}`;const existing=store.Attendance.get(id);if(existing?.approved||existing?.status==='pending')problem('Presensi sesi ini sudah tercatat.',409);
      const requestedStatus=enumValue(payload.status||'hadir',['hadir','izin','sakit'],'Status pengajuan');const note=text(payload.note||'','Keterangan',500,{optional:requestedStatus==='hadir'});
      let method='Mandiri';if(payload.qr){const qr=verifyQr(payload.qr);if(!qr||qr.sessionId!==session.id)problem('QR kedaluwarsa atau tidak sesuai sesi.',400);method='QR sesi';}
      const time=timeFor(settings.timezone);events.push(event('Attendance',id,{sessionId:session.id,studentId:item.id,status:'pending',requestedStatus,time,method,note,approved:false,late:requestedStatus==='hadir'&&toMinutes(time)>toMinutes(session.start)+settings.tolerance,submittedAt:new Date().toISOString()}));message='Pengajuan terkirim dan menunggu verifikasi pengajar.';
    }else if(operation==='approveAll'){
      if(session.status!=='active')problem('Buka sesi terlebih dahulu.',409);
      for(const record of store.Attendance.values())if(record.sessionId===session.id&&record.status==='pending'){
        const item=studentFor(store,user,record.studentId,{write:true});if(!inSession(item,session))continue;
        events.push(event('Attendance',record.id,{...clean(record),status:record.requestedStatus||'hadir',approved:true,verifiedBy:user.id,verifiedAt:new Date().toISOString()}));
      }
      message=`${events.length} pengajuan berhasil diverifikasi.`;
    }else{
      const item=studentFor(store,user,payload.studentId,{write:true});if(!inSession(item,session))problem('Siswa tidak terdaftar pada sesi ini.');const id=`${session.id}:${item.id}`;const existing=store.Attendance.get(id);
      if(operation==='approveAttendance'){
        if(session.status!=='active')problem('Buka sesi terlebih dahulu.',409);if(existing?.status!=='pending')problem('Pengajuan sudah diproses atau tidak ditemukan.',409);
        events.push(event('Attendance',id,{...clean(existing),status:existing.requestedStatus||'hadir',approved:true,verifiedBy:user.id,verifiedAt:new Date().toISOString()}));
      }else{
        const status=enumValue(payload.status,['empty','hadir','izin','sakit','alfa'],'Status presensi');const note=text(payload.note||existing?.note||'','Keterangan',500,{optional:true});
        const time=payload.time?text(payload.time,'Jam masuk',5):existing?.time&&existing.time!=='—'?existing.time:timeFor(settings.timezone);if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))problem('Jam masuk tidak valid.');
        if(status==='empty')events.push({collection:'Attendance',id,remove:true});
        else events.push(event('Attendance',id,{sessionId:session.id,studentId:item.id,status,time,method:'Pengajar',note,approved:true,late:status==='hadir'&&toMinutes(time)>toMinutes(session.start)+settings.tolerance,verifiedBy:user.id,verifiedAt:new Date().toISOString()}));
      }
    }
  }else if(operation==='saveTest'){
    editor(user);const item=studentFor(store,user,payload.studentId,{write:true});const existing=payload.id?store.Tests.get(payload.id):null;if(payload.id&&!existing)problem('Tes tidak ditemukan.',404);if(existing&&existing.studentId!==item.id)problem('Siswa tes tidak sesuai.');
    const category=enumValue(payload.category,['skd','academic','psych','fitness'],'Bidang');const date=isoDate(payload.date);if(date>today)problem('Hasil tes tidak boleh bertanggal masa depan.');
    let value={studentId:item.id,category,date,teacherId:user.id,profile:settings.skd.name,note:text(payload.note||'','Catatan',500,{optional:true})};
    if(category==='skd')value.scores={twk:numeric(payload.twk,'TWK',0,settings.skd.maxTwk),tiu:numeric(payload.tiu,'TIU',0,settings.skd.maxTiu),tkp:numeric(payload.tkp,'TKP',0,settings.skd.maxTkp)};
    else{const components=category==='academic'?['numerik','indonesia','inggris','ipu']:category==='psych'?['kecerdasan','kecermatan','kepribadian']:['lari','pullup','situp','pushup','shuttle','chinning'];value.component=enumValue(payload.component,components,'Komponen');value.value=numeric(payload.value,'Skor',0,100);if(category==='fitness'){value.raw=numeric(payload.raw,'Hasil asli',value.component==='shuttle'?.1:0,value.component==='lari'?10000:value.component==='shuttle'?300:500);value.protocol=text(payload.protocol||'Penilaian pengajar GAN','Protokol / sumber skor',120);}}
    events.push(event('Tests',existing?.id||randomUUID(),value));message='Hasil tes disimpan dan rata-rata diperbarui.';
  }else if(operation==='removeTest'){
    editor(user);const item=store.Tests.get(payload.id);if(!item)problem('Tes tidak ditemukan.',404);studentFor(store,user,item.studentId,{write:true});events.push(event('Tests',item.id,{...clean(item),deleted:true}));message='Hasil tes diarsipkan; riwayat perubahan tetap tersimpan.';
  }else if(operation==='saveHealth'){
    editor(user);const item=studentFor(store,user,payload.studentId,{write:true});const date=isoDate(payload.date);if(date>today)problem('Pengukuran tidak boleh bertanggal masa depan.');
    const height=numeric(payload.height,'Tinggi badan',50,250,{optional:true}),weight=numeric(payload.weight,'Berat badan',5,300,{optional:true}),systolic=numeric(payload.systolic,'Sistolik',40,260,{optional:true}),diastolic=numeric(payload.diastolic,'Diastolik',20,160,{optional:true});
    if((systolic===null)!==(diastolic===null))problem('Sistolik dan diastolik harus diisi berpasangan.');if([height,weight,systolic].every(value=>value===null))problem('Isi setidaknya satu pengukuran.');
    events.push(event('Health',randomUUID(),{studentId:item.id,date,height,weight,systolic,diastolic,note:text(payload.note||'','Catatan pemeriksa',500,{optional:true}),examiner:user.name}));message='Pengukuran kesehatan disimpan.';
  }else if(operation==='saveAssignment'){
    editor(user);const existing=payload.id?store.Assignments.get(payload.id):null;if(payload.id&&!existing)problem('Tugas tidak ditemukan.',404);if(existing&&user.role!=='admin'&&existing.teacherId!==user.id)problem('Tugas bukan penugasan Anda.',403);
    events.push(event('Assignments',existing?.id||randomUUID(),{name:text(payload.name,'Nama tugas',120),category:enumValue(payload.category,['Akademik','SKD','Psikotes','Fisik'],'Bidang'),group:groupFor(store,user,payload.group),due:isoDate(payload.due,'Tenggat'),description:text(payload.description||'','Instruksi',1000,{optional:true}),teacherId:existing?.teacherId||user.id}));
  }else if(operation==='saveSubmission'){
    const assignment=store.Assignments.get(payload.assignmentId);if(!assignment||assignment.deleted)problem('Tugas tidak ditemukan.',404);const item=studentFor(store,user,payload.studentId,{write:['admin','teacher'].includes(user.role)});if(assignment.group!=='Semua kelas'&&assignment.group!==item.group)problem('Tugas tidak untuk kelas siswa ini.',403);
    if(user.role==='parent')problem('Orang tua hanya dapat melihat tugas.',403);const editorRole=['admin','teacher'].includes(user.role);const status=editorRole?enumValue(payload.status,['submitted','verified','returned'],'Status tugas'):'submitted';
    const score=editorRole?numeric(payload.score,'Nilai tugas',0,100,{optional:true}):null;const note=text(payload.note||'','Catatan tugas',500,{optional:true});const link=text(payload.link||'','Tautan hasil',500,{optional:true});if(link&&!/^https?:\/\//.test(link))problem('Tautan harus diawali https:// atau http://.');
    events.push(event('Submissions',`${assignment.id}:${item.id}`,{assignmentId:assignment.id,studentId:item.id,status,score,note,link,submittedAt:new Date().toISOString(),verifiedBy:editorRole?user.id:null}));message=editorRole?'Status pengumpulan diperbarui.':'Tugas dikirim untuk diperiksa pengajar.';
  }else if(operation==='saveReport'||operation==='publishReport'||operation==='reviseReport'){
    if(operation==='publishReport'||operation==='reviseReport')admin(user);else editor(user);
    const item=studentFor(store,user,payload.studentId,{write:true});const period=text(payload.period,'Periode',7);if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))problem('Periode rapor tidak valid.');const id=`${item.id}:${period}`;const existing=store.Reports.get(id);
    if(existing?.published&&operation==='saveReport')problem('Buat revisi draf terlebih dahulu.',409);
    if(operation==='reviseReport') {events.push(event('Reports',id,{...(existing?clean(existing):{}),published:false,version:(existing?.version||1)+1,note:existing?.note||''}));message='Revisi draf dibuat. Arsip versi lama tetap ada dalam riwayat spreadsheet.';}
    else{const snapshot=buildReport(store,item,period);const note=text(payload.note??existing?.note??'','Catatan rapor',1000,{optional:true});events.push(event('Reports',id,{published:operation==='publishReport',version:existing?.version||1,note,snapshot,teacher:user.name,publishedAt:operation==='publishReport'?new Date().toISOString():null}));message=operation==='publishReport'?'Rapor diterbitkan. Nilai dan aturan tersimpan sebagai arsip versi ini.':'Draf rapor disimpan.';}
  }else if(operation==='saveSettings'){
    admin(user);const timezone=enumValue(payload.timezone||settings.timezone,['Asia/Jakarta','Asia/Makassar','Asia/Jayapura'],'Zona waktu');const a=numeric(payload.gradeA??settings.gradeA,'Batas A',1,100),b=numeric(payload.gradeB??settings.gradeB,'Batas B',1,99),c=numeric(payload.gradeC??settings.gradeC,'Batas C',0,98);if(!(a>b&&b>c))problem('Batas predikat harus A > B > C.');
    const groups=(Array.isArray(payload.groups)?payload.groups:String(payload.groups||settings.groups.join(',')).split(',')).map(item=>text(item,'Kelas',40));if(!groups.length||groups.length>10||new Set(groups).size!==groups.length)problem('Daftar kelas tidak valid.');
    if([...store.Students.values()].some(item=>item.active!==false&&!groups.includes(item.group)))problem('Kelas yang memiliki siswa aktif harus dipertahankan.');
    events.push(event('Settings','main',{...settings,name:text(payload.name||settings.name,'Nama lembaga',80),location:text(payload.location||settings.location,'Lokasi',80),timezone,tolerance:numeric(payload.tolerance??settings.tolerance,'Toleransi',0,60),groups,gradeA:a,gradeB:b,gradeC:c}));
  }else if(operation==='saveAccount'){
    admin(user);const existing=payload.id?store.Users.get(payload.id):null;if(payload.id&&!existing)problem('Akun tidak ditemukan.',404);const username=text(payload.username,'Username',40).toLowerCase();if(!/^[a-z0-9._-]{3,40}$/.test(username))problem('Username 3–40 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.');if([...store.Users.values()].some(item=>item.id!==existing?.id&&item.username===username))problem('Username sudah digunakan.',409);
    const role=enumValue(payload.role,['admin','teacher','student','parent'],'Peran');const active=payload.active!==false;const studentIds=Array.isArray(payload.studentIds)?[...new Set(payload.studentIds)]:[];const groups=Array.isArray(payload.groups)?[...new Set(payload.groups)]:[];
    if(role==='student'&&studentIds.length!==1||role==='parent'&&!studentIds.length)problem('Hubungkan akun siswa/orang tua dengan siswa yang sesuai.');for(const id of studentIds)if(!store.Students.get(id)||store.Students.get(id).active===false)problem('Hubungan siswa tidak valid.');for(const group of groups)if(!settings.groups.includes(group))problem('Penugasan kelas tidak valid.');if(role==='teacher'&&!groups.length)problem('Pengajar harus memiliki penugasan kelas.');
    if(existing?.role==='admin'&&(!active||role!=='admin')&&![...store.Users.values()].some(item=>item.id!==existing.id&&item.active&&item.role==='admin'))problem('Setidaknya satu akun admin harus aktif.',409);
    const passwordHash=payload.password?await hashPassword(payload.password):existing?.passwordHash;if(!passwordHash)problem('Password awal wajib diisi.');
    events.push(event('Users',existing?.id||randomUUID(),{username,name:text(payload.name,'Nama akun',70),role,active,studentIds:['student','parent'].includes(role)?studentIds:[],groups:role==='teacher'?groups:role==='admin'?settings.groups:[],passwordHash,authVersion:randomUUID(),createdAt:existing?.createdAt||new Date().toISOString(),mustChangePassword:payload.password?true:Boolean(existing?.mustChangePassword)}));message='Akun disimpan. Password tidak ditampilkan kembali.';
  }else if(operation==='changePassword'){
    if(!await verifyPassword(payload.currentPassword,user.passwordHash))problem('Password lama tidak sesuai.',400);const passwordHash=await hashPassword(payload.newPassword);events.push(event('Users',user.id,{...clean(user),passwordHash,authVersion:randomUUID(),mustChangePassword:false}));message='Password diganti. Silakan masuk kembali.';
  }else problem('Tindakan tidak dikenal.',404);
  return {events,message};
}
