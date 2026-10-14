import { publicUser } from './auth.mjs';

export const academicLabels = { numerik:'Penalaran Numerik', indonesia:'Bahasa Indonesia', inggris:'Bahasa Inggris', ipu:'Ilmu Pengetahuan Umum' };
export const psychLabels = { kecerdasan:'Kecerdasan', kecermatan:'Kecermatan', kepribadian:'Kepribadian' };
export const fitnessLabels = { lari:'Lari 12 menit', pullup:'Pull-up', situp:'Sit-up', pushup:'Push-up', shuttle:'Shuttle run', chinning:'Chinning' };
export const defaultSettings = { name:'Garda Abdi Negara', location:'Pusat Latihan GAN', timezone:'Asia/Jakarta', tolerance:10, capacity:30, groups:['Intensif A','Intensif B'], gradeA:80, gradeB:60, gradeC:40, skd:{name:'Kedinasan 2026 · Umum',twk:65,tiu:80,tkp:156,maxTwk:150,maxTiu:175,maxTkp:225,source:'https://data-jdih.menpan.go.id/dokumen/2026kepmenpanrb406.pdf'}, discipline:{excellent:95,good:85,fair:75} };
export const settingsFor = store => ({ ...defaultSettings,...store.Settings.get('main') });
export function dateFor(timezone = 'Asia/Jakarta', instant = new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(instant); }
export function timeFor(timezone = 'Asia/Jakarta', instant = new Date()) { return new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(instant); }
export const mean = values => values.length ? values.reduce((sum,value)=>sum+Number(value),0)/values.length : null;
export function toMinutes(time) { const [hours,minutes] = String(time).split(':').map(Number); return hours*60+minutes; }
export function canReadStudent(user,item) { return user.role === 'admin' || user.role === 'teacher' && (user.groups || []).includes(item.group) || ['student','parent'].includes(user.role) && (user.studentIds || []).includes(item.id); }
export function canTeach(user,item) { return user.role === 'admin' || user.role === 'teacher' && (user.groups || []).includes(item.group); }
export function canManageSession(user,item) { return user.role === 'admin' || user.role === 'teacher' && item.teacherId === user.id; }
export function inSession(item,session) { return item.active !== false && (Array.isArray(session.studentIds) ? session.studentIds.includes(item.id) : (session.group === 'Semua kelas' || session.group === item.group) && (!item.enrolledAt || session.date >= item.enrolledAt)); }
export function gradeOf(value,settings=defaultSettings) { return value === null ? '—' : value >= settings.gradeA ? 'A' : value >= settings.gradeB ? 'B' : value >= settings.gradeC ? 'C' : 'D'; }
export function labelOf(value,settings=defaultSettings) { return value === null ? 'Belum diisi' : value >= settings.gradeA ? 'Sangat baik' : value >= settings.gradeB ? 'Baik' : value >= settings.gradeC ? 'Cukup' : 'Perlu pembinaan'; }
export function disciplineLabel(value,settings=defaultSettings) { const rule=settings.discipline||defaultSettings.discipline;return value===null?'Belum ada sesi selesai':value>=rule.excellent?'Sangat disiplin':value>=rule.good?'Disiplin':value>=rule.fair?'Cukup disiplin':'Perlu pembinaan'; }
export function normalizedScore(test) { return test.value === undefined || test.value === null ? null : Number(test.value); }
export function viewData(store,user,period) {
  const settings = settingsFor(store);
  const today = dateFor(settings.timezone);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(period || '') ? period : today.slice(0,7);
  const students = [...store.Students.values()].filter(item=>item.active !== false && canReadStudent(user,item));
  const ids = new Set(students.map(item=>item.id));
  const allSessions = [...store.Sessions.values()].filter(session=>!session.deleted && (user.role === 'admin' || user.role === 'teacher' && (session.teacherId === user.id || session.group === 'Semua kelas' || (user.groups||[]).includes(session.group)) || students.some(item=>inSession(item,session)))).sort((a,b)=>`${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  const sessions = allSessions.filter(session=>session.date === today);
  const records = [...store.Tests.values()].filter(test=>ids.has(test.studentId) && !test.deleted && test.date.startsWith(month));
  const data = { version:2,students:[],sessions,allSessions,attendance:{},attendanceBySession:{},tests:{},academic:{},psych:{},fitness:{},health:{},reports:{},assignments:[],submissions:[],accounts:[],settings,tolerance:settings.tolerance,period:month,today,now:timeFor(settings.timezone),timezone:settings.timezone,viewer:publicUser(user),lastSynced:new Date().toISOString(),scoreRecords:[],audit:[] };
  for(const item of students) {
    const completed = allSessions.filter(session=>session.date.startsWith(month)&&session.status==='closed'&&inSession(item,session));
    let present=0,late=0,izin=0,sakit=0,alfa=0;
    for(const session of completed) {
      const record=store.Attendance.get(`${session.id}:${item.id}`);
      if(record?.status==='hadir'&&record.approved){present++;if(record.late)late++;}
      else if(record?.status==='izin'&&record.approved)izin++;
      else if(record?.status==='sakit'&&record.approved)sakit++;
      else alfa++;
    }
    data.students.push({...item,present,late,izin,sakit,alfa,monthTotal:completed.length});
    const tests=records.filter(test=>test.studentId===item.id).sort((a,b)=>`${a.date}${a._at}`.localeCompare(`${b.date}${b._at}`));
    data.tests[item.id]=tests.filter(test=>test.category==='skd').map(test=>({...test,...test.scores}));
    data.academic[item.id]=Object.fromEntries(Object.keys(academicLabels).map(key=>[key,tests.filter(test=>test.category==='academic'&&test.component===key).map(normalizedScore)]));
    data.psych[item.id]=Object.fromEntries(Object.keys(psychLabels).map(key=>[key,tests.filter(test=>test.category==='psych'&&test.component===key).map(normalizedScore)]));
    data.fitness[item.id]=Object.fromEntries(Object.keys(fitnessLabels).map(key=>{const items=tests.filter(test=>test.category==='fitness'&&test.component===key);return [key,{raw:items.at(-1)?.raw??null,scores:items.map(normalizedScore),unit:key==='lari'?'m':key==='shuttle'?'detik':'kali',protocol:items.at(-1)?.protocol||'Skor pengajar'}];}));
    const health=[...store.Health.values()].filter(record=>record.studentId===item.id&&!record.deleted&&record.date.startsWith(month)).sort((a,b)=>`${a.date}${a._at}`.localeCompare(`${b.date}${b._at}`)).at(-1);
    data.health[item.id]=health||{height:null,weight:null,systolic:null,diastolic:null,date:null,note:'Belum ada pengukuran.'};
    const reportKey=`${item.id}:${month}`;
    let report=store.Reports.get(reportKey);
    if(!['admin','teacher'].includes(user.role)&&!report?.published)report=[...store.Reports.values()].filter(value=>value.archiveOf===reportKey&&value.published).sort((a,b)=>b.version-a.version)[0];
    data.reports[item.id]=report&&(user.role==='admin'||user.role==='teacher'||report.published)?report:{published:false,version:1,note:''};
  }
  for(const session of allSessions) {
    data.attendanceBySession[session.id]={};
    for(const item of students.filter(student=>inSession(student,session))) {
      const record=store.Attendance.get(`${session.id}:${item.id}`);
      data.attendanceBySession[session.id][item.id]=record||{status:session.status==='closed'?'alfa':'empty',time:'—',method:'—',approved:session.status==='closed',late:false};
    }
  }
  data.assignments=[...store.Assignments.values()].filter(item=>!item.deleted&&(user.role==='admin'||user.role==='teacher'&&((user.groups||[]).includes(item.group)||item.group==='Semua kelas')||students.some(student=>item.group==='Semua kelas'||student.group===item.group)));
  const assignmentIds=new Set(data.assignments.map(item=>item.id));
  data.submissions=[...store.Submissions.values()].filter(item=>ids.has(item.studentId)&&assignmentIds.has(item.assignmentId));
  if(user.role==='admin') {data.accounts=[...store.Users.values()].map(publicUser);data.audit=[...store.Audit.values()].slice(-60).reverse().map(item=>({at:item.at||item._at,actor:item.actor,action:item.action,target:item.target}));}
  if(user.role==='admin'||user.role==='teacher')data.scoreRecords=records;
  data.chart=[...new Set(records.filter(record=>record.category==='skd').map(record=>record.date))].sort().map(date=>({date,value:mean(records.filter(record=>record.category==='skd'&&record.date===date).map(record=>Object.values(record.scores).reduce((a,b)=>a+b,0)))}));
  return data;
}
export function buildReport(store,item,period) {
  const settings=settingsFor(store);
  const data=viewData(store,{id:'report-builder',role:'admin',name:'System',active:true},period);
  const student=data.students.find(value=>value.id===item.id);
  const format=value=>value===null||value===undefined?'—':Number(value).toLocaleString('id-ID',{maximumFractionDigits:1});
  const rows=(labels,source)=>Object.entries(labels).map(([key,label])=>{const score=mean(source[key]||[]);return [label,format(score),score,labelOf(score,settings)];});
  const tests=data.tests[item.id]; const skd={twk:mean(tests.map(test=>test.twk)),tiu:mean(tests.map(test=>test.tiu)),tkp:mean(tests.map(test=>test.tkp))};
  const total=tests.length?skd.twk+skd.tiu+skd.tkp:null;
  const profile=settings.skd;
  const health=data.health[item.id];
  const tasks=data.assignments.filter(task=>(task.group==='Semua kelas'||task.group===item.group)&&task.due.startsWith(period));
  const attendance=student.monthTotal?student.present/student.monthTotal*100:null;
  const sections=[
    {title:'AKADEMIK',rows:rows(academicLabels,data.academic[item.id])},
    {title:'SELEKSI KOMPETENSI DASAR',rows:['twk','tiu','tkp'].map(key=>[key.toUpperCase(),format(skd[key]),skd[key]===null?null:skd[key]/profile[`max${key[0].toUpperCase()+key.slice(1)}`]*100,skd[key]===null?'Belum diisi':skd[key]>=profile[key]?'Memenuhi acuan latihan':'Perlu peningkatan']),note:`Total rata-rata: ${format(total)} / ${profile.maxTwk+profile.maxTiu+profile.maxTkp} · ${profile.name} · ${tests.length} tes`},
    {title:'PSIKOTES',rows:rows(psychLabels,data.psych[item.id])},
    {title:'PERKEMBANGAN FISIK',rows:Object.entries(fitnessLabels).map(([key,label])=>{const value=data.fitness[item.id][key];const score=mean(value.scores);return [label,value.raw===null?'—':`${format(value.raw)} ${value.unit}`,score,labelOf(score,settings)];})},
    {title:'TUGAS',rows:tasks.length?tasks.map(task=>{const submission=data.submissions.find(value=>value.assignmentId===task.id&&value.studentId===item.id);return [task.name,submission?.status==='verified'?'Dikumpulkan':submission?.status==='submitted'?'Menunggu verifikasi':'Belum dikumpulkan',submission?.score??null,submission?.note||''];}):[['Belum ada tugas bulan ini','—',null,'Belum diisi']]},
    {title:'KESEHATAN',rows:[['Tinggi badan',health.height===null?'—':`${format(health.height)} cm`,null,'Pengukuran terakhir'],['Berat badan',health.weight===null?'—':`${format(health.weight)} kg`,null,health.date||'Belum diisi'],['Indeks Massa Tubuh',health.height&&health.weight?format(health.weight/(health.height/100)**2):'—',null,'Interpretasi oleh pemeriksa'],['Tekanan darah',health.systolic===null?'—':`${health.systolic}/${health.diastolic} mmHg`,null,health.note||'Catatan pemeriksa']]},
    {title:'KEHADIRAN',rows:[['Hadir',`${student.present} sesi`,null,attendance===null?'Belum ada sesi selesai':`${format(attendance)}% · ${disciplineLabel(attendance,settings)}`],['Izin / Sakit / Alfa',`${student.izin} / ${student.sakit} / ${student.alfa}`,null,`${student.monthTotal} sesi selesai`],['Terlambat',`${student.late} sesi`,null,'Tetap dihitung hadir']]}
  ];
  return {student:{id:student.id,name:student.name,group:student.group,target:student.target},period,sections,settings:{name:settings.name,location:settings.location,gradeA:settings.gradeA,gradeB:settings.gradeB,gradeC:settings.gradeC,skd:profile},summary:{skd:total,attendance,academic:mean(Object.values(data.academic[item.id]).map(mean).filter(value=>value!==null)),physical:mean(Object.values(data.fitness[item.id]).map(value=>mean(value.scores)).filter(value=>value!==null))},createdAt:new Date().toISOString()};
}
