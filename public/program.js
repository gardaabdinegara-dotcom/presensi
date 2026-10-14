const params = new URLSearchParams(location.search);
const design = 'komando';
const mode = params.get('mode') === 'real' ? 'real' : 'demo';
let csrfToken = '';
let busy = false;
document.documentElement.dataset.design = design;
const iconPaths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clipboard: '<rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 14 2 2 4-4"/>',
  chart: '<path d="M4 4v16h16M8 14l4-5 4 3 4-7"/>',
  document: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8m-8 4h5"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 5a5 5 0 0 1 3 5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-13 4h2m4 0h2"/>',
  settings: '<path d="m12 3 2 3 4-.2.2 4 3 2-3 2-.2 4-4-.2-2 3-2-3-4 .2-.2-4-3-2 3-2 .2-4 4 .2z"/><circle cx="12" cy="12" r="3"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  up: '<path d="m7 14 5-5 5 5M12 9v10"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-12 9a3 3 0 0 0 6 0"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  qr: '<path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><path d="M14 14h3v3h-3m4 2h1"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  print: '<path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7zM17 11h.01"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
  book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1m0-15c3-2 6-2 9-1v15c-3-1-6-1-9 1z"/>',
  run: '<circle cx="15" cy="4" r="2"/><path d="m12 7-3 4 4 3-3 7m2-14 4 5h4M9 11H4m9 3h4l3 6"/>',
  star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  heart: '<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-5 5 8 15 8 15S25 10 20 5z"/><path d="M4 12h5l2-4 2 8 2-4h5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  reset: '<path d="M3 11a9 9 0 1 1 2 7M3 5v6h6"/>',
  location: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0"/><circle cx="12" cy="10" r="2"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.grid}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const number = (value, digits = 0) => value === null || value === undefined || !Number.isFinite(Number(value)) ? '—' : Number(value).toLocaleString('id-ID', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const average = values => values.length ? values.reduce((sum, value) => sum + Number(value), 0) / values.length : null;
