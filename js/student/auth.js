/* ===========================
   js/student/auth.js
   내부 로그인 (Firebase 없음). 계정은 회원가입 또는 교사 설정에서 생성.
   계정: getLocalAccounts / setLocalAccounts (storage.js)
   공통: createStudentLoginAccount, hashPassword, validateUserId, linkStudentLoginToJsonRoster → student-accounts.js
=========================== */

const LS_SESSION_USER_KEY = 'emotion-checkin-logged-user';
const LS_SN_KEY = 'emotion-checkin-student-number';
const LS_GRADE_KEY = 'emotion-checkin-grade-label';
const LS_CLASS_KEY = 'emotion-checkin-class-label';

let currentUserProfile = null;
let currentLoginId = null;

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

function setStudentAuthTab(mode) {
  const isSignup = mode === 'signup';
  const tabLogin = document.getElementById('auth-tab-login');
  const tabSignup = document.getElementById('auth-tab-signup');
  const panelLogin = document.getElementById('auth-panel-login');
  const panelSignup = document.getElementById('auth-panel-signup');
  if (tabLogin) {
    tabLogin.classList.toggle('active', !isSignup);
    tabLogin.setAttribute('aria-selected', !isSignup ? 'true' : 'false');
  }
  if (tabSignup) {
    tabSignup.classList.toggle('active', isSignup);
    tabSignup.setAttribute('aria-selected', isSignup ? 'true' : 'false');
  }
  if (panelLogin) panelLogin.style.display = isSignup ? 'none' : 'block';
  if (panelSignup) panelSignup.style.display = isSignup ? 'block' : 'none';
  setAuthError('auth-error-login', '');
  setAuthError('auth-error-signup', '');
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
  notifyEmotionAppSync('profile');
  if (typeof updateStudentClassLinkUiAll === 'function') updateStudentClassLinkUiAll();
  return true;
}

function clearSession() {
  currentLoginId = null;
  currentUserProfile = null;
  localStorage.removeItem(LS_SESSION_USER_KEY);
  clearSessionExtras();
  setEmotionStorageUid(null);
  notifyEmotionAppSync('profile');
  if (typeof updateStudentClassLinkUiAll === 'function') updateStudentClassLinkUiAll();
}

function updateHomeAndSettings(acc, loginId) {
  const name = (acc.name || '학생').trim();
  const homeName = document.getElementById('home-display-name');
  const titleEl = document.getElementById('settings-profile-name');
  const summaryEl = document.getElementById('profile-readonly-summary');
  if (homeName) homeName.textContent = name;
  if (titleEl) titleEl.textContent = name;
  const sn = (acc.studentNumber || '').trim();
  const gr = (acc.gradeLabel || '').trim();
  const cl = (acc.classLabel || '').trim();
  const parts = [];
  if (sn) parts.push('번호 ' + sn);
  if (gr) parts.push(gr);
  if (cl) parts.push(cl);
  if (loginId) parts.push('로그인 ID · ' + loginId);
  if (summaryEl) summaryEl.textContent = parts.length ? parts.join(' · ') : '';
}

function onAuthOk() {
  showStudentPhone();
  if (typeof onStudentLogin === 'function') onStudentLogin();
}

function wireAuthForms() {
  document.querySelectorAll('[data-auth-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const m = btn.getAttribute('data-auth-tab');
      if (m === 'login' || m === 'signup') setStudentAuthTab(m);
    });
  });

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
          '아이디 또는 비밀번호가 맞지 않아요. 처음이면 회원가입으로 계정을 만들 수 있어요.'
        );
        return;
      }
      const h = await hashPassword(password);
      if (h !== acc.passwordHash) {
        setAuthError(
          'auth-error-login',
          '아이디 또는 비밀번호가 맞지 않아요. 처음이면 회원가입으로 계정을 만들 수 있어요.'
        );
        return;
      }
      applySession(userId);
      void linkStudentLoginToJsonRoster(userId, acc);
      onAuthOk();
    });
  }

  const formSignup = document.getElementById('form-signup');
  if (formSignup && typeof createStudentLoginAccount === 'function') {
    formSignup.addEventListener('submit', async function (e) {
      e.preventDefault();
      setAuthError('auth-error-signup', '');
      const res = await createStudentLoginAccount({
        name: document.getElementById('signup-name').value,
        gradeLabel: document.getElementById('signup-grade').value,
        classLabel: document.getElementById('signup-class').value,
        studentNumber: document.getElementById('signup-student-number').value,
        userId: document.getElementById('signup-userid').value,
        password: document.getElementById('signup-password').value,
        password2: document.getElementById('signup-password2').value,
      });
      if (!res.ok) {
        setAuthError('auth-error-signup', res.error || '가입할 수 없어요.');
        return;
      }
      let userId;
      try {
        userId = validateUserId(document.getElementById('signup-userid').value);
      } catch (err) {
        setAuthError('auth-error-signup', err.message);
        return;
      }
      formSignup.reset();
      setStudentAuthTab('login');
      const loginId = document.getElementById('login-userid');
      if (loginId) loginId.value = userId;
      const loginPw = document.getElementById('login-password');
      if (loginPw) loginPw.focus();
      const acc = getAccounts()[userId];
      if (acc) {
        applySession(userId);
        void linkStudentLoginToJsonRoster(userId, acc);
        onAuthOk();
      }
    });
  }
}

window.signOutStudent = function () {
  clearSession();
  showAuthGate();
  setAuthError('auth-error-global', '');
  setStudentAuthTab('login');
  if (typeof updateStudentClassLinkUiAll === 'function') updateStudentClassLinkUiAll();
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
