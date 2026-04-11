/* ===========================
   js/teacher/teacher-data.js

   반 명단: data/students.json (단일 소스)
   DATA_MODE:
     • hybrid — JSON(·교사 수동 명단)에 있는 학생만 표시. userId·이름·번호로 매칭되면 해당 행에 감정 기록 병합. 명단에 없는 로컬 가입 학생은 표시하지 않음
     • mock   — JSON 명단만
     • local  — 로컬 기록 한 명만

   (선택) 나중에 서버·Firebase 연동 시 FIREBASE_MODE 와 fetch* TODO 를 구현하면 됩니다.
=========================== */

const DATA_MODE = 'hybrid'; // 'mock' | 'local' | 'hybrid'
const FIREBASE_MODE = false;

const LOCAL_STUDENT_ID = 'local-1';
const LS_USER_NAME_KEY = 'emotion-checkin-user-name';
function getStudentsJsonUrl() {
  return typeof window.emotionCheckinResolve === 'function'
    ? window.emotionCheckinResolve('data/students.json')
    : 'data/students.json';
}

let rosterCache = null;

function cloneRoster(list) {
  return list.map(s => ({
    id: s.id,
    name: s.name,
    number: s.number,
    userId: s.userId,
    gradeLabel: s.gradeLabel,
    classLabel: s.classLabel,
    emotions: (s.emotions || []).map(e => ({
      emo: e.emo,
      label: e.label,
      note: e.note || '',
      date: e.date
    }))
  }));
}

function normalizeSchoolNumber(n) {
  return String(n || '')
    .trim()
    .replace(/\s/g, '')
    .replace(/번$/i, '')
    .toLowerCase();
}

async function loadRosterFromJson() {
  if (rosterCache) return rosterCache;
  try {
    const res = await fetch(getStudentsJsonUrl(), { cache: 'no-store' });
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    const raw = Array.isArray(data.students) ? data.students : [];
    const meta = data.meta || {};
    const g0 = meta.gradeLabel || '고등학교 2학년';
    const c0 = meta.classLabel || '3반';
    rosterCache = raw.map(s => ({
      id: s.id,
      name: s.name,
      number: s.number || '',
      userId: s.userId,
      gradeLabel: s.gradeLabel || g0,
      classLabel: s.classLabel || c0,
      emotions: Array.isArray(s.emotions) ? s.emotions : []
    }));
  } catch (e) {
    console.warn(
      'data/students.json 을 불러오지 못했어요. Live Server로 열었는지 확인하세요.',
      e
    );
    rosterCache = [];
  }
  return rosterCache;
}

function rosterWithProfiles(list) {
  if (typeof applyRosterProfilesToStudents === 'function') {
    return applyRosterProfilesToStudents(cloneRoster(list));
  }
  return cloneRoster(list);
}

/** JSON 명단에서 교사가 숨긴 행 제외 + 교사 추가 학생 병합 후 프로필 오버레이 */
async function buildBaseRosterMerged() {
  const raw = await loadRosterFromJson();
  const hidden =
    typeof getTeacherHiddenJsonIds === 'function'
      ? new Set(getTeacherHiddenJsonIds())
      : new Set();
  const filtered = raw.filter(s => !hidden.has(Number(s.id)));
  const base = cloneRoster(filtered);
  const rows =
    typeof getTeacherCustomRoster === 'function' ? getTeacherCustomRoster() : [];
  const custom = rows.map(r => ({
    id: r.id,
    userId: r.userId ? String(r.userId).trim().toLowerCase() : undefined,
    name: String(r.name || '').trim() || '이름 없음',
    number: String(r.number || '').trim(),
    gradeLabel: String(r.gradeLabel || '').trim(),
    classLabel: String(r.classLabel || '').trim(),
    emotions: [],
  }));
  return rosterWithProfiles([...base, ...custom]);
}

function buildStudentsFromLocalStorage() {
  if (typeof getEmotions !== 'function') return [];

  const raw = getEmotions();
  const name =
    (typeof localStorage !== 'undefined' && localStorage.getItem(LS_USER_NAME_KEY)) ||
    '로컬 기록';

  const emotions = raw.map(e => ({
    emo: e.emo,
    label: e.label,
    note: e.note || '',
    date: e.date
  }));

  const sn =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('emotion-checkin-student-number') || ''
      : '';
  const gr =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('emotion-checkin-grade-label') || ''
      : '';
  const cl =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('emotion-checkin-class-label') || ''
      : '';
  return [
    {
      id: LOCAL_STUDENT_ID,
      name: name.trim() || '로컬 기록',
      number: sn.trim() || 'PC',
      gradeLabel: gr.trim(),
      classLabel: cl.trim(),
      emotions: emotions
    }
  ];
}

async function buildHybridStudents() {
  const base = await buildBaseRosterMerged();
  if (typeof getEmotions !== 'function') return base;

  const raw = getEmotions();
  const localName = (
    (typeof localStorage !== 'undefined' && localStorage.getItem(LS_USER_NAME_KEY)) ||
    ''
  ).trim();
  const loginId = (
    (typeof localStorage !== 'undefined' &&
      localStorage.getItem('emotion-checkin-logged-user')) ||
    ''
  )
    .trim()
    .toLowerCase();
  const localNum = (
    (typeof localStorage !== 'undefined' &&
      localStorage.getItem('emotion-checkin-student-number')) ||
    ''
  ).trim();

  const mapped = raw.map(e => ({
    emo: e.emo,
    label: e.label,
    note: e.note || '',
    date: e.date
  }));

  let idx = -1;
  if (loginId) {
    idx = base.findIndex(
      s => s.userId && String(s.userId).toLowerCase() === loginId
    );
  }
  if (idx < 0 && localName) {
    idx = base.findIndex(s => s.name === localName);
  }
  if (idx < 0 && localNum) {
    const n0 = normalizeSchoolNumber(localNum);
    idx = base.findIndex(s => normalizeSchoolNumber(s.number) === n0);
  }

  if (idx >= 0) {
    base[idx] = { ...base[idx], emotions: mapped };
  }

  return base;
}

async function fetchAllStudents() {
  if (FIREBASE_MODE) {
    // TODO: Firestore에서 학급 목록 불러오기
    // const snapshot = await db.collection('students').get();
    // return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  if (DATA_MODE === 'local') {
    return buildStudentsFromLocalStorage();
  }
  if (DATA_MODE === 'hybrid') {
    return buildHybridStudents();
  }
  return buildBaseRosterMerged();
}

async function fetchStudent(studentId) {
  if (FIREBASE_MODE) {
    // TODO
  }
  if (DATA_MODE === 'local') {
    const list = buildStudentsFromLocalStorage();
    return list.find(s => s.id === studentId);
  }
  if (DATA_MODE === 'hybrid') {
    const list = await buildHybridStudents();
    return list.find(s => s.id === studentId);
  }
  const roster = await buildBaseRosterMerged();
  return roster.find(s => s.id === studentId);
}

function isAlertStudent(student) {
  const alertEmos = ['😢', '😡'];
  const recent = (student.emotions || []).slice(0, 3);
  return recent.length >= 3 && recent.every(e => alertEmos.includes(e.emo));
}

function hasTodayRecord(student) {
  const emo = student.emotions || [];
  if (emo.length === 0) return false;
  const todayStr = new Date().toDateString();
  return new Date(emo[0].date).toDateString() === todayStr;
}
