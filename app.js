// Master Data Pilihan Sesuai Form Screening PKM 2026 (Teknologi Informasi)
const MASTER_JURUSAN = [
  'Teknologi Informasi',
  'Teknik Elektro',
  'Teknik Mesin',
  'Teknik Sipil',
  'Teknik Kimia',
  'Administrasi Niaga',
  'Akuntansi'
];

const MASTER_PKM = [
  { code: 'K', label: 'PKM-K (Kewirausahaan)' },
  { code: 'KC', label: 'PKM-KC (Karsa Cipta)' },
  { code: 'RE', label: 'PKM-RE (Riset Eksakta)' },
  { code: 'PM', label: 'PKM-PM (Pengabdian Masyarakat)' },
  { code: 'PI', label: 'PKM-PI (Penerapan Iptek)' },
  { code: 'KI', label: 'PKM-KI (Karya Inovatif)' }
];

// Palet Warna Kontras Tinggi untuk Panggung
const COLORS_JURUSAN = [
  '#0284c7', // Sky Blue (Teknologi Informasi)
  '#2563eb', // Royal Blue (Teknik Elektro)
  '#4f46e5', // Indigo (Teknik Mesin)
  '#0d9488', // Teal (Teknik Sipil)
  '#059669', // Emerald (Teknik Kimia)
  '#d97706', // Amber (Administrasi Niaga)
  '#e11d48'  // Rose (Akuntansi)
];

const COLORS_PKM = [
  '#f59e0b', // Kuning Emas (PKM-K)
  '#06b6d4', // Biru Cyan (PKM-KC)
  '#8b5cf6', // Ungu Elektrik (PKM-RE)
  '#ec4899', // Coral Rose (PKM-PM)
  '#10b981', // Hijau Mint (PKM-PI)
  '#f97316'  // Sunset Orange (PKM-KI)
];

// State Aplikasi
let state = {
  sheetId: localStorage.getItem('sarasehan_pkm_sheet_id') || '',
  pollIntervalMs: parseInt(localStorage.getItem('sarasehan_poll_interval') || '3000'),
  isDemoMode: false,
  pollTimerId: null,
  demoTimerId: null,
  lastRowCount: 0,
  isFetching: false,
  chartJurusan: null,
  chartPkm: null,
  simulatedRows: [],
  theme: localStorage.getItem('sarasehan_theme') || 'light' // Default LIGHT THEME
};

// Inisialisasi Aplikasi Saat Halaman Selesai Dimuat
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  initCharts();
  setupEventListeners();

  if (state.sheetId) {
    // Mulai polling Google Sheet otomatis jika ID sudah tersimpan
    startPolling();
  } else {
    // TAMPILAN KOSONG MURNI (0 RESPONDEN) - JANGAN AKTIFKAN DEMO OTOMATIS!
    updateUIWithRows([]);
    const statusText = document.getElementById('status-text');
    if (statusText) statusText.innerText = 'Klik Setup Sheet untuk hubungkan';
  }
});

// Setup Chart.js
function initCharts() {
  Chart.register(ChartDataLabels);

  const isDark = state.theme === 'dark';
  const sliceBorderColor = isDark ? '#121826' : '#ffffff';

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeOutQuart'
    },
    cutout: '62%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return ` ${label}: ${value} orang (${percentage}%)`;
          }
        }
      },
      datalabels: {
        color: '#ffffff',
        font: {
          weight: 'bold',
          size: 11
        },
        formatter: (value, ctx) => {
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
          if (total === 0) return '';
          const pct = ((value / total) * 100).toFixed(0);
          return pct > 5 ? `${pct}%` : '';
        }
      }
    }
  };

  // Chart 1: Jurusan
  const ctxJurusan = document.getElementById('chart-jurusan').getContext('2d');
  state.chartJurusan = new Chart(ctxJurusan, {
    type: 'doughnut',
    data: {
      labels: MASTER_JURUSAN,
      datasets: [{
        data: new Array(MASTER_JURUSAN.length).fill(0),
        backgroundColor: COLORS_JURUSAN,
        borderColor: sliceBorderColor,
        borderWidth: 3,
        hoverOffset: 12
      }]
    },
    options: commonOptions
  });

  // Chart 2: PKM
  const ctxPkm = document.getElementById('chart-pkm').getContext('2d');
  state.chartPkm = new Chart(ctxPkm, {
    type: 'doughnut',
    data: {
      labels: MASTER_PKM.map(p => p.label),
      datasets: [{
        data: new Array(MASTER_PKM.length).fill(0),
        backgroundColor: COLORS_PKM,
        borderColor: sliceBorderColor,
        borderWidth: 3,
        hoverOffset: 12
      }]
    },
    options: commonOptions
  });
}

