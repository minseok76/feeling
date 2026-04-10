/* ===========================
   js/core/storage.js
   감정 데이터 저장 / 불러오기
   localStorage를 사용해요

   교사 화면·다른 탭과 맞추기:
     • notifyEmotionAppSync — BroadcastChannel로 같은 출처 탭에 알림
     • get/set/clearTeacherMessage — 선생님이 보내는 한 줄 메시지
=========================== */

const LS_TEACHER_MSG_KEY = 'emotion-checkin-teacher-msg';
const LS_ACTIVE_UID_KEY = 'emotion-checkin-active-uid';

function emotionsStorageKey() {
  const uid = localStorage.getItem(LS_ACTIVE_UID_KEY);
  return uid ? 'emotions_' + uid : 'emotions';
}

function setEmotionStorageUid(uid) {
  if (uid) localStorage.setItem(LS_ACTIVE_UID_KEY, uid);
  else localStorage.removeItem(LS_ACTIVE_UID_KEY);
}

function notifyEmotionAppSync(kind) {
  try {
    const ch = new BroadcastChannel('emotion-checkin');
    ch.postMessage({ kind: kind || 'update' });
    ch.close();
  } catch (e) {}
}

function getTeacherMessage() {
  try {
    const r = localStorage.getItem(LS_TEACHER_MSG_KEY);
    return r ? JSON.parse(r) : null;
  } catch (e) {
    return null;
  }
}

function setTeacherMessage(text) {
  const t = (text || '').trim();
  if (!t) return;
  const payload = { text: t, at: new Date().toISOString() };
  localStorage.setItem(LS_TEACHER_MSG_KEY, JSON.stringify(payload));
  notifyEmotionAppSync('teacher-msg');
}

function clearTeacherMessage() {
  localStorage.removeItem(LS_TEACHER_MSG_KEY);
  notifyEmotionAppSync('teacher-msg');
}

// 모든 감정 기록을 가져와요 (로그인 시 계정별 키)
function getEmotions() {
  const data = localStorage.getItem(emotionsStorageKey());
  return data ? JSON.parse(data) : [];
}

// 새 감정 기록을 저장해요
function saveEmotion(emo, label, note) {
  const emotions = getEmotions();
  const newEntry = {
    id: Date.now(),           // 고유 번호 (저장 시간)
    emo: emo,                 // 이모지 (예: 😊)
    label: label,             // 라벨 (예: 기분 좋음)
    note: note || '',         // 메모 (없으면 빈 문자열)
    date: new Date().toISOString()  // 저장 날짜
  };
  emotions.unshift(newEntry); // 맨 앞에 추가 (최신순)
  localStorage.setItem(emotionsStorageKey(), JSON.stringify(emotions));
  notifyEmotionAppSync('emotions');
  return newEntry;
}

// 이번 주 기록만 가져와요 (월~일)
function getWeekEmotions() {
  const emotions = getEmotions();
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=일, 1=월 ...
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  return emotions.filter(e => new Date(e.date) >= monday);
}

// 가장 많이 기록한 감정을 구해요
function getTopEmotion() {
  const emotions = getEmotions();
  if (emotions.length === 0) return '-';
  const count = {};
  emotions.forEach(e => {
    count[e.emo] = (count[e.emo] || 0) + 1;
  });
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
}

// 연속으로 기록한 날 수를 구해요
function getStreak() {
  const emotions = getEmotions();
  if (emotions.length === 0) return 0;

  const dates = [...new Set(emotions.map(e =>
    new Date(e.date).toLocaleDateString('ko-KR')
  ))];

  let streak = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    const d1 = new Date(emotions.find(e =>
      new Date(e.date).toLocaleDateString('ko-KR') === dates[i]
    ).date);
    const d2 = new Date(emotions.find(e =>
      new Date(e.date).toLocaleDateString('ko-KR') === dates[i + 1]
    ).date);
    const diff = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

// 모든 데이터를 지워요
function clearData() {
  if (confirm('정말 모든 기록을 삭제할까요?')) {
    localStorage.removeItem(emotionsStorageKey());
    notifyEmotionAppSync('emotions');
    location.reload();
  }
}

// 날짜를 한국어 형식으로 바꿔요 (예: 4월 10일)
function formatDate(isoString) {
  const d = new Date(isoString);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// 시간을 한국어 형식으로 바꿔요 (예: 오후 2시)
function formatTime(isoString) {
  const d = new Date(isoString);
  const h = d.getHours();
  if (h < 12) return `오전 ${h}시`;
  if (h === 12) return '낮 12시';
  return `오후 ${h - 12}시`;
}

// =====================
// 로컬 계정 (학생 앱) — 교사 탭에서도 동일 키로 패치
// =====================

const LS_ACCOUNTS_KEY = 'emotion-checkin-accounts';
const LS_ROSTER_PROFILE_KEY = 'emotion-checkin-roster-profiles';

function getLocalAccounts() {
  try {
    const r = localStorage.getItem(LS_ACCOUNTS_KEY);
    return r ? JSON.parse(r) : {};
  } catch (e) {
    return {};
  }
}

function setLocalAccounts(obj) {
  localStorage.setItem(LS_ACCOUNTS_KEY, JSON.stringify(obj));
}

function patchLocalAccount(loginId, patch) {
  if (!loginId || !patch) return;
  const acc = getLocalAccounts();
  if (!acc[loginId]) return;
  Object.assign(acc[loginId], patch);
  setLocalAccounts(acc);
  notifyEmotionAppSync('profile');
}

function getRosterProfilesById() {
  try {
    const r = localStorage.getItem(LS_ROSTER_PROFILE_KEY);
    const o = r ? JSON.parse(r) : {};
    return o.byId && typeof o.byId === 'object' ? o.byId : {};
  } catch (e) {
    return {};
  }
}

function setRosterProfilesById(byId) {
  localStorage.setItem(LS_ROSTER_PROFILE_KEY, JSON.stringify({ byId }));
  notifyEmotionAppSync('profile');
}

function mergeRosterStudentProfile(studentId, patch) {
  const byId = getRosterProfilesById();
  const k = String(studentId);
  byId[k] = { ...(byId[k] || {}), ...patch };
  setRosterProfilesById(byId);
}

function applyRosterProfilesToStudents(students) {
  const byId = getRosterProfilesById();
  return students.map(s => {
    const ov = byId[String(s.id)];
    if (!ov) return { ...s };
    return {
      ...s,
      name: ov.name !== undefined && ov.name !== '' ? ov.name : s.name,
      number: ov.number !== undefined && ov.number !== '' ? ov.number : s.number,
      gradeLabel:
        ov.gradeLabel !== undefined && ov.gradeLabel !== ''
          ? ov.gradeLabel
          : s.gradeLabel,
      classLabel:
        ov.classLabel !== undefined && ov.classLabel !== ''
          ? ov.classLabel
          : s.classLabel,
    };
  });
}

// =====================
// 교사 대시보드 전용 계정 (학생 계정과 별도 키)
// =====================

const LS_TEACHER_ACCOUNTS_KEY = 'emotion-checkin-teacher-accounts';

function getTeacherAccounts() {
  try {
    const r = localStorage.getItem(LS_TEACHER_ACCOUNTS_KEY);
    return r ? JSON.parse(r) : {};
  } catch (e) {
    return {};
  }
}

function setTeacherAccounts(obj) {
  localStorage.setItem(LS_TEACHER_ACCOUNTS_KEY, JSON.stringify(obj));
}
