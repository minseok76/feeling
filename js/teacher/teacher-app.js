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

  // 오늘 날짜 표시
  const d = new Date();
  document.getElementById('today-date').textContent =
    `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_KR[d.getDay()]})`;

  // 데이터 불러오기
  allStudents = await fetchAllStudents();

  renderSummary();
  renderStudentList(allStudents);

  setupTeacherSync();

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

  const saveProfileBtn = document.getElementById('btn-save-student-profile');
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', function () {
      void saveDetailStudentProfile();
    });
  }

  const toggleStudentEdit = document.getElementById('btn-toggle-student-edit');
  if (toggleStudentEdit) {
    toggleStudentEdit.addEventListener('click', function () {
      const sec = document.getElementById('detail-edit-section');
      const open = sec && sec.style.display !== 'none';
      setDetailEditSectionOpen(!open);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    const ov = document.getElementById('insight-overlay');
    if (ov && ov.style.display === 'flex') closeInsightModal();
    else {
      const sec = document.getElementById('detail-edit-section');
      if (sec && sec.style.display !== 'none') setDetailEditSectionOpen(false);
    }
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
      e.key === 'emotion-checkin-class-label'
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
    selectedStudentId = null;
    document.getElementById('detail-empty').style.display = 'flex';
    document.getElementById('detail-content').style.display = 'none';
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

  // 오늘 최다 감정
  const todayEmos = allStudents
    .filter(s => hasTodayRecord(s))
    .map(s => s.emotions[0].emo);
  const topEmo = getTopItem(todayEmos) || '-';

  document.getElementById('s-total').textContent = total;
  document.getElementById('s-checked').textContent = checked;
  document.getElementById('s-alert').textContent = alerts;
  document.getElementById('s-top-emo').textContent = topEmo;
}

// =====================
// 학생 목록 렌더링
// =====================
function renderStudentList(students) {
  const container = document.getElementById('student-list');
  container.innerHTML = '';

  if (students.length === 0) {
    container.innerHTML = '<p style="color:#555;text-align:center;padding:20px;font-size:13px;">해당하는 학생이 없어요</p>';
    return;
  }

  students.forEach(student => {
    const hasToday = hasTodayRecord(student);
    const todayEmo = hasToday ? student.emotions[0].emo : '❓';
    const todayLabel = hasToday ? student.emotions[0].label : '미기록';
    const isAlert = isAlertStudent(student);
    const isActive = student.id === selectedStudentId;

    const card = document.createElement('div');
    card.className = `student-card${!hasToday ? ' no-record' : ''}${isActive ? ' active' : ''}`;
    card.onclick = () => selectStudent(student.id, card);
    card.innerHTML = `
      <div class="s-emo">${todayEmo}</div>
      <div class="s-info">
        <p class="s-name">${student.name} <span style="color:#555;font-weight:400;font-size:12px;">${student.number}</span></p>
        <p class="s-sub">${todayLabel}</p>
      </div>
      ${isAlert ? '<span class="s-alert" title="관심 필요">🔴</span>' : ''}
    `;
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
// 학생 정보 수정 패널 (버튼으로 열기)
// =====================
function setDetailEditSectionOpen(open) {
  const sec = document.getElementById('detail-edit-section');
  const btn = document.getElementById('btn-toggle-student-edit');
  if (sec) sec.style.display = open ? 'block' : 'none';
  if (btn) {
    btn.textContent = open ? '수정 닫기' : '학생정보수정';
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
}

// =====================
// 학생 클릭 → 상세 패널
// =====================
function selectStudent(studentId, cardEl) {
  setDetailEditSectionOpen(false);
  selectedStudentId = studentId;
  const student = allStudents.find(s => s.id === studentId);
  if (!student) return;

  // 목록에서 active 표시 업데이트
  document.querySelectorAll('.student-card').forEach(c => c.classList.remove('active'));
  if (cardEl) cardEl.classList.add('active');

  // 상세 패널 보이기
  document.getElementById('detail-empty').style.display = 'none';
  document.getElementById('detail-content').style.display = 'block';

  renderDetailPanel(student);
}

// =====================
// 상세 패널 렌더링
// =====================
function renderDetailPanel(student) {
  const hasToday = hasTodayRecord(student);
  const isAlert = isAlertStudent(student);

  // 헤더
  document.getElementById('d-avatar').textContent =
    hasToday ? student.emotions[0].emo : '❓';
  document.getElementById('d-name').textContent =
    student.name + (isAlert ? ' 🔴' : '');
  const metaParts = [];
  if (student.gradeLabel) metaParts.push(student.gradeLabel);
  if (student.classLabel) metaParts.push(student.classLabel);
  const metaSchool = metaParts.join(' · ');
  const metaTail = `${student.number} · 총 ${student.emotions.length}회 기록`;
  document.getElementById('d-meta').textContent = metaSchool
    ? `${metaSchool} · ${metaTail}`
    : metaTail;

  const nEl = document.getElementById('d-edit-name');
  const gEl = document.getElementById('d-edit-grade');
  const cEl = document.getElementById('d-edit-class');
  const numEl = document.getElementById('d-edit-number');
  if (nEl) nEl.value = (student.name || '').trim();
  if (gEl) gEl.value = (student.gradeLabel || '').trim();
  if (cEl) cEl.value = (student.classLabel || '').trim();
  if (numEl) numEl.value = (student.number || '').trim();

  // 오늘 감정
  if (hasToday) {
    const t = student.emotions[0];
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
    const found = student.emotions.find(e =>
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
  const recent = student.emotions.slice(0, 5);

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

function normalizeDetailLoginId(uid) {
  return String(uid || '').trim().toLowerCase();
}

async function saveDetailStudentProfile() {
  const student = allStudents.find(s => s.id === selectedStudentId);
  if (!student) return;

  const name = (document.getElementById('d-edit-name') || {}).value || '';
  const gradeLabel = (document.getElementById('d-edit-grade') || {}).value || '';
  const classLabel = (document.getElementById('d-edit-class') || {}).value || '';
  const number = (document.getElementById('d-edit-number') || {}).value || '';
  const nameTrim = name.trim();
  if (!nameTrim) {
    alert('이름을 입력해 주세요.');
    return;
  }

  if (typeof mergeRosterStudentProfile === 'function') {
    mergeRosterStudentProfile(student.id, {
      name: nameTrim,
      gradeLabel: gradeLabel.trim(),
      classLabel: classLabel.trim(),
      number: number.trim(),
    });
  }

  const loginId = normalizeDetailLoginId(student.userId);
  if (loginId && typeof patchLocalAccount === 'function') {
    patchLocalAccount(loginId, {
      name: nameTrim,
      studentNumber: number.trim(),
      gradeLabel: gradeLabel.trim(),
      classLabel: classLabel.trim(),
    });
  }

  const logged = normalizeDetailLoginId(
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('emotion-checkin-logged-user')
      : ''
  );
  if (logged && loginId && logged === loginId) {
    localStorage.setItem('emotion-checkin-user-name', nameTrim || '학생');
    localStorage.setItem('emotion-checkin-student-number', number.trim());
    localStorage.setItem('emotion-checkin-grade-label', gradeLabel.trim());
    localStorage.setItem('emotion-checkin-class-label', classLabel.trim());
  }

  const btn = document.getElementById('btn-save-student-profile');
  const prev = btn ? btn.textContent : '';
  if (btn) {
    btn.textContent = '저장됨';
    btn.disabled = true;
  }
  await refreshDashboard();
  if (btn) {
    btn.textContent = prev || '저장';
    btn.disabled = false;
  }
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
  document.body.style.overflow = 'hidden';

  renderInsightGraph();
  renderInsightCalendar();
  clearInsightDayDetail();
}

function closeInsightModal() {
  const overlay = document.getElementById('insight-overlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
  insightOpenForId = null;
  insightSelectedDayStr = null;
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
