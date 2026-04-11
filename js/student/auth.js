/* ===========================
   js/student/auth.js
   내부 로그인 (Firebase 없음). 계정 생성은 교사 설정 화면에서만 합니다.
   계정: getLocalAccounts / setLocalAccounts (storage.js)
   공통: hashPassword, validateUserId, linkStudentLoginToJsonRoster → student-accounts.js
=========================== */

const LS_SESSION_USER_KEY = 'emotion-checkin-logged-user';
const LS_SN_KEY = 'emotion-checkin-student-number';
const LS_GRADE_KEY = 'emotion-checkin-grade-label';
const LS_CLASS_KEY = 'emotion-checkin-class-label';

let currentUserProfile = null;
let currentLoginId = null;

const PROFILE_FIELD_IDS = [
  'user-name',
  'user-school-number',
  'user-grade',
  'user-class',
];

function lockStudentProfileFields() {
  PROFILE_FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = true;
  });
  const pw = document.getElementById('settings-profile-password');
  if (pw) pw.value = '';
  const err = document.getElementById('settings-profile-unlock-error');
  if (err) err.textContent = '';
  const ok = document.getElementById('settings-profile-unlocked-msg');
  if (ok) ok.style.display = 'none';
}

function unlockStudentProfileFields() {
  PROFILE_FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = false;
  });
  const ok = document.getElementById('settings-profile-unlocked-msg');
  if (ok) ok.style.display = 'block';
}

function setSettingsUnlockError(msg) {
  const err = document.getElementById('settings-profile-unlock-error');
  if (err) err.textContent = msg || '';
}

async function tryUnlockProfileWithPassword() {
  setSettingsUnlockError('');
  if (!currentLoginId) {
    setSettingsUnlockError('로그인이 필요해요.');
    return;
  }
  const pwEl = document.getElementById('settings-profile-password');
  const password = pwEl ? pwEl.value : '';
  if (!password || password.length < 6) {
    setSettingsUnlockError('비밀번호를 입력해 주세요. (6자 이상)');
    return;
  }
  const acc = getAccounts()[currentLoginId];
  if (!acc) {
    setSettingsUnlockError('계정을 찾을 수 없어요.');
    return;
  }
  const h = await hashPassword(password);
  if (h !== acc.passwordHash) {
    setSettingsUnlockError('비밀번호가 맞지 않아요.');
    return;
  }
  if (pwEl) pwEl.value = '';
  unlockStudentProfileFields();
}

function wireSettingsProfileUnlock() {
  const btn = document.getElementById('btn-unlock-profile');
  if (!btn || btn.dataset.unlockWired === '1') return;
  btn.dataset.unlockWired = '1';
  btn.addEventListener('click', function () {
    void tryUnlockProfileWithPassword();
  });
  const pwEl = document.getElementById('settings-profile-password');
  if (pwEl && pwEl.dataset.unlockEnterWired !== '1') {
    pwEl.dataset.unlockEnterWired = '1';
    pwEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      void tryUnlockProfileWithPassword();
    });
  }
}

function getAccounts() {
  return typeof getLocalAccounts === 'function' ? getLocalAccounts() : {};
}

function setAccounts(obj) {
  if (typeof setLocalAccounts === 'function') setLocalAccounts(obj);
}

function storageUidForLoginId(loginId) {
  return 'local_' + loginId;
}

function setAuthError(elId, msg) {
  const el = document.getElementById(elId);
  if (el) el.textContent = msg || '';
}

function showAuthGate() {
  const gate = document.getElementById('auth-gate');
  const phone = document.getElementById('phone');
  if (gate) gate.style.display = 'flex';
  if (phone) phone.style.display = 'none';
}

function showStudentPhone() {
  const gate = document.getElementById('auth-gate');
  const phone = document.getElementById('phone');
  if (gate) gate.style.display = 'none';
  if (phone) phone.style.display = 'flex';
}

function migrateLegacyEmotions(uid) {
  const legacy = localStorage.getItem('emotions');
  const key = 'emotions_' + uid;
  if (legacy && !localStorage.getItem(key)) {
    localStorage.setItem(key, legacy);
  }
}

function syncSessionExtrasFromAccount(acc) {
  localStorage.setItem(LS_SN_KEY, (acc.studentNumber || '').trim());
  localStorage.setItem(LS_GRADE_KEY, (acc.gradeLabel || '').trim());
  localStorage.setItem(LS_CLASS_KEY, (acc.classLabel || '').trim());
}

function clearSessionExtras() {
  localStorage.removeItem(LS_SN_KEY);
  localStorage.removeItem(LS_GRADE_KEY);
  localStorage.removeItem(LS_CLASS_KEY);
}

function applySession(loginId) {
  const accounts = getAccounts();
  const acc = accounts[loginId];
  if (!acc) return false;

  currentLoginId = loginId;
  currentUserProfile = {
    name: acc.name,
    userId: loginId,
    studentNumber: acc.studentNumber,
    gradeLabel: acc.gradeLabel,
    classLabel: acc.classLabel,
    linkedRosterId: acc.linkedRosterId,
  };
  const name = (acc.name || '학생').trim();
  localStorage.setItem(LS_SESSION_USER_KEY, loginId);
  localStorage.setItem('emotion-checkin-user-name', name);
  syncSessionExtrasFromAccount(acc);
  const uid = storageUidForLoginId(loginId);
  setEmotionStorageUid(uid);
  migrateLegacyEmotions(uid);
  updateHomeAndSettings(acc, loginId);
  lockStudentProfileFields();
  notifyEmotionAppSync('profile');
  return true;
}

