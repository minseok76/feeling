/* ===========================
   js/teacher/teacher-app.js
   교사 대시보드 화면 제어
=========================== */

const DAY_KR = ['일', '월', '화', '수', '목', '금', '토'];

let allStudents = [];       // 전체 학생 데이터
let selectedStudentId = null; // 현재 선택된 학생 ID

// =====================
// 앱 시작 (teacher-auth.js에서 로그인 후 호출)
// =====================
let teacherDashboardBooted = false;

async function initTeacherDashboard() {
  if (teacherDashboardBooted) return;
  teacherDashboardBooted = true;

  if (typeof initTeacherTheme === 'function') initTeacherTheme();
  if (typeof initTeacherRosterPanel === 'function') initTeacherRosterPanel();
  if (typeof wireTeacherSettingsSubnav === 'function') wireTeacherSettingsSubnav();

  const d = new Date();
  document.getElementById('today-date').textContent =
    `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_KR[d.getDay()]})`;

  allStudents = await fetchAllStudents();

  renderSummary();
  renderStudentList(allStudents);
  renderTeacherGroupGrid();
  if (typeof renderTeacherManageList === 'function') {
    renderTeacherManageList(allStudents);
  }

  setupTeacherSync();
  wireTeacherTabNavigation();

  const sendBtn = document.getElementById('teacher-broadcast-send');
  const clearBtn = document.getElementById('teacher-broadcast-clear');
  const input = document.getElementById('teacher-broadcast-input');
  if (sendBtn && input && typeof setTeacherMessage === 'function') {
    sendBtn.addEventListener('click', function () {
      setTeacherMessage(input.value);
      input.value = '';
    });
  }
  if (clearBtn && typeof clearTeacherMessage === 'function') {
    clearBtn.addEventListener('click', function () {
      clearTeacherMessage();
      if (input) input.value = '';
    });
  }

  const btnInsight = document.getElementById('btn-open-insight');
  if (btnInsight) {
    btnInsight.addEventListener('click', function (e) {
      e.stopPropagation();
      const student = allStudents.find(s => s.id === selectedStudentId);
      if (student) openInsightModal(student);
    });
  }
  const insightClose = document.getElementById('insight-close');
  if (insightClose) insightClose.addEventListener('click', closeInsightModal);
  const calPrev = document.getElementById('insight-cal-prev');
  const calNext = document.getElementById('insight-cal-next');
  if (calPrev) calPrev.addEventListener('click', insightCalPrevMonth);
  if (calNext) calNext.addEventListener('click', insightCalNextMonth);

  const btnBackList = document.getElementById('btn-back-to-student-list');
  if (btnBackList) {
    btnBackList.addEventListener('click', function () {
      closeTeacherMobileDetailSheet();
    });
  }

  const mobileBackdrop = document.getElementById('detail-mobile-backdrop');
  if (mobileBackdrop) {
    mobileBackdrop.addEventListener('click', function () {
      closeTeacherMobileDetailSheet();
    });
  }

  const logoutBtn = document.getElementById('teacher-settings-logout');
  if (logoutBtn && typeof window.teacherSignOut === 'function') {
    logoutBtn.addEventListener('click', function () {
      window.teacherSignOut();
    });
  }

  window.addEventListener('resize', function () {
    if (!window.matchMedia('(max-width: 900px)').matches) {
      const panel = document.getElementById('detail-panel');
      const bd = document.getElementById('detail-mobile-backdrop');
      if (panel) panel.classList.remove('detail-panel--sheet-open');
      if (bd) bd.classList.remove('is-visible');
      syncTeacherBodyScrollLock();
    } else {
      const contentEl = document.getElementById('detail-content');
      if (
        selectedStudentId != null &&
        contentEl &&
        contentEl.style.display !== 'none'
      ) {
        openTeacherMobileDetailSheet();
      }
      syncTeacherBodyScrollLock();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    const ov = document.getElementById('insight-overlay');
    if (ov && ov.style.display === 'flex') closeInsightModal();
    else if (isTeacherMobileDetailSheetOpen()) closeTeacherMobileDetailSheet();
  });
}

// =====================
// 학생 앱과 동기화 (다른 탭에서 기록·이름 변경 시)
// =====================
function setupTeacherSync() {
  window.addEventListener('storage', function (e) {
    if (!e.key) return;
    if (
      e.key === 'emotions' ||
      e.key.indexOf('emotions_') === 0 ||
      e.key === 'emotion-checkin-user-name' ||
      e.key === 'emotion-checkin-active-uid' ||
      e.key === 'emotion-checkin-teacher-msg' ||
      e.key === 'emotion-checkin-roster-profiles' ||
      e.key === 'emotion-checkin-accounts' ||
      e.key === 'emotion-checkin-student-number' ||
      e.key === 'emotion-checkin-grade-label' ||
      e.key === 'emotion-checkin-class-label' ||
      e.key === 'emotion-checkin-teacher-custom-roster' ||
      e.key === 'emotion-checkin-teacher-hidden-json-ids'
    ) {
      void refreshDashboard();
    }
  });
  try {
    const ch = new BroadcastChannel('emotion-checkin');
    ch.onmessage = function (ev) {
      const k = ev.data && ev.data.kind;
      if (k === 'teacher-msg') return;
      void refreshDashboard();
    };
  } catch (e) {}
}

async function refreshDashboard() {
  allStudents = await fetchAllStudents();
  renderSummary();
  renderTeacherGroupGrid();
  if (typeof renderTeacherManageList === 'function') {
    renderTeacherManageList(allStudents);
  }
  const filterEl = document.getElementById('filter-emo');
  const val = filterEl ? filterEl.value : 'all';
  filterStudents(val);

  const student =
    selectedStudentId != null
      ? allStudents.find(s => s.id === selectedStudentId)
      : null;
  if (student) {
    document.getElementById('detail-empty').style.display = 'none';
    document.getElementById('detail-content').style.display = 'block';
    renderDetailPanel(student);
  } else {
    closeTeacherMobileDetailSheet();
  }

  if (insightOpenForId != null) {
    const t = document.getElementById('insight-title');
    const st = getInsightStudent();
    if (st && t) t.textContent = st.name + ' — 감정 그래프·달력';
    renderInsightGraph();
    renderInsightCalendar();
    if (insightSelectedDayStr) {
      const st2 = getInsightStudent();
      const map = buildDayMap(st2);
      const entries = map[insightSelectedDayStr];
      const d = new Date(insightSelectedDayStr);
      if (entries && entries.length) renderInsightDayDetail(d, entries);
      else renderInsightDayEmpty(d);
    } else {
      clearInsightDayDetail();
    }
  }
}

// =====================
// 요약 카드 렌더링
// =====================
function renderSummary() {
  const total = allStudents.length;
  const checked = allStudents.filter(s => hasTodayRecord(s)).length;
  const alerts = allStudents.filter(s => isAlertStudent(s)).length;

  const todayEmos = allStudents
    .filter(s => hasTodayRecord(s))
    .map(s => s.emotions[0].emo);
  const topEmo = getTopItem(todayEmos) || '-';

  document.querySelectorAll('[data-summary-field="total"]').forEach(function (el) {
    el.textContent = total;
  });
  document.querySelectorAll('[data-summary-field="checked"]').forEach(function (el) {
    el.textContent = checked;
  });
  document.querySelectorAll('[data-summary-field="alert"]').forEach(function (el) {
    el.textContent = alerts;
  });
  document.querySelectorAll('[data-summary-field="top-emo"]').forEach(function (el) {
    el.textContent = topEmo;
  });
}

let teacherActiveView = 'individual';

function showTeacherView(view) {
  const v = view || 'individual';
  teacherActiveView = v;

  document.querySelectorAll('[data-teacher-tab]').forEach(function (btn) {
    const on = btn.getAttribute('data-teacher-tab') === v;
    btn.classList.toggle('is-active', on);
  });

  document.querySelectorAll('[data-teacher-panel]').forEach(function (panel) {
    const on = panel.getAttribute('data-teacher-panel') === v;
    panel.classList.toggle('is-active', on);
  });

  const layout = document.querySelector('.teacher-app-layout');
  if (layout) layout.setAttribute('data-active-view', v);

  if (v === 'group') renderTeacherGroupGrid();

  if (v === 'settings' && typeof showTeacherSettingsSub === 'function') {
    showTeacherSettingsSub('app');
  }

  if (window.matchMedia('(max-width: 900px)').matches && v !== 'individual') {
    closeTeacherMobileDetailSheet();
  }
}

function showTeacherSettingsSub(sub) {
  const key = sub || 'app';
  document.querySelectorAll('[data-settings-sub]').forEach(function (btn) {
    const on = btn.getAttribute('data-settings-sub') === key;
    btn.classList.toggle('is-active', on);
  });
  document.querySelectorAll('[data-settings-panel]').forEach(function (panel) {
    const on = panel.getAttribute('data-settings-panel') === key;
    panel.classList.toggle('is-active', on);
  });
}

function wireTeacherSettingsSubnav() {
  document.querySelectorAll('[data-settings-sub]').forEach(function (btn) {
    if (btn.dataset.settingsSubWired === '1') return;
    btn.dataset.settingsSubWired = '1';
    btn.addEventListener('click', function () {
      const k = btn.getAttribute('data-settings-sub');
      if (k) showTeacherSettingsSub(k);
    });
  });
  showTeacherSettingsSub('app');
}

function wireTeacherTabNavigation() {
  document.querySelectorAll('[data-teacher-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const v = btn.getAttribute('data-teacher-tab');
      if (v) showTeacherView(v);
    });
  });
  showTeacherView('individual');
}