// Setup Event Listeners
function setupEventListeners() {
  const modal = document.getElementById('modal-config');
  const btnConfig = document.getElementById('btn-config');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnSaveConfig = document.getElementById('btn-save-config');
  const inputSheet = document.getElementById('input-sheet-url');
  const selectInterval = document.getElementById('select-poll-interval');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const btnDemo = document.getElementById('btn-demo');
  const btnLoadDemo = document.getElementById('btn-load-demo-data');
  const btnTheme = document.getElementById('btn-theme');
  const btnSyncNow = document.getElementById('btn-sync-now');
  const btnClearData = document.getElementById('btn-clear-data');

  // Input default
  inputSheet.value = state.sheetId;
  selectInterval.value = state.pollIntervalMs.toString();

  btnConfig.addEventListener('click', () => {
    modal.classList.add('active');
  });

  btnCloseModal.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  btnSaveConfig.addEventListener('click', () => {
    const rawVal = inputSheet.value.trim();
    let extractedId = rawVal;
    
    // Ekstraksi ID dari URL Google Sheets
    const match = rawVal.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      extractedId = match[1];
    }

    if (extractedId) {
      state.sheetId = extractedId;
      localStorage.setItem('sarasehan_pkm_sheet_id', extractedId);
      state.pollIntervalMs = parseInt(selectInterval.value);
      localStorage.setItem('sarasehan_poll_interval', state.pollIntervalMs.toString());
      modal.classList.remove('active');
      setDemoMode(false); // Matikan demo mode
      startPolling();
    } else {
      alert('Masukkan link atau ID Google Spreadsheet yang valid!');
    }
  });

  // Tombol Paksa Sinkron Sekarang
  if (btnSyncNow) {
    btnSyncNow.addEventListener('click', () => {
      if (state.isDemoMode) {
        setDemoMode(false);
      }
      if (state.sheetId) {
        triggerToast('Menarik data terbaru dari Google Sheets...');
        fetchSpreadsheetData();
      } else {
        alert('Harap hubungkan Google Sheet terlebih dahulu via tombol "Setup Sheet".');
        modal.classList.add('active');
      }
    });
  }

  // Tombol Reset / Kosongkan Tampilan
  if (btnClearData) {
    btnClearData.addEventListener('click', () => {
      setDemoMode(false);
      state.lastRowCount = 0;
      updateUIWithRows([]);
      const statusText = document.getElementById('status-text');
      if (statusText) statusText.innerText = 'Data berhasil dikosongkan (0)';
      triggerToast('Tampilan berhasil direset ke 0 responden.');
      modal.classList.remove('active');
    });
  }

  btnFullscreen.addEventListener('click', toggleFullscreen);

  // Hotkey F11 atau F
  window.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
      if (document.activeElement.tagName !== 'INPUT') {
        toggleFullscreen();
      }
    }
  });

  btnDemo.addEventListener('click', () => {
    setDemoMode(!state.isDemoMode);
  });

  btnLoadDemo.addEventListener('click', () => {
    modal.classList.remove('active');
    setDemoMode(true);
  });

  // Intro Screen & Presentation Start Logic
  const introScreen = document.getElementById('intro-screen');
  const btnStart = document.getElementById('btn-start');
  const btnIntro = document.getElementById('btn-intro');
  const btnIntroFullscreen = document.getElementById('btn-intro-fullscreen');

  function startPresentation() {
    if (introScreen) {
      introScreen.classList.add('hidden');
    }

    // Trigger staggered entrance animation pada kartu-kartu dashboard
    const mainEl = document.querySelector('.dashboard-main');
    if (mainEl) {
      mainEl.classList.remove('animate-in');
      void mainEl.offsetWidth; // Reflow CSS animation
      mainEl.classList.add('animate-in');
    }

    // Trigger animasi putaran awal Chart.js yang dramatis
    if (state.chartJurusan) {
      state.chartJurusan.reset();
      state.chartJurusan.update({
        duration: 1200,
        easing: 'easeOutQuart'
      });
    }
    if (state.chartPkm) {
      state.chartPkm.reset();
      state.chartPkm.update({
        duration: 1200,
        easing: 'easeOutQuart'
      });
    }

    // Animasi angka count-up total responden
    animateTotalCountUp();
  }

  if (btnStart) {
    btnStart.addEventListener('click', startPresentation);
  }

  if (btnIntroFullscreen) {
    btnIntroFullscreen.addEventListener('click', toggleFullscreen);
  }

  if (btnIntro) {
    btnIntro.addEventListener('click', () => {
      if (introScreen) {
        introScreen.classList.remove('hidden');
      }
    });
  }

  // Hotkey Space atau Enter saat di layar Intro
  window.addEventListener('keydown', (e) => {
    if (introScreen && !introScreen.classList.contains('hidden')) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        startPresentation();
      }
    }
  });

  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      applyTheme(newTheme);
    });
  }
}

