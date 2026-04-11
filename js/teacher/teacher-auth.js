/* ===========================
   js/teacher/teacher-auth.js
   교사 대시보드 로그인·회원가입 (이 브라우저 localStorage)
=========================== */

const LS_TEACHER_SESSION_KEY = 'emotion-checkin-teacher-user';
/**
 * 출품용 고정 인증코드. Firebase Auth·Cloud Functions 등으로 서버 검증 시 이 상수는 제거합니다.
 */
const TEACHER_AUTH_CODE = '5678';

function validateTeacherAuthCodeInput(inputId, form) {
  const raw = (
    (document.getElementById(inputId) || {}).value || ''
  ).trim();
  if (raw !== TEACHER_AUTH_CODE) {
    setTeacherFormError(form, '교사 인증코드가 올바르지 않아요.');
    return false;
  }
  return true;
}

function normalizeTeacherUserId(userId) {
  return String(userId).trim().toLowerCase();
}

function validateTeacherUserId(userId) {
  const s = normalizeTeacherUserId(userId);
  if (!/^[a-z0-9._-]{3,30}$/.test(s)) {
    throw new Error('아이디는 영문 소문자·숫자·._- 만, 3~30자여야 해요.');
  }
  return s;
}

async function hashTeacherPassword(password) {
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

function teacherAccounts() {
  return typeof getTeacherAccounts === 'function' ? getTeacherAccounts() : {};
}

function saveTeacherAccounts(obj) {
  if (typeof setTeacherAccounts === 'function') setTeacherAccounts(obj);
}

function setTeacherFormError(form, msg) {
  const id =
    form === 'signup' ? 'teacher-auth-error-signup' : 'teacher-auth-error-login';
  const el = document.getElementById(id);
  if (el) el.textContent = msg || '';
}

function showTeacherAuthGate() {
  const gate = document.getElementById('teacher-auth-gate');
  const shell = document.getElementById('teacher-app-shell');
  if (gate) gate.style.display = 'flex';
  if (shell) shell.style.display = 'none';
}

function showTeacherAppShell() {
  const gate = document.getElementById('teacher-auth-gate');
  const shell = document.getElementById('teacher-app-shell');
  if (gate) gate.style.display = 'none';
  if (shell) shell.style.display = 'block';
  refreshTeacherSessionLabel();
  if (typeof updateTeacherHeaderClassLabel === 'function') updateTeacherHeaderClassLabel();
}

function refreshTeacherSessionLabel() {
  const el = document.getElementById('teacher-session-label');
  const id = localStorage.getItem(LS_TEACHER_SESSION_KEY);
  if (!el) return;
  if (!id) {
    el.textContent = '';
    return;
  }
  const acc = teacherAccounts()[id];
  const name = acc && acc.name ? String(acc.name).trim() : '';
  el.textContent = name ? `${name} · ` : `${id} · `;
}

function clearTeacherSession() {
  localStorage.removeItem(LS_TEACHER_SESSION_KEY);
}

function getValidTeacherSessionId() {
  const id = localStorage.getItem(LS_TEACHER_SESSION_KEY);
  if (!id) return null;
  if (!teacherAccounts()[id]) {
    clearTeacherSession();
    return null;
  }
  return id;
}

function switchTeacherAuthTab(isSignup) {
  const formLogin = document.getElementById('form-teacher-login');
  const formSignup = document.getElementById('form-teacher-signup');
  const tabLogin = document.getElementById('teacher-tab-login');
  const tabSignup = document.getElementById('teacher-tab-signup');
  if (formLogin) formLogin.style.display = isSignup ? 'none' : 'block';
  if (formSignup) formSignup.style.display = isSignup ? 'block' : 'none';
  if (tabLogin) tabLogin.classList.toggle('active', !isSignup);
  if (tabSignup) tabSignup.classList.toggle('active', !!isSignup);
  setTeacherFormError('login', '');
  setTeacherFormError('signup', '');
  const loginCode = document.getElementById('teacher-login-auth-code');
  const signupCode = document.getElementById('teacher-signup-auth-code');
  if (loginCode) loginCode.value = '';
  if (signupCode) signupCode.value = '';
}

function wireTeacherAuth() {
  const tabLogin = document.getElementById('teacher-tab-login');
  const tabSignup = document.getElementById('teacher-tab-signup');
  if (tabLogin) {
    tabLogin.addEventListener('click', function () {
      switchTeacherAuthTab(false);
    });
  }
  if (tabSignup) {
    tabSignup.addEventListener('click', function () {
      switchTeacherAuthTab(true);
    });
  }

  const formLogin = document.getElementById('form-teacher-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async function (e) {
      e.preventDefault();
      setTeacherFormError('login', '');
      let userId;
      try {
        userId = validateTeacherUserId(
          document.getElementById('teacher-login-userid').value
        );
      } catch (err) {
        setTeacherFormError('login', err.message);
        return;
      }
      if (!validateTeacherAuthCodeInput('teacher-login-auth-code', 'login')) return;
      const password = document.getElementById('teacher-login-password').value;
      const accounts = teacherAccounts();
      const acc = accounts[userId];
      if (!acc) {
        setTeacherFormError('login', '아이디 또는 비밀번호가 맞지 않아요.');
        return;
      }
      const h = await hashTeacherPassword(password);
      if (h !== acc.passwordHash) {
        setTeacherFormError('login', '아이디 또는 비밀번호가 맞지 않아요.');
        return;
      }
      localStorage.setItem(LS_TEACHER_SESSION_KEY, userId);
      showTeacherAppShell();
      if (typeof initTeacherDashboard === 'function') await initTeacherDashboard();
    });
  }

  const formSignup = document.getElementById('form-teacher-signup');
  if (formSignup) {
    formSignup.addEventListener('submit', async function (e) {
      e.preventDefault();
      setTeacherFormError('signup', '');
      const name = document.getElementById('teacher-signup-name').value.trim();
      let userId;
      try {
        userId = validateTeacherUserId(
          document.getElementById('teacher-signup-userid').value
        );
      } catch (err) {
        setTeacherFormError('signup', err.message);
        return;
      }
      if (!validateTeacherAuthCodeInput('teacher-signup-auth-code', 'signup')) return;
      const password = document.getElementById('teacher-signup-password').value;
      const password2 = document.getElementById('teacher-signup-password2').value;
      if (name.length < 1 || name.length > 30) {
        setTeacherFormError('signup', '이름은 1~30자로 입력해 주세요.');
        return;
      }
      if (password.length < 6) {
        setTeacherFormError('signup', '비밀번호는 6자 이상이에요.');
        return;
      }
      if (password !== password2) {
        setTeacherFormError('signup', '비밀번호가 서로 달라요.');
        return;
      }
      const accounts = teacherAccounts();
      if (accounts[userId]) {
        setTeacherFormError('signup', '이미 사용 중인 아이디예요.');
        return;
      }
      const passwordHash = await hashTeacherPassword(password);
      accounts[userId] = {
        name: name,
        passwordHash: passwordHash,
        createdAt: new Date().toISOString(),
      };
      saveTeacherAccounts(accounts);
      localStorage.setItem(LS_TEACHER_SESSION_KEY, userId);
      showTeacherAppShell();
      if (typeof initTeacherDashboard === 'function') await initTeacherDashboard();
    });
  }

  const logoutBtn = document.getElementById('teacher-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      clearTeacherSession();
      location.reload();
    });
  }
}

window.teacherSignOut = function () {
  clearTeacherSession();
  location.reload();
};

document.addEventListener('DOMContentLoaded', function () {
  wireTeacherAuth();
  try {
    if (sessionStorage.getItem('emotion-teacher-account-deleted') === '1') {
      sessionStorage.removeItem('emotion-teacher-account-deleted');
      const hint = document.getElementById('teacher-auth-post-delete-hint');
      if (hint) {
        hint.removeAttribute('hidden');
        hint.textContent =
          '계정이 삭제되어 로그아웃되었어요. 교사·학급 관련 이 기기 저장 데이터도 함께 지워졌어요.';
        hint.classList.remove('teacher-auth-msg--error');
      }
    }
  } catch (e) {}
  if (getValidTeacherSessionId()) {
    showTeacherAppShell();
    if (typeof initTeacherDashboard === 'function') void initTeacherDashboard();
  } else {
    showTeacherAuthGate();
  }
});
