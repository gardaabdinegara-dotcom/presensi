const designs = {
  komando: { name: 'Komando', tag: 'OPERASIONAL & TEGAS', description: 'Dashboard operasional yang tegas, ringkas, dan berfokus pada kegiatan hari ini.', detail: 'Navy dan hijau dengan sidebar tegas, ringkasan kegiatan, serta verifikasi presensi sebagai aksi utama.', colors: ['#102b36','#1a9b76','#edf4f2','#f1b95d'] },
  akademi: { name: 'Akademi', tag: 'TERANG & TERUKUR', description: 'Ruang belajar yang terang, dengan perkembangan siswa sebagai pusat perhatian.', detail: 'Biru dan putih dengan panel progres, kalender belajar, serta navigasi ringan untuk penggunaan sehari-hari.', colors: ['#3264dc','#dce8ff','#ffffff','#92a9dd'] },
  patriot: { name: 'Patriot', tag: 'HANGAT & BERKARAKTER', description: 'Pendekatan editorial yang hangat, dengan rapor dan perjalanan siswa di depan.', detail: 'Marun dan krem dengan navigasi atas di desktop, tipografi editorial, dan kartu rapor yang menonjol.', colors: ['#812b3a','#c5a362','#f7f3e9','#2e3436'] }
};
let selected = new URLSearchParams(location.search).get('design') || 'komando';
if (!designs[selected]) selected = 'komando';
let device = window.innerWidth <= 740 ? 'mobile' : 'desktop';
const frame = document.getElementById('app-frame');
const stage = document.getElementById('preview-stage');
const dialog = document.getElementById('compare-dialog');
function selectDesign(key) {
  selected = key;
  document.querySelectorAll('[data-design]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.design === key)));
  frame.src = `/design-app.html?design=${key}`;
  frame.title = `Preview ${designs[key].name} — Garda Abdi Negara`;
  document.getElementById('design-description').textContent = designs[key].description;
  document.getElementById('full-link').href = `/design-app.html?design=${key}`;
  history.replaceState({}, '', `/designs.html?design=${key}`);
}
function selectDevice(value) {
  device = value;
  stage.className = `preview-stage ${value}`;
  document.querySelectorAll('[data-device]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.device === value)));
}
document.querySelectorAll('[data-design]').forEach(button => button.addEventListener('click', () => selectDesign(button.dataset.design)));
document.querySelectorAll('[data-device]').forEach(button => button.addEventListener('click', () => selectDevice(button.dataset.device)));
document.getElementById('compare-button').addEventListener('click', () => {
  if (!document.getElementById('compare-grid').children.length) {
    document.getElementById('compare-grid').innerHTML = Object.entries(designs).map(([key, d], index) => `<article class="compare-card"><div class="mini-screen"><iframe src="/app.html?design=${key}&thumbnail=1" title="Ringkasan desain ${d.name}" tabindex="-1" loading="lazy"></iframe></div><div class="compare-copy"><small>0${index + 1} / ${d.tag}</small><h3>${d.name}</h3><p>${d.detail}</p><div class="palette" aria-hidden="true">${d.colors.map(color => `<i style="background:${color}"></i>`).join('')}</div><button data-pick="${key}">Coba desain ${d.name}<span>↗</span></button></div></article>`).join('');
    document.querySelectorAll('[data-pick]').forEach(button => button.addEventListener('click', () => { selectDesign(button.dataset.pick); dialog.close(); }));
  }
  dialog.showModal();
});
document.getElementById('close-compare').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
selectDesign(selected);
selectDevice(device);