function renderTeacherGroupGrid() {
  const grid = document.getElementById('teacher-group-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!allStudents || allStudents.length === 0) {
    grid.innerHTML =
      '<p class="teacher-group-empty">학생이 없어요. 설정의 명단 관리·학생 계정에서 추가하거나 data/students.json 명단을 확인하세요.</p>';
    return;
  }

  allStudents.forEach(function (s) {
    const hasToday = hasTodayRecord(s);
    const emo = hasToday ? s.emotions[0].emo : '❓';
    const label = hasToday ? s.emotions[0].label : '미기록';
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'teacher-group-card' + (isAlertStudent(s) ? ' teacher-group-card--alert' : '');
    card.innerHTML = `
      <span class="teacher-group-card-emo">${emo}</span>
      <span class="teacher-group-card-name">${escTeacherListText(s.name)}</span>
      <span class="teacher-group-card-sub">${escTeacherListText(label)}</span>
    `;
    const sid = s.id;
    card.addEventListener('click', function () {
      showTeacherView('individual');
      let listed = null;
      document.querySelectorAll('.student-card[data-student-id]').forEach(function (c) {
        if (c.getAttribute('data-student-id') === String(sid)) listed = c;
      });
      selectStudent(sid, listed);
    });
    grid.appendChild(card);
  });
}