// Animasi Count-Up Total Responden saat Start
function animateTotalCountUp() {
  const el = document.getElementById('count-total');
  if (!el) return;
  const target = state.lastRowCount || (state.simulatedRows ? state.simulatedRows.length : 0);
  if (target === 0) {
    el.innerText = '0';
    return;
  }

  const duration = 1200;
  const startTime = performance.now();

  function updateCount(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const currentVal = Math.floor(easeProgress * target);
    el.innerText = currentVal.toLocaleString('id-ID');

    if (progress < 1) {
      requestAnimationFrame(updateCount);
    } else {
      el.innerText = target.toLocaleString('id-ID');
    }
  }
  requestAnimationFrame(updateCount);
}

// Handler Tema (Light & Dark)
function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('sarasehan_theme', theme);
  const icon = document.getElementById('theme-btn-icon');
  const label = document.getElementById('theme-btn-label');

  if (theme === 'dark') {
    document.body.classList.add('theme-dark');
    if (icon) icon.innerText = '☀️';
    if (label) label.innerText = 'Light';
  } else {
    document.body.classList.remove('theme-dark');
    if (icon) icon.innerText = '🌙';
    if (label) label.innerText = 'Dark';
  }

  // Update border chart agar kontras sempurna dengan background card
  const sliceBorderColor = theme === 'dark' ? '#121826' : '#ffffff';
  if (state.chartJurusan) {
    state.chartJurusan.data.datasets[0].borderColor = sliceBorderColor;
    state.chartJurusan.update();
  }
  if (state.chartPkm) {
    state.chartPkm.data.datasets[0].borderColor = sliceBorderColor;
    state.chartPkm.update();
  }
}

// Mode Demo / Simulasi (HANYA AKTIF JIKA DIKLIK MANUAL)
function setDemoMode(enable) {
  state.isDemoMode = enable;
  const btnDemo = document.getElementById('btn-demo');
  const label = document.getElementById('demo-btn-label');
  const statusText = document.getElementById('status-text');

  // Bersihkan semua timer terlebih dahulu
  if (state.demoTimerId) {
    clearInterval(state.demoTimerId);
    state.demoTimerId = null;
  }
  if (state.pollTimerId) {
    clearInterval(state.pollTimerId);
    state.pollTimerId = null;
  }

  if (enable) {
    if (btnDemo) {
      btnDemo.classList.add('btn-primary');
      btnDemo.classList.remove('btn-secondary');
    }
    if (label) label.innerText = 'Demo: Aktif';
    if (statusText) statusText.innerText = 'Mode Simulasi Demo';
    generateDemoData();
    updateUIWithRows(state.simulatedRows);
    
    // Auto-tambah 1 respon tiap 6 detik HANYA di mode demo
    state.demoTimerId = setInterval(() => {
      if (state.isDemoMode) {
        addRandomDemoResponse();
      }
    }, 6000);
  } else {
    if (btnDemo) {
      btnDemo.classList.remove('btn-primary');
      btnDemo.classList.add('btn-secondary');
    }
    if (label) label.innerText = 'Demo: Off';
    state.simulatedRows = [];

    if (state.sheetId) {
      startPolling();
    } else {
      updateUIWithRows([]);
      if (statusText) statusText.innerText = 'Klik Setup Sheet untuk hubungkan';
    }
  }
}

