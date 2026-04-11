/* ===========================
   로컬 학생 계정 (비밀번호 해시·검증·JSON 명단 연동)
   학생 앱 회원가입·로그인(auth.js)과 교사 화면 계정 생성에서 공통 사용
=========================== */

function normalizeUserId(userId) {
  return String(userId).trim().toLowerCase();
}

function validateUserId(userId) {
  const s = normalizeUserId(userId);
  if (!/^[a-z0-9._-]{3,30}$/.test(s)) {
    throw new Error('아이디는 영문 소문자·숫자·._- 만, 3~30자여야 해요.');
  }
  return s;
}

async function hashPassword(password) {
  try {
    if (globalThis.crypto && globalThis.crypto.subtle) {
      const enc = new TextEncoder().encode(password + '|emotion-checkin');
      const buf = await globalThis.crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch (e) {}
  let h = 5381;
  const s = password + '|emotion-checkin';
  for (let i = 0; i < s.length; i++) h = (Math.imul(33, h) + s.charCodeAt(i)) | 0;
  return 'fb_' + (h >>> 0).toString(16);
}

/**
 * data/students.json 명단과 userId가 맞으면 프로필 병합·계정에 linkedRosterId 저장
 * @returns {number|null} 연동된 JSON 학생 id, 없으면 null
 */
async function linkStudentLoginToJsonRoster(userId, accOrProfile) {
  if (typeof mergeRosterStudentProfile !== 'function') return null;
  const uid = normalizeUserId(userId);
  const name = (accOrProfile && accOrProfile.name) || '';
  const num =
    accOrProfile && accOrProfile.studentNumber != null
      ? accOrProfile.studentNumber
      : (accOrProfile && accOrProfile.number) || '';
  const gradeLabel = (accOrProfile && accOrProfile.gradeLabel) || '';
  const classLabel = (accOrProfile && accOrProfile.classLabel) || '';
  try {
    const rosterUrl =
      typeof window.emotionCheckinResolve === 'function'
        ? window.emotionCheckinResolve('data/students.json')
        : 'data/students.json';
    const res = await fetch(rosterUrl, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const students = Array.isArray(data.students) ? data.students : [];
    const found = students.find(
      s => String(s.userId || '').toLowerCase() === uid
    );
    if (!found) return null;
    mergeRosterStudentProfile(found.id, {
      name: name,
      number: String(num).trim(),
      gradeLabel: String(gradeLabel).trim(),
      classLabel: String(classLabel).trim(),
    });
    const acc = typeof getLocalAccounts === 'function' ? getLocalAccounts() : {};
    if (acc[uid]) {
      acc[uid].linkedRosterId = found.id;
      if (typeof setLocalAccounts === 'function') setLocalAccounts(acc);
    }
    return found.id;
  } catch (e) {
    return null;
  }
}

/**
 * 학생 로그인 계정 생성 (학생 앱 회원가입·교사 설정 공통)
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function createStudentLoginAccount(params) {
  const p = params || {};
  const name = String(p.name || '').trim();
  const studentNumber = String(p.studentNumber || '').trim();
  const gradeLabel = String(p.gradeLabel || '').trim();
  const classLabel = String(p.classLabel || '').trim();
  const password = p.password || '';
  const password2 = p.password2 || '';
  let userId;
  try {
    userId = validateUserId(p.userId || '');
  } catch (err) {
    return { ok: false, error: err.message };
  }
  if (name.length < 1 || name.length > 30) {
    return { ok: false, error: '이름은 1~30자로 입력해 주세요.' };
  }
  if (studentNumber.length < 1 || studentNumber.length > 20) {
    return { ok: false, error: '번호(자리·출석번호)를 입력해 주세요. (1~20자)' };
  }
  if (!gradeLabel || !classLabel) {
    return { ok: false, error: '학년과 반을 입력해 주세요.' };
  }
  if (password.length < 6) {
    return { ok: false, error: '비밀번호는 6자 이상이에요.' };
  }
  if (password !== password2) {
    return { ok: false, error: '비밀번호가 서로 달라요.' };
  }
  if (typeof getLocalAccounts !== 'function' || typeof setLocalAccounts !== 'function') {
    return { ok: false, error: '저장 기능을 쓸 수 없어요.' };
  }
  const accounts = getLocalAccounts();
  if (accounts[userId]) {
    return { ok: false, error: '이미 사용 중인 아이디예요.' };
  }
  const passwordHash = await hashPassword(password);
  const profile = {
    name: name,
    studentNumber: studentNumber,
    gradeLabel: gradeLabel,
    classLabel: classLabel,
    passwordHash: passwordHash,
    createdAt: new Date().toISOString(),
  };
  accounts[userId] = profile;
  setLocalAccounts(accounts);
  const linkedId = await linkStudentLoginToJsonRoster(userId, profile);
  if (linkedId == null && typeof getTeacherCustomRoster === 'function' && typeof addTeacherCustomRosterRow === 'function') {
    const custom = getTeacherCustomRoster();
    const exists = custom.some(
      r => String(r.userId || '').trim().toLowerCase() === userId
    );
    if (!exists) {
      addTeacherCustomRosterRow({
        userId,
        name,
        number: studentNumber,
        gradeLabel,
        classLabel,
      });
    }
  }
  if (typeof notifyEmotionAppSync === 'function') notifyEmotionAppSync('profile');
  return { ok: true };
}