// =====================
// 학생 목록 렌더링
// =====================
function escTeacherListText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function renderStudentList(students) {
  const container = document.getElementById('student-list');
  container.innerHTML = '';

  if (students.length === 0) {
    container.innerHTML = '<p style="color:#555;text-align:center;padding:20px;font-size:13px;">해당하는 학생이 없어요</p>';
    return;
  }

  const mobile = window.matchMedia('(max-width: 900px)').matches;

  students.forEach(student => {
    const hasToday = hasTodayRecord(student);
    const todayEmo = hasToday ? student.emotions[0].emo : '❓';
    const todayLabel = hasToday ? student.emotions[0].label : '미기록';
    const isAlert = isAlertStudent(student);
    const isActive = student.id === selectedStudentId;

    const card = document.createElement('div');

    card.dataset.studentId = String(student.id);

    if (mobile) {
      card.className = `student-card${!hasToday ? ' no-record' : ''}${isActive ? ' active' : ''}`;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.innerHTML = `
        <div class="s-info">
          <div class="s-name-row">
            <span class="s-name-text">${escTeacherListText(student.name)}</span>
            <span class="s-num">${escTeacherListText(String(student.number || ''))}</span>
            ${isAlert ? '<span class="s-alert" title="관심 필요">🔴</span>' : ''}
          </div>
        </div>
      `;
      card.onclick = function () {
        selectStudent(student.id, card);
      };
      card.onkeydown = function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectStudent(student.id, card);
        }
      };
    } else {
      card.className = `student-card${!hasToday ? ' no-record' : ''}${isActive ? ' active' : ''}`;
      card.onclick = function () {
        selectStudent(student.id, card);
      };
      card.innerHTML = `
        <div class="s-emo">${todayEmo}</div>
        <div class="s-info">
          <p class="s-name">${escTeacherListText(student.name)} <span style="color:#555;font-weight:400;font-size:12px;">${escTeacherListText(String(student.number || ''))}</span></p>
          <p class="s-sub">${escTeacherListText(todayLabel)}</p>
        </div>
        ${isAlert ? '<span class="s-alert" title="관심 필요">🔴</span>' : ''}
      `;
    }
    container.appendChild(card);
  });
}

