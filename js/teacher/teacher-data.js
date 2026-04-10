/* ===========================
   js/teacher/teacher-data.js

   반 명단: data/students.json (단일 소스)
   DATA_MODE:
     • hybrid — JSON 명단 + 설정 이름과 같은 학생은 학생 앱 localStorage 기록으로 교체
     • mock   — JSON 명단만
     • local  — 로컬 기록 한 명만

   (선택) 나중에 서버·Firebase 연동 시 FIREBASE_MODE 와 fetch* TODO 를 구현하면 됩니다.
=========================== */

const DATA_MODE = 'hybrid'; // 'mock' | 'local' | 'hybrid'
const FIREBASE_MODE = false;

const LOCAL_STUDENT_ID = 'local-1';
const LS_USER_NAME_KEY = 'emotion-checkin-user-name';
const STUDENTS_JSON_URL = 'data/students.json';

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
    const res = await fetch(STUDENTS_JSON_URL, { cache: 'no-store' });
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
  const base = rosterWithProfiles(await loadRosterFromJson());
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
  } else if (mapped.length > 0 || localName || localNum || loginId) {
    base.unshift({
      id: LOCAL_STUDENT_ID,
      name: localName || '이 PC 학생',
      number: localNum || '연동',
      gradeLabel:
        (typeof localStorage !== 'undefined' &&
          localStorage.getItem('emotion-checkin-grade-label')) ||
        '',
      classLabel:
        (typeof localStorage !== 'undefined' &&
          localStorage.getItem('emotion-checkin-class-label')) ||
        '',
      emotions: mapped
    });
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
  return rosterWithProfiles(await loadRosterFromJson());
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
  const roster = rosterWithProfiles(await loadRosterFromJson());
  return roster.find(s => s.id === studentId);
}

function isAlertStudent(student) {
  const alertEmos = ['😢', '😡'];
  const recent = student.emotions.slice(0, 3);
  return recent.length >= 3 && recent.every(e => alertEmos.includes(e.emo));
}

function hasTodayRecord(student) {
  if (student.emotions.length === 0) return false;
  const todayStr = new Date().toDateString();
  return new Date(student.emotions[0].date).toDateString() === todayStr;
}
