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
    const uid =
      ov.userId !== undefined && String(ov.userId).trim() !== ''
        ? String(ov.userId).trim().toLowerCase()
        : s.userId;
    return {
      ...s,
      userId: uid,
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
// 학급 만들기 · 학급 코드 연결 (같은 브라우저 localStorage)
// 선생님: 교사 앱 설정에서 학급 생성 → 코드 안내
// 학생: 코드 입력으로 연결 (선생님과 같은 브라우저에 학급 데이터가 있어야 매칭됨)
// =====================

const LS_CLASS_ROOM_KEY = 'emotion-checkin-class-room';
const LS_STUDENT_LINKED_CLASS_CODE_KEY = 'emotion-checkin-student-linked-class-code';

function normalizeClassJoinCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function generateClassJoinCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let s = '';
  for (let i = 0; i < 6; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function getClassRoom() {
  try {
    const r = localStorage.getItem(LS_CLASS_ROOM_KEY);
    if (!r) return null;
    const o = JSON.parse(r);
    if (!o || typeof o.code !== 'string' || typeof o.name !== 'string') return null;
    const code = normalizeClassJoinCode(o.code);
    const name = String(o.name || '').trim();
    if (!code || !name) return null;
    return {
      name,
      code,
      createdAt: o.createdAt || null,
    };
  } catch (e) {
    return null;
  }
}

function setClassRoom(name, code) {
  const n = String(name || '').trim() || '우리 학급';
  const c = normalizeClassJoinCode(code);
  if (!c) return false;
  localStorage.setItem(
    LS_CLASS_ROOM_KEY,
    JSON.stringify({ name: n, code: c, createdAt: new Date().toISOString() })
  );
  notifyEmotionAppSync('class-room');
  return true;
}

function clearClassRoom() {
  localStorage.removeItem(LS_CLASS_ROOM_KEY);
  clearStudentLinkedClassCode();
  notifyEmotionAppSync('class-room');
}

function getStudentLinkedClassCode() {
  try {
    const c = localStorage.getItem(LS_STUDENT_LINKED_CLASS_CODE_KEY);
    return c ? normalizeClassJoinCode(c) : '';
  } catch (e) {
    return '';
  }
}

function setStudentLinkedClassCode(code) {
  const c = normalizeClassJoinCode(code);
  if (!c) {
    localStorage.removeItem(LS_STUDENT_LINKED_CLASS_CODE_KEY);
  } else {
    localStorage.setItem(LS_STUDENT_LINKED_CLASS_CODE_KEY, c);
  }
  notifyEmotionAppSync('class-room');
}

function clearStudentLinkedClassCode() {
  localStorage.removeItem(LS_STUDENT_LINKED_CLASS_CODE_KEY);
  notifyEmotionAppSync('class-room');
}

/**
 * 선생님이 만든 학급 코드와 일치하면 학생 쪽에 연결 저장
 * @returns {{ ok: true, className: string } | { ok: false, error: string }}
 */
function tryMatchStudentClassCode(input) {
  const room = getClassRoom();
  if (!room) {
    return {
      ok: false,
      error:
        '이 기기에는 아직 학급이 없어요. 선생님이 교사 앱 설정에서 학급을 만든 뒤, 같은 브라우저(예: 같은 Chrome)에서 코드를 알려 주세요.',
    };
  }
  const raw = normalizeClassJoinCode(input);
  if (!raw) {
    return { ok: false, error: '학급 코드를 입력해 주세요.' };
  }
  if (raw !== room.code) {
    return { ok: false, error: '코드가 맞지 않아요. 선생님께 다시 확인해 주세요.' };
  }
  setStudentLinkedClassCode(raw);
  return { ok: true, className: room.name };
}

function isStudentClassLinkActive() {
  const room = getClassRoom();
  const link = getStudentLinkedClassCode();
  return !!(room && link && link === room.code);
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

// =====================
// 교사 명단 오버레이 (JSON 행 숨김 + 교사가 추가한 학생)
// =====================

const LS_TEACHER_HIDDEN_JSON_IDS = 'emotion-checkin-teacher-hidden-json-ids';
const LS_TEACHER_CUSTOM_ROSTER = 'emotion-checkin-teacher-custom-roster';

function getTeacherHiddenJsonIds() {
  try {
    const r = localStorage.getItem(LS_TEACHER_HIDDEN_JSON_IDS);
    const a = r ? JSON.parse(r) : [];
    if (!Array.isArray(a)) return [];
    return a
      .map(n => Number(n))
      .filter(n => !Number.isNaN(n) && n > 0);
  } catch (e) {
    return [];
  }
}

function setTeacherHiddenJsonIds(ids) {
  const uniq = [...new Set((ids || []).map(n => Number(n)).filter(n => !Number.isNaN(n) && n > 0))];
  localStorage.setItem(LS_TEACHER_HIDDEN_JSON_IDS, JSON.stringify(uniq));
  notifyEmotionAppSync('teacher-roster');
}

function hideTeacherJsonStudent(numericId) {
  const n = Number(numericId);
  if (Number.isNaN(n) || n <= 0) return;
  const set = new Set(getTeacherHiddenJsonIds());
  set.add(n);
  setTeacherHiddenJsonIds([...set]);
}

function unhideTeacherJsonStudent(numericId) {
  const n = Number(numericId);
  const next = getTeacherHiddenJsonIds().filter(id => id !== n);
  setTeacherHiddenJsonIds(next);
}

function getTeacherCustomRoster() {
  try {
    const r = localStorage.getItem(LS_TEACHER_CUSTOM_ROSTER);
    const a = r ? JSON.parse(r) : [];
    return Array.isArray(a) ? a : [];
  } catch (e) {
    return [];
  }
}

function setTeacherCustomRoster(rows) {
  localStorage.setItem(LS_TEACHER_CUSTOM_ROSTER, JSON.stringify(rows || []));
  notifyEmotionAppSync('teacher-roster');
}

function addTeacherCustomRosterRow(fields) {
  const uid = String((fields && fields.userId) || '')
    .trim()
    .toLowerCase();
  const name = String((fields && fields.name) || '').trim();
  if (!name) return { ok: false, error: '이름을 입력해 주세요.' };
  if (uid && !/^[a-z0-9._-]{3,30}$/.test(uid)) {
    return { ok: false, error: '학생 아이디는 영문 소문자·숫자·._- 만 3~30자예요.' };
  }
  const list = getTeacherCustomRoster();
  const id = 'tc-' + Date.now();
  list.push({
    id,
    userId: uid || '',
    name,
    number: String((fields && fields.number) || '').trim(),
    gradeLabel: String((fields && fields.gradeLabel) || '').trim(),
    classLabel: String((fields && fields.classLabel) || '').trim(),
  });
  setTeacherCustomRoster(list);
  return { ok: true, id };
}

function updateTeacherCustomRosterRow(id, patch) {
  const list = getTeacherCustomRoster();
  const i = list.findIndex(r => r.id === id);
  if (i < 0) return false;
  const row = { ...list[i], ...patch };
  const uid = String(row.userId || '')
    .trim()
    .toLowerCase();
  if (uid && !/^[a-z0-9._-]{3,30}$/.test(uid)) return false;
  row.userId = uid;
  row.name = String(row.name || '').trim();
  if (!row.name) return false;
  row.number = String(row.number || '').trim();
  row.gradeLabel = String(row.gradeLabel || '').trim();
  row.classLabel = String(row.classLabel || '').trim();
  list[i] = row;
  setTeacherCustomRoster(list);
  return true;
}

function removeTeacherCustomRosterRow(id) {
  const list = getTeacherCustomRoster().filter(r => r.id !== id);
  setTeacherCustomRoster(list);
}