// =====================
// 필터 (감정별 보기)
// =====================
function filterStudents(value) {
  if (value === 'all') {
    renderStudentList(allStudents);
    return;
  }
  if (value === 'none') {
    renderStudentList(allStudents.filter(s => !hasTodayRecord(s)));
    return;
  }
  const filtered = allStudents.filter(s => {
    if (!hasTodayRecord(s)) return false;
    return s.emotions[0].emo === value;
  });
  renderStudentList(filtered);
}

// =====================
// 학생 클릭 → 상세 패널
// =====================
function isTeacherMobileDetailSheetOpen() {
  const panel = document.getElementById('detail-panel');
  return (
    window.matchMedia('(max-width: 900px)').matches &&
    panel &&
    panel.classList.contains('detail-panel--sheet-open')
  );
}

function syncTeacherBodyScrollLock() {
  const ins = document.getElementById('insight-overlay');
  const insightOpen = ins && ins.style.display === 'flex';
  const sheetOpen = isTeacherMobileDetailSheetOpen();
  if (insightOpen || sheetOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

function openTeacherMobileDetailSheet() {
  if (!window.matchMedia('(max-width: 900px)').matches) return;
  const bd = document.getElementById('detail-mobile-backdrop');
  const panel = document.getElementById('detail-panel');
  if (bd) bd.classList.add('is-visible');
  if (panel) {
    panel.classList.add('detail-panel--sheet-open');
    requestAnimationFrame(function () {
      panel.scrollTop = 0;
    });
  }
  syncTeacherBodyScrollLock();
}

function closeTeacherMobileDetailSheet() {
  selectedStudentId = null;
  document.querySelectorAll('.student-card').forEach(function (c) {
    c.classList.remove('active');
  });
  const emptyEl = document.getElementById('detail-empty');
  const contentEl = document.getElementById('detail-content');
  if (emptyEl) emptyEl.style.display = 'flex';
  if (contentEl) contentEl.style.display = 'none';
  const bd = document.getElementById('detail-mobile-backdrop');
  const panel = document.getElementById('detail-panel');
  if (bd) bd.classList.remove('is-visible');
  if (panel) panel.classList.remove('detail-panel--sheet-open');
  syncTeacherBodyScrollLock();
}

function selectStudent(studentId, cardEl) {
  selectedStudentId = studentId;
  const student = allStudents.find(s => s.id === studentId);
  if (!student) return;

  document.querySelectorAll('.student-card').forEach(c => c.classList.remove('active'));
  if (cardEl) {
    cardEl.classList.add('active');
  } else {
    document.querySelectorAll('.student-card[data-student-id]').forEach(function (c) {
      if (c.getAttribute('data-student-id') === String(studentId)) {
        c.classList.add('active');
      }
    });
  }

  // 상세 패널 보이기
  document.getElementById('detail-empty').style.display = 'none';
  document.getElementById('detail-content').style.display = 'block';

  renderDetailPanel(student);

  if (window.matchMedia('(max-width: 900px)').matches) {
    openTeacherMobileDetailSheet();
  } else {
    const panel = document.getElementById('detail-panel');
    if (panel) {
      requestAnimationFrame(function () {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }
}

// =====================
// 상세 패널 렌더링
// =====================
function renderDetailPanel(student) {
  const hasToday = hasTodayRecord(student);
  const isAlert = isAlertStudent(student);

  const emos = student.emotions || [];
  document.getElementById('d-avatar').textContent =
    hasToday ? emos[0].emo : '❓';
  document.getElementById('d-name').textContent =
    student.name + (isAlert ? ' 🔴' : '');
  const metaParts = [];
  if (student.gradeLabel) metaParts.push(student.gradeLabel);
  if (student.classLabel) metaParts.push(student.classLabel);
  const metaSchool = metaParts.join(' · ');
  const uid = (student.userId || '').trim();
  const uidPart = uid ? ` · ID ${uid}` : '';
  const emoCount = (student.emotions && student.emotions.length) || 0;
  const metaTail = `${student.number || '-'}${uidPart} · 총 ${emoCount}회 기록`;
  document.getElementById('d-meta').textContent = metaSchool
    ? `${metaSchool} · ${metaTail}`
    : metaTail;

  // 오늘 감정
  if (hasToday) {
    const t = emos[0];
    document.getElementById('d-today-emo').textContent = t.emo;
    document.getElementById('d-today-label').textContent = t.label;
    document.getElementById('d-today-note').textContent =
      t.note ? `"${t.note}"` : '메모 없음';
  } else {
    document.getElementById('d-today-emo').textContent = '❓';
    document.getElementById('d-today-label').textContent = '오늘 미기록';
    document.getElementById('d-today-note').textContent = '';
  }

  // 이번 주 감정 (최근 5일)
  const weekRow = document.getElementById('d-week-row');
  weekRow.innerHTML = '';
  for (let i = 4; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toDateString();
    const found = (student.emotions || []).find(e =>
      new Date(e.date).toDateString() === dayStr
    );
    const item = document.createElement('div');
    item.className = 'week-emo-item';
    item.innerHTML = `
      <span class="w-emo">${found ? found.emo : '—'}</span>
      <span class="w-day">${DAY_KR[d.getDay()]}</span>
    `;
    weekRow.appendChild(item);
  }

  // 최근 기록 목록
  const histList = document.getElementById('d-history-list');
  histList.innerHTML = '';
  const recent = (student.emotions || []).slice(0, 5);

  if (recent.length === 0) {
    histList.innerHTML = '<p style="color:#555;font-size:13px;padding:10px 0;">기록이 없어요</p>';
    return;
  }

  recent.forEach(e => {
    const div = document.createElement('div');
    div.className = 'd-log-item';
    div.innerHTML = `
      <div class="d-log-emo">${e.emo}</div>
      <div class="d-log-info">
        <p class="d-log-label">${e.label}</p>
        <p class="d-log-note">${e.note || '메모 없음'}</p>
      </div>
      <span class="d-log-date">${formatDateTeacher(e.date)}</span>
    `;
    histList.appendChild(div);
  });
}

// =====================
// 유틸 함수
// =====================

// 배열에서 가장 많이 나온 값 구하기
function getTopItem(arr) {
  if (!arr.length) return null;
  const count = {};
  arr.forEach(v => count[v] = (count[v] || 0) + 1);
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
}

// 날짜 포맷 (예: 4월 10일)
function formatDateTeacher(isoString) {
  const d = new Date(isoString);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// =====================
// 감정 그래프·달력 모달
// =====================

const INSIGHT_EMO_COLORS = {
  '😊': '#a78bfa',
  '😐': '#888',
  '😢': '#60a5fa',
  '😡': '#f87171',
  '😴': '#fbbf24',
};

const INSIGHT_EMO_ORDER = ['😊', '😐', '😢', '😡', '😴'];

let insightOpenForId = null;
let insightCalYear = new Date().getFullYear();
let insightCalMonth = new Date().getMonth();
let insightSelectedDayStr = null;

function getInsightStudent() {
  if (insightOpenForId == null) return null;
  return allStudents.find(s => s.id === insightOpenForId);
}

function formatInsightTime(isoString) {
  const d = new Date(isoString);
  const h = d.getHours();
  const m = d.getMinutes();
  const mm = m < 10 ? '0' + m : m;
  if (h < 12) return `오전 ${h}:${mm}`;
  if (h === 12) return `낮 12:${mm}`;
  return `오후 ${h - 12}:${mm}`;
}

function escInsightHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildDayMap(student) {
  const map = {};
  if (!student || !student.emotions) return map;
  student.emotions.forEach(e => {
    const k = new Date(e.date).toDateString();
    if (!map[k]) map[k] = [];
    map[k].push(e);
  });
  Object.keys(map).forEach(k => {
    map[k].sort((a, b) => new Date(b.date) - new Date(a.date));
  });
  return map;
}

function openInsightModal(student) {
  insightOpenForId = student.id;
  const now = new Date();
  insightCalYear = now.getFullYear();
  insightCalMonth = now.getMonth();
  insightSelectedDayStr = null;

  const title = document.getElementById('insight-title');
  if (title) title.textContent = student.name + ' — 감정 그래프·달력';

  const overlay = document.getElementById('insight-overlay');
  if (overlay) overlay.style.display = 'flex';
  syncTeacherBodyScrollLock();

  renderInsightGraph();
  renderInsightCalendar();
  clearInsightDayDetail();
}

function closeInsightModal() {
  const overlay = document.getElementById('insight-overlay');
  if (overlay) overlay.style.display = 'none';
  insightOpenForId = null;
  insightSelectedDayStr = null;
  syncTeacherBodyScrollLock();
}

window.closeInsightModal = closeInsightModal;

function renderInsightGraph() {
  const container = document.getElementById('insight-graph');
  if (!container) return;

  const student = getInsightStudent();
  const emotions = student && student.emotions ? student.emotions : [];
  container.innerHTML = '';

  if (emotions.length === 0) {
    container.innerHTML = '<p class="insight-graph-empty">기록이 없어요</p>';
    return;
  }

  const counts = {};
  emotions.forEach(e => {
    counts[e.emo] = (counts[e.emo] || 0) + 1;
  });

  const keys = [];
  INSIGHT_EMO_ORDER.forEach(em => {
    if (counts[em]) keys.push(em);
  });
  Object.keys(counts).forEach(em => {
    if (keys.indexOf(em) === -1) keys.push(em);
  });

  const max = Math.max(1, ...keys.map(k => counts[k]));

  keys.forEach(em => {
    const n = counts[em];
    const pct = Math.round((n / max) * 100);
    const color = INSIGHT_EMO_COLORS[em] || '#888';
    const row = document.createElement('div');
    row.className = 'insight-graph-row';
    row.innerHTML = `
      <span class="insight-graph-emo">${em}</span>
      <div class="insight-graph-bar-wrap">
        <div class="insight-graph-bar" style="width:${pct}%;background:${color};"></div>
      </div>
      <span class="insight-graph-count">${n}</span>
    `;
    container.appendChild(row);
  });
}

function insightCalPrevMonth() {
  if (insightCalMonth === 0) {
    insightCalYear--;
    insightCalMonth = 11;
  } else {
    insightCalMonth--;
  }
  insightSelectedDayStr = null;
  renderInsightCalendar();
  clearInsightDayDetail();
}

function insightCalNextMonth() {
  if (insightCalMonth === 11) {
    insightCalYear++;
    insightCalMonth = 0;
  } else {
    insightCalMonth++;
  }
  insightSelectedDayStr = null;
  renderInsightCalendar();
  clearInsightDayDetail();
}

function renderInsightCalendar() {
  const container = document.getElementById('insight-calendar');
  const labelEl = document.getElementById('insight-cal-label');
  if (!container) return;

  const student = getInsightStudent();
  const dayMap = buildDayMap(student);

  if (labelEl) {
    labelEl.textContent = `${insightCalYear}년 ${insightCalMonth + 1}월`;
  }

  const first = new Date(insightCalYear, insightCalMonth, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(insightCalYear, insightCalMonth + 1, 0).getDate();
  const today = new Date();
  const todayStr = today.toDateString();

  container.innerHTML = '';

  for (let i = 0; i < startPad; i++) {
    const cell = document.createElement('div');
    cell.className = 'insight-cal-cell insight-cal-out';
    container.appendChild(cell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(insightCalYear, insightCalMonth, day);
    const dayStr = d.toDateString();
    const entries = dayMap[dayStr] || [];
    const has = entries.length > 0;
    const showEmo = has ? entries[0].emo : '';

    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'insight-cal-cell';
    if (!has) cell.classList.add('insight-cal-disabled');
    if (dayStr === todayStr) cell.classList.add('insight-cal-today');
    if (insightSelectedDayStr === dayStr) cell.classList.add('insight-cal-selected');

    cell.innerHTML = `
      <span class="insight-cal-daynum">${day}</span>
      <span class="insight-cal-emo">${has ? showEmo : '·'}</span>
    `;

    cell.addEventListener('click', function () {
      insightSelectedDayStr = dayStr;
      renderInsightCalendar();
      if (has) {
        renderInsightDayDetail(d, entries);
      } else {
        renderInsightDayEmpty(d);
      }
    });

    container.appendChild(cell);
  }
}

function clearInsightDayDetail() {
  const el = document.getElementById('insight-day-detail');
  if (el) {
    el.innerHTML = '<p class="insight-day-placeholder">날짜를 선택해 주세요</p>';
  }
}

function renderInsightDayEmpty(d) {
  const el = document.getElementById('insight-day-detail');
  if (!el) return;
  const head = `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_KR[d.getDay()]})`;
  el.innerHTML = `<p class="insight-day-head">${head}</p><p class="insight-day-empty">이 날 기록이 없어요</p>`;
}

function renderInsightDayDetail(d, entries) {
  const el = document.getElementById('insight-day-detail');
  if (!el) return;
  const head = `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_KR[d.getDay()]})`;
  let html = `<p class="insight-day-head">${head} · ${entries.length}건</p>`;
  entries.forEach(e => {
    html += `
      <div class="insight-day-entry">
        <div class="insight-day-entry-top">
          <span class="insight-day-entry-emo">${e.emo}</span>
          <span class="insight-day-entry-label">${escInsightHtml(e.label)}</span>
          <span class="insight-day-entry-time">${formatInsightTime(e.date)}</span>
        </div>
        <p class="insight-day-entry-note">${e.note ? escInsightHtml(e.note) : '메모 없음'}</p>
      </div>
    `;
  });
  el.innerHTML = html;
}