const grade = value => value === null ? '—' : value >= (data?.settings?.gradeA ?? 80) ? 'A' : value >= (data?.settings?.gradeB ?? 60) ? 'B' : value >= (data?.settings?.gradeC ?? 40) ? 'C' : 'D';
const gradeLabel = value => value === null ? 'Belum diisi' : value >= (data?.settings?.gradeA ?? 80) ? 'Sangat baik' : value >= (data?.settings?.gradeB ?? 60) ? 'Baik' : value >= (data?.settings?.gradeC ?? 40) ? 'Cukup' : 'Perlu pembinaan';
const storageKey = 'gan-program-demo-v2';
const names = ['Azzam Pratama','Nadia Putri','Rizky Ramadhan','Alya Maharani','Fahri Saputra','Salsa Nabila','Ilham Maulana','Dinda Azzahra','Rafi Alfarizi','Naila Safitri','Ardiansyah Putra','Kirana Amalia','Bagas Aditya','Zahra Anindya','Fikri Alamsyah','Salma Aulia','Dimas Prakoso','Tiara Maharani','Fauzan Hakim','Nisa Rahmawati','Reza Firmansyah','Aisyah Kirana','Hafiz Alfaruq','Anisa Lestari','Iqbal Fadillah','Citra Anggraini','Farhan Akbar','Amira Zahira'];
const academicLabels = { numerik: 'Penalaran Numerik', indonesia: 'Bahasa Indonesia', inggris: 'Bahasa Inggris', ipu: 'Ilmu Pengetahuan Umum' };
const psychLabels = { kecerdasan: 'Kecerdasan', kecermatan: 'Kecermatan', kepribadian: 'Kepribadian' };
const fitnessLabels = { lari: 'Lari 12 menit', pullup: 'Pull-up', situp: 'Sit-up', pushup: 'Push-up', shuttle: 'Shuttle run', chinning: 'Chinning' };
const statusLabels = { hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alfa: 'Alfa', pending: 'Menunggu', empty: 'Belum tercatat' };
function seedData() {
  const students = names.map((name, index) => ({ id: `GAN-${String(index + 1).padStart(3, '0')}`, name, target: ['Kedinasan','Polri','TNI'][index % 3], group: index < 16 ? 'Intensif A' : 'Intensif B', gender: index % 2 ? 'P' : 'L', present: [19,20,18,20,17,19,20][index % 7], late: index % 5 === 0 ? 1 : 0 }));
  const sessions = [
    { id: 's1', name: 'Latihan Fisik Pagi', type: 'Fisik', group: 'Semua kelas', start: '07:00', end: '08:30', teacher: 'Coach Dimas', status: 'active', icon: 'run' },
    { id: 's2', name: 'Tryout SKD #12', type: 'SKD', group: 'Intensif A', start: '09:00', end: '10:40', teacher: 'Kak Rani', status: 'upcoming', icon: 'chart' },
    { id: 's3', name: 'Bahasa Inggris', type: 'Akademik', group: 'Intensif B', start: '11:00', end: '12:00', teacher: 'Kak Rani', status: 'upcoming', icon: 'book' },
    { id: 's4', name: 'Latihan Psikotes', type: 'Psikotes', group: 'Semua kelas', start: '15:30', end: '17:00', teacher: 'Coach Dimas', status: 'upcoming', icon: 'star' }
  ];
  const attendance = {};
  const tests = {};
  const academic = {};
  const psych = {};
  const fitness = {};
  const health = {};
  const reports = {};
  students.forEach((student, index) => {
    attendance[student.id] = { status: index < 20 ? 'hadir' : index < 23 ? 'pending' : index < 25 ? 'izin' : index === 25 ? 'sakit' : index === 26 ? 'alfa' : 'empty', time: index < 23 ? (index % 5 === 0 ? '07:12' : '06:55') : '—', method: index < 23 ? ['QR sesi','Mandiri','Pengajar'][index % 3] : 'Pengajar', late: index < 20 && index % 5 === 0, approved: index < 20 || index > 22 };
    const base = index === 0 ? { twk: 95, tiu: 110, tkp: 175 } : { twk: 65 + (index * 7) % 56, tiu: 75 + (index * 9) % 66, tkp: 140 + (index * 5) % 66 };
    tests[student.id] = [-1,0,1].map((offset, position) => ({ date: `2026-10-${['02','06','10'][position]}`, twk: base.twk + offset * 10, tiu: base.tiu + offset * 8, tkp: base.tkp + offset * 8 }));
    academic[student.id] = Object.fromEntries(Object.keys(academicLabels).map((key, position) => [key, [70 + (index + position * 3) % 15, 76 + (index + position * 4) % 15, 82 + (index + position * 2) % 14]]));
    psych[student.id] = { kecerdasan: [70 + index % 12,78 + index % 12], kecermatan: [65 + index % 17,75 + index % 15], kepribadian: [76 + index % 12,82 + index % 10] };
    fitness[student.id] = { lari: { raw: 2900 + index * 10, scores: [72 + index % 10,78 + index % 10], unit: 'm' }, pullup: { raw: index % 2 ? null : 12 + index % 5, scores: index % 2 ? [] : [65 + index % 12,75 + index % 12], unit: 'kali' }, situp: { raw: 40 + index % 8, scores: [76 + index % 9,84 + index % 9], unit: 'kali' }, pushup: { raw: 38 + index % 8, scores: [72 + index % 8,80 + index % 8], unit: 'kali' }, shuttle: { raw: 18.4 - (index % 6) / 10, scores: [78 + index % 10,84 + index % 10], unit: 'detik' }, chinning: { raw: index % 2 ? 36 + index % 12 : null, scores: index % 2 ? [70 + index % 12,80 + index % 12] : [], unit: 'kali' } };
    health[student.id] = { height: index % 2 ? 163 + index % 8 : 173 + index % 8, weight: index % 2 ? 55.2 + index % 8 : 64.8 + index % 8, systolic: 116 + index % 5, diastolic: 75 + index % 5, date: '10 Oktober 2026', note: 'Pengukuran rutin. Catatan lanjutan diisi oleh pemeriksa.' };
    reports[student.id] = { published: index % 4 === 0, version: 1 };
  });
  return { version: 1, students, sessions, attendance, tests, academic, psych, fitness, health, reports, tolerance: 10, attendanceBySession: {} };
}
let data;
try { const saved = JSON.parse(localStorage.getItem(storageKey)); data = saved?.version === 1 && Array.isArray(saved.students) && saved.students.length ? saved : seedData(); } catch { data = seedData(); }
let page = 'dashboard';
let role = 'admin';
let category = 'skd';
let selectedStudent = data.students[0].id;
let selectedSession = data.sessions.find(session => session.status === 'active')?.id || data.sessions[0].id;
let query = '';
let attendanceFilter = 'all';
let toastTimer;
const isEditor = () => role === 'admin' || role === 'teacher';
const roles = { admin: 'Admin', teacher: 'Pengajar', student: 'Siswa', parent: 'Orang tua' };
const pageLabels = { dashboard: 'Ringkasan', attendance: 'Presensi', grades: 'Nilai & Tes', reports: 'Rapor Bulanan', students: 'Data Siswa', schedule: 'Jadwal Kegiatan', settings: 'Pengaturan' };
const navItems = [ ['dashboard','grid','Ringkasan'], ['attendance','clipboard','Presensi'], ['grades','chart','Nilai & Tes'], ['reports','document','Rapor Bulanan'], ['students','users','Data Siswa'], ['schedule','calendar','Jadwal'], ['settings','settings','Pengaturan'] ];
const activeSession = () => (data.allSessions || data.sessions).find(session => session.id === selectedSession) || data.sessions[0];
const getAttendance = () => data.attendanceBySession[selectedSession] || {};
const student = () => data.students.find(item => item.id === selectedStudent) || data.students[0];
const initials = name => name.split(' ').slice(0,2).map(word => word[0]).join('');
const avatar = (item, size = '') => `<span class="avatar ${size} color-${Number(item.id.replace(/\D/g, '')) % 6}">${esc(initials(item.name))}</span>`;
const badge = (label, tone = '') => `<span class="badge ${tone}">${esc(label)}</span>`;
const button = (label, action, iconName = '', style = 'primary') => `<button class="button ${style}" data-action="${esc(action)}">${iconName ? icon(iconName) : ''}<span>${esc(label)}</span></button>`;