// Generate Realistic Demo Data
function generateDemoData() {
  state.simulatedRows = [];
  const baseCount = 52;
  
  // Bobot distribusi realistis (Teknologi Informasi tertinggi)
  const jurusanWeights = [
    { name: 'Teknologi Informasi', weight: 35 },
    { name: 'Teknik Elektro', weight: 18 },
    { name: 'Teknik Mesin', weight: 14 },
    { name: 'Teknik Sipil', weight: 12 },
    { name: 'Teknik Kimia', weight: 8 },
    { name: 'Administrasi Niaga', weight: 7 },
    { name: 'Akuntansi', weight: 6 }
  ];

  const pkmWeights = [
    { code: 'K', weight: 32 },
    { code: 'KC', weight: 26 },
    { code: 'RE', weight: 18 },
    { code: 'PM', weight: 12 },
    { code: 'PI', weight: 8 },
    { code: 'KI', weight: 4 }
  ];

  for (let i = 0; i < baseCount; i++) {
    state.simulatedRows.push({
      nama: `Mahasiswa Demo ${i + 1}`,
      jurusan: getWeightedRandom(jurusanWeights).name,
      pkm: getWeightedRandom(pkmWeights).code
    });
  }
}

function addRandomDemoResponse() {
  const pkmCodes = ['K', 'KC', 'RE', 'PM', 'PI', 'KI'];
  const newRow = {
    nama: `Mahasiswa Baru #${state.simulatedRows.length + 1}`,
    jurusan: MASTER_JURUSAN[Math.floor(Math.random() * MASTER_JURUSAN.length)],
    pkm: pkmCodes[Math.floor(Math.random() * pkmCodes.length)]
  };
  state.simulatedRows.push(newRow);
  triggerToast('Simulasi: +1 respon demo masuk!');
  updateUIWithRows(state.simulatedRows);
}

function getWeightedRandom(items) {
  const total = items.reduce((acc, item) => acc + item.weight, 0);
  let random = Math.random() * total;
  for (const item of items) {
    if (random < item.weight) return item;
    random -= item.weight;
  }
  return items[0];
}

// Alur Polling Real-Time ke Google Visualization API
function startPolling() {
  if (state.pollTimerId) {
    clearInterval(state.pollTimerId);
    state.pollTimerId = null;
  }
  if (state.demoTimerId) {
    clearInterval(state.demoTimerId);
    state.demoTimerId = null;
  }
  state.isDemoMode = false;
  
  fetchSpreadsheetData();
  state.pollTimerId = setInterval(fetchSpreadsheetData, state.pollIntervalMs);
  const timerEl = document.getElementById('poll-timer');
  if (timerEl) timerEl.innerText = (state.pollIntervalMs / 1000).toString();
}