function clearSession() {
  currentLoginId = null;
  currentUserProfile = null;
  localStorage.removeItem(LS_SESSION_USER_KEY);
  clearSessionExtras();
  setEmotionStorageUid(null);
  lockStudentProfileFields();
  notifyEmotionAppSync('profile');
}

function updateHomeAndSettings(acc, loginId) {
  const name = (acc.name || '학생').trim();
  const homeName = document.getElementById('home-display-name');
  const nameInput = document.getElementById('user-name');
  const idEl = document.getElementById('profile-login-id');
  const snEl = document.getElementById('user-school-number');
  const grEl = document.getElementById('user-grade');
  const clEl = document.getElementById('user-class');
  if (homeName) homeName.textContent = name;
  if (nameInput) nameInput.value = name;
  if (idEl) idEl.textContent = loginId ? '로그인 ID · ' + loginId : '';
  if (snEl) snEl.value = (acc.studentNumber || '').trim();
  if (grEl) grEl.value = (acc.gradeLabel || '').trim();
  if (clEl) clEl.value = (acc.classLabel || '').trim();
}

function pushProfileToRosterIfLinked(loginId, acc) {
  const rid = acc.linkedRosterId;
  if (rid == null || typeof mergeRosterStudentProfile !== 'function') return;
  mergeRosterStudentProfile(rid, {
    name: acc.name,
    number: acc.studentNumber,
    gradeLabel: acc.gradeLabel,
    classLabel: acc.classLabel,
  });
}

function wireNameSync() {
  const nameInput = document.getElementById('user-name');
  if (nameInput && nameInput.dataset.authWired !== '1') {
    nameInput.dataset.authWired = '1';
    nameInput.addEventListener('change', function () {
      const v = nameInput.value.trim();
      localStorage.setItem('emotion-checkin-user-name', v || '학생');
      notifyEmotionAppSync('profile');
      const homeName = document.getElementById('home-display-name');
      if (homeName) homeName.textContent = v || '학생';
      if (currentLoginId) {
        const accounts = getAccounts();
        if (accounts[currentLoginId]) {
          accounts[currentLoginId].name = v;
          setAccounts(accounts);
          pushProfileToRosterIfLinked(currentLoginId, accounts[currentLoginId]);
          if (currentUserProfile) currentUserProfile.name = v;
        }
      }
    });
  }

  if (document.getElementById('user-school-number')?.dataset.schoolWired === '1')
    return;
  ['user-school-number', 'user-grade', 'user-class'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.dataset.schoolWired = '1';
    el.addEventListener('change', function () {
      if (!currentLoginId) return;
      const accounts = getAccounts();
      const a = accounts[currentLoginId];
      if (!a) return;
      const sn = (document.getElementById('user-school-number') || {}).value || '';
      const gr = (document.getElementById('user-grade') || {}).value || '';
      const cl = (document.getElementById('user-class') || {}).value || '';
      a.studentNumber = sn.trim();
      a.gradeLabel = gr.trim();
      a.classLabel = cl.trim();
      setAccounts(accounts);
      syncSessionExtrasFromAccount(a);
      pushProfileToRosterIfLinked(currentLoginId, a);
      notifyEmotionAppSync('profile');
    });
  });
}

function onAuthOk() {
  showStudentPhone();
  wireNameSync();
  wireSettingsProfileUnlock();
  if (typeof onStudentLogin === 'function') onStudentLogin();
}

function wireAuthForms() {
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async function (e) {
      e.preventDefault();
      setAuthError('auth-error-login', '');
      let userId;
      try {
        userId = validateUserId(document.getElementById('login-userid').value);
      } catch (err) {
        setAuthError('auth-error-login', err.message);
        return;
      }
      const password = document.getElementById('login-password').value;
      const accounts = getAccounts();
      const acc = accounts[userId];
      if (!acc) {
        setAuthError(
          'auth-error-login',
          '아이디 또는 비밀번호가 맞지 않아요. 계정은 교사 대시보드 설정에서 만든 뒤 안내해 주세요.'
        );
        return;
      }
      const h = await hashPassword(password);
      if (h !== acc.passwordHash) {
        setAuthError(
          'auth-error-login',
          '아이디 또는 비밀번호가 맞지 않아요. 계정은 교사 대시보드 설정에서 만든 뒤 안내해 주세요.'
        );
        return;
      }
      applySession(userId);
      void linkStudentLoginToJsonRoster(userId, acc);
      onAuthOk();
    });
  }
}

window.signOutStudent = function () {
  clearSession();
  showAuthGate();
  setAuthError('auth-error-global', '');
};

document.addEventListener('DOMContentLoaded', function () {
  const globalErr = document.getElementById('auth-error-global');
  if (globalErr) globalErr.textContent = '';

  wireAuthForms();

  const saved = localStorage.getItem(LS_SESSION_USER_KEY);
  if (saved && applySession(saved)) {
    void linkStudentLoginToJsonRoster(saved, getAccounts()[saved] || {});
    onAuthOk();
  } else {
    clearSession();
    showAuthGate();
  }
});