function toast(message) { const element = document.getElementById('toast'); element.textContent = message; element.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove('visible'), 4200); }

function getAcademic(id) { return average(Object.values(data.academic[id] || {}).map(values => average(values)).filter(value => value !== null)); }
function getPhysical(id) { return average(Object.values(data.fitness[id] || {}).map(item => average(item.scores)).filter(value => value !== null)); }

function classSkd() { return average(data.students.map(item => getSkd(item.id).total).filter(value => value !== null)); }

function brand(compact = false) { return `<div class="brand ${compact ? 'compact' : ''}"><span class="brand-emblem">${icon('shield')}<b>G</b></span><span class="brand-type">GARDA<span>ABDI NEGARA</span><small>LEARN. TRAIN. SERVE.</small></span></div>`; }

function sidebar() { return `<aside class="sidebar">${brand()}<div class="workspace"><span class="workspace-icon">${icon('location')}</span><div>Pusat Latihan GAN<small>Satu lokasi · Intensif 2026</small></div>${icon('down')}</div><div class="nav-caption">RUANG KERJA</div><nav aria-label="Navigasi utama">${allowedNav().map(([key, iconName, label]) => `<button data-page="${key}" class="nav-item ${page === key ? 'active' : ''}" ${page === key ? 'aria-current="page"' : ''}>${icon(iconName)}<span>${label}</span>${key === 'attendance' && attendanceCounts().pending ? `<em>${attendanceCounts().pending}</em>` : ''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="sidebar-callout">${icon('shield')}<b>Latihan hari ini,<br>pengabdian esok hari.</b><span>Setiap langkah berarti.</span></div><div class="sidebar-user"><span class="avatar admin-avatar">${role === 'admin' ? 'AD' : role === 'teacher' ? 'CD' : initials(data.students[0].name)}</span><div>${role === 'admin' ? 'Admin GAN' : role === 'teacher' ? 'Coach Dimas' : role === 'student' ? data.students[0].name : 'Wali Azzam'}<small>${roles[role]}</small></div><i class="online-dot"></i></div></div></aside>`; }



function render() {
  const renderers = { dashboard: renderDashboard, attendance: renderAttendance, grades: renderGrades, reports: renderReport, students: renderStudents, schedule: renderSchedule, settings: renderSettings, accounts: renderAccounts };
  document.title = `${pageLabels[page]} — Garda Abdi Negara${mode === 'demo' ? ' · Contoh' : ''}`;
  document.getElementById('app').innerHTML = `<div class="app-layout ${design}">${sidebar()}<div class="main-column">${header()}<main id="main-content" class="main-content" tabindex="-1">${renderers[page]()}</main><footer class="app-footer"><span>GARDA ABDI NEGARA <i>© 2026</i></span><span class="simulation-label"><i></i> Data simulasi · Preview desain</span></footer></div>${bottomNav()}</div>`;
  document.getElementById('global-search')?.addEventListener('keydown', event => { if (event.key === 'Enter') { const term = event.target.value.toLowerCase().trim(); const nav = navItems.find(item => item[2].toLowerCase().includes(term)); if (nav && allowedNav().some(item => item[0] === nav[0])) navigate(nav[0]); else if (isEditor()) { query = term; page = 'students'; render(); } else navigate('reports'); } });
  document.querySelectorAll('[data-search]').forEach(input => input.addEventListener('input', event => { const position = event.target.selectionStart; const id = event.target.id; query = event.target.value; render(); const next = document.getElementById(id); next?.focus(); next?.setSelectionRange(position, position); }));
  document.getElementById('session-select')?.addEventListener('change', event => { selectedSession = event.target.value; query = ''; attendanceFilter = 'all'; render(); });
  connectProgramControls();
  document.getElementById('report-student')?.addEventListener('change', event => { selectedStudent = event.target.value; render(); });
}
function navigate(next) { page = next; query = ''; render(); window.scrollTo({ top: 0, behavior: 'instant' }); document.getElementById('main-content')?.focus({ preventScroll: true }); }
function pageIntro(eyebrow, title, description, actions = '') { return `<div class="page-intro"><div><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></div><div class="intro-actions">${actions}</div></div>`; }
function metricCard(label, value, suffix, note, iconName, tone = '') { return `<article class="metric-card ${tone}"><div class="metric-top"><span>${esc(label)}</span><span class="metric-icon">${icon(iconName)}</span></div><div class="metric-value">${value}<small>${esc(suffix)}</small></div><div class="metric-note">${esc(note)}</div><span class="metric-decoration" aria-hidden="true"></span></article>`; }


function sectionHeading(title, subtitle = '', action = '') { return `<div class="section-heading"><div><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>${action}</div>`; }



function progressPanel() { const fields = [ ['Akademik',average(data.students.map(item => getAcademic(item.id))),'book'], ['Psikotes',average(data.students.map(item => average(Object.values(data.psych[item.id] || {}).map(value => average(value)).filter(value => value !== null)))),'star'], ['Fisik',average(data.students.map(item => getPhysical(item.id))),'run'] ]; return `<section class="panel coverage-panel">${sectionHeading('Kesiapan setiap bidang','Rata-rata skor latihan kelas')}${fields.map(([label, score, iconName]) => `<div class="field-progress"><span class="field-icon">${icon(iconName)}</span><div><span>${label}<b>${score === null ? '—' : number(score)}<small>/100</small></b></span><div class="progress-track"><i style="width:${score || 0}%"></i></div></div></div>`).join('')}<div class="panel-note">${icon('shield')} Predikat mengikuti rubrik internal GAN.</div></section>`; }











function modal(title, subtitle, content, wide = false) { const dialog = document.getElementById('app-dialog'); dialog.className = `app-dialog ${wide ? 'wide-dialog' : ''}`; dialog.innerHTML = `<div class="dialog-heading"><div><span class="eyebrow">GARDA ABDI NEGARA</span><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div><button class="icon-button" data-action="close-dialog" aria-label="Tutup dialog">${icon('close')}</button></div>${content}`; dialog.showModal(); }
function closeModal() { document.getElementById('app-dialog').close(); }
function studentOptions() { return data.students.map(item=>`<option value="${item.id}" ${item.id === selectedStudent ? 'selected' : ''}>${esc(item.name)} · ${item.id}</option>`).join(''); }
function field(label,name,type='text',extra='') { return `<label class="form-field">${esc(label)}<input name="${name}" type="${type}" ${extra} required></label>`; }

function qrSvg() { const size=25; let blocks=''; const finder=(x,y)=>`<rect x="${x}" y="${y}" width="7" height="7" fill="currentColor"/><rect x="${x+1}" y="${y+1}" width="5" height="5" fill="white"/><rect x="${x+2}" y="${y+2}" width="3" height="3" fill="currentColor"/>`; for(let y=0;y<size;y++)for(let x=0;x<size;x++){if((x<8&&y<8)||(x>16&&y<8)||(x<8&&y>16))continue;if((x*7+y*11+x*y)%5<2)blocks+=`<rect x="${x}" y="${y}" width="1" height="1"/>`;}return `<svg viewBox="-2 -2 29 29" role="img" aria-label="Ilustrasi QR sesi untuk preview, bukan kode presensi aktif"><rect x="-2" y="-2" width="29" height="29" fill="white"/><g fill="currentColor">${finder(0,0)}${finder(18,0)}${finder(0,18)}${blocks}</g></svg>`; }


const previewSeed = seedData;