async function fetchSpreadsheetData() {
  if (!state.sheetId || state.isDemoMode || state.isFetching) return;

  state.isFetching = true;
  const statusText = document.getElementById('status-text');

  try {
    // Cache-busting kuat: timestamp + no-store header agar selalu dapat data segar dari Sheets
    const url = `https://docs.google.com/spreadsheets/d/${state.sheetId}/gviz/tq?tqx=out:json&tq=&headers=1&_=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

    const text = await res.text();
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) throw new Error('Format respon Google Visualization tidak valid.');

    const json = JSON.parse(text.substring(startIdx, endIdx + 1));
    const table = json.table;
    
    // JIKA TABEL KOSONG ATAU HANYA HEADER: BERSIHKAN TAMPILAN KE 0!
    if (!table || !table.rows || table.rows.length === 0) {
      state.lastRowCount = 0;
      if (statusText) statusText.innerText = 'Online (0 respon - Sheet kosong)';
      document.getElementById('metric-last-sync').innerText = `Terupdate: ${new Date().toLocaleTimeString('id-ID')}`;
      updateUIWithRows([]);
      return;
    }

    // Cari letak indeks kolom Jurusan dan PKM secara otomatis dari header
    let colJurusanIdx = 2; // Default perkiraan (Timestamp=0, Nama=1, Jurusan=2, PKM=3)
    let colPkmIdx = 3;

    if (table.cols && table.cols.length > 0) {
      table.cols.forEach((col, idx) => {
        const label = (col.label || '').toLowerCase();
        if (label.includes('jurusan')) colJurusanIdx = idx;
        if (label.includes('pkm') || label.includes('diminati') || label.includes('jenis')) colPkmIdx = idx;
      });
    }

    // Parsing baris - filter baris yang benar-benar punya data
    const rows = [];
    table.rows.forEach(r => {
      if (!r || !r.c) return;
      const rawJurusan = r.c[colJurusanIdx] ? (r.c[colJurusanIdx].v || '') : '';
      const rawPkm = r.c[colPkmIdx] ? (r.c[colPkmIdx].v || '') : '';
      
      const strJurusan = rawJurusan.toString().trim();
      const strPkm = rawPkm.toString().trim();

      // Hanya masukkan baris jika ada isi (bukan baris kosong sisa delete)
      if (strJurusan !== '' || strPkm !== '') {
        rows.push({
          jurusan: strJurusan,
          pkm: strPkm
        });
      }
    });

    // Cek apakah ada data baru masuk
    if (rows.length > state.lastRowCount && state.lastRowCount > 0) {
      triggerToast('Respon baru masuk! Memperbarui grafik...');
    }
    state.lastRowCount = rows.length;

    if (statusText) statusText.innerText = `Online (${rows.length} respon)`;
    document.getElementById('metric-last-sync').innerText = `Terupdate: ${new Date().toLocaleTimeString('id-ID')}`;
    
    updateUIWithRows(rows);
  } catch (err) {
    console.error('Error fetching Google Sheet:', err);
    if (statusText) statusText.innerText = 'Cek Izin / Link Sheet';
  } finally {
    state.isFetching = false;
  }
}

// Update Seluruh Tampilan Visual (Chart, Ranking List, dan Metric Cards)
function updateUIWithRows(rows) {
  const total = rows ? rows.length : 0;
  document.getElementById('count-total').innerText = total.toLocaleString('id-ID');

  // 1. Hitung Frekuensi Jurusan
  const countJurusan = {};
  MASTER_JURUSAN.forEach(j => countJurusan[j] = 0);

  if (rows && rows.length > 0) {
    rows.forEach(row => {
      let val = (row.jurusan || '').toLowerCase().trim();
      
      // Normalisasi cerdas: informatika / ti / jti -> Teknologi Informasi
      if (val.includes('informatika') || val.includes('teknologi informasi') || val === 'ti' || val === 'jti') {
        countJurusan['Teknologi Informasi']++;
        return;
      }

      let matched = MASTER_JURUSAN.find(j => j.toLowerCase() === val);
      if (!matched) {
        matched = MASTER_JURUSAN.find(j => val.includes(j.toLowerCase()) || j.toLowerCase().includes(val));
      }
      if (matched) {
        countJurusan[matched]++;
      }
    });
  }

  // 2. Hitung Frekuensi PKM
  const countPkm = {};
  MASTER_PKM.forEach(p => countPkm[p.code] = 0);

  if (rows && rows.length > 0) {
    rows.forEach(row => {
      const rawVal = (row.pkm || '').toUpperCase();
      MASTER_PKM.forEach(p => {
        if (rawVal === p.code || rawVal.includes(`PKM-${p.code}`) || rawVal.includes(p.code)) {
          countPkm[p.code]++;
        }
      });
    });
  }

  // 3. Update Chart Jurusan
  const dataJurusan = MASTER_JURUSAN.map(j => countJurusan[j]);
  if (state.chartJurusan) {
    state.chartJurusan.data.datasets[0].data = dataJurusan;
    state.chartJurusan.update();
  }

  // 4. Update Chart PKM
  const dataPkm = MASTER_PKM.map(p => countPkm[p.code]);
  if (state.chartPkm) {
    state.chartPkm.data.datasets[0].data = dataPkm;
    state.chartPkm.update();
  }

  // 5. Render Ranking List Jurusan
  renderRankingList(
    'ranking-jurusan-list',
    MASTER_JURUSAN.map((name, i) => ({
      name,
      count: countJurusan[name],
      color: COLORS_JURUSAN[i]
    })),
    total
  );

  // 6. Render Ranking List PKM
  const totalPkmVotes = Object.values(countPkm).reduce((a, b) => a + b, 0);
  renderRankingList(
    'ranking-pkm-list',
    MASTER_PKM.map((item, i) => ({
      name: item.label,
      count: countPkm[item.code],
      color: COLORS_PKM[i]
    })),
    totalPkmVotes
  );

  // 7. Update Top Metric Cards
  let topJ = { name: '-', count: 0 };
  Object.keys(countJurusan).forEach(k => {
    if (countJurusan[k] > topJ.count) topJ = { name: k, count: countJurusan[k] };
  });
  document.getElementById('top-jurusan').innerText = topJ.count > 0 ? topJ.name : '-';
  const topJPct = total > 0 ? ((topJ.count / total) * 100).toFixed(1) : 0;
  document.getElementById('top-jurusan-pct').innerText = topJ.count > 0 ? `${topJ.count} mhs (${topJPct}%)` : '0% dari total responden';

  let topP = { code: '-', count: 0, label: '-' };
  MASTER_PKM.forEach(p => {
    if (countPkm[p.code] > topP.count) {
      topP = { code: p.code, count: countPkm[p.code], label: `PKM-${p.code}` };
    }
  });
  document.getElementById('top-pkm').innerText = topP.count > 0 ? topP.label : '-';
  const topPPct = totalPkmVotes > 0 ? ((topP.count / totalPkmVotes) * 100).toFixed(1) : 0;
  document.getElementById('top-pkm-pct').innerText = topP.count > 0 ? `${topP.count} peminat (${topPPct}%)` : '0% dari total peminat';
}

// Helper untuk Render Panel Ranking di samping Chart
function renderRankingList(containerId, items, totalRef) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  // Sort descending berdasarkan jumlah terbanyak
  const sorted = [...items].sort((a, b) => b.count - a.count);

  sorted.forEach(item => {
    const pct = totalRef > 0 ? ((item.count / totalRef) * 100).toFixed(1) : '0.0';
    
    const div = document.createElement('div');
    div.className = 'ranking-item';
    div.innerHTML = `
      <div class="ranking-item-top">
        <div class="ranking-label-wrap">
          <span class="ranking-color-dot" style="background-color: ${item.color};"></span>
          <span class="ranking-label" title="${item.name}">${item.name}</span>
        </div>
        <div class="ranking-values">
          <span class="ranking-count">${item.count}</span>
          <span class="ranking-pct">(${pct}%)</span>
        </div>
      </div>
      <div class="ranking-bar-bg">
        <div class="ranking-bar-fill" style="width: ${pct}%; background-color: ${item.color};"></div>
      </div>
    `;
    container.appendChild(div);
  });
}

// Toast Notifikasi Respon Baru
function triggerToast(customMsg) {
  const toast = document.getElementById('new-response-toast');
  if (!toast) return;
  if (customMsg) {
    const msgEl = toast.querySelector('.toast-msg');
    if (msgEl) msgEl.innerText = customMsg;
  }
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Fullscreen Handler
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn('Fullscreen error:', err);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}
