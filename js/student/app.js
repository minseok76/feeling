/* ===========================
   js/student/app.js
   앱 시작, 화면 전환 제어
   가장 먼저 실행되는 파일이에요
=========================== */

// 화면 전환 함수
// id 예: 'home', 'hist', 'stat', 'set'
function showScreen(id) {
  // 모든 화면 숨기기
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  // 모든 네비 버튼 비활성화
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  // 선택한 화면 보이기
  document.getElementById('s-' + id).classList.add('active');

  // 선택한 네비 버튼 활성화
  const navBtn = document.getElementById('nb-' + id);
  if (navBtn) navBtn.classList.add('active');

  // 통계 화면 열 때 차트 다시 그리기
  if (id === 'stat') renderStats();
  if (id === 'home' && typeof renderTeacherBanner === 'function') renderTeacherBanner();
  if (id !== 'set' && typeof lockStudentProfileFields === 'function')
    lockStudentProfileFields();
}

// 로그인 직후 (auth.js에서 호출)
function onStudentLogin() {
  renderAll();
  if (typeof renderTeacherBanner === 'function') renderTeacherBanner();
}

// 앱이 처음 실행될 때
document.addEventListener('DOMContentLoaded', function () {
  console.log('감정 체크인 앱 시작!');

  setupStudentSync();

  if (typeof initStudentTheme === 'function') initStudentTheme();

  const bannerClose = document.getElementById('teacher-banner-close');
  if (bannerClose) {
    bannerClose.addEventListener('click', function () {
      const msg = typeof getTeacherMessage === 'function' ? getTeacherMessage() : null;
      if (msg && msg.at) {
        sessionStorage.setItem('emotion-banner-dismissed-at', msg.at);
      }
      const wrap = document.getElementById('teacher-banner');
      if (wrap) wrap.style.display = 'none';
    });
  }

  renderAll();
});

function syncProfileUiFromAccounts() {
  const uid = localStorage.getItem('emotion-checkin-logged-user');
  if (
    !uid ||
    typeof getLocalAccounts !== 'function' ||
    typeof updateHomeAndSettings !== 'function'
  )
    return;
  const acc = getLocalAccounts()[uid];
  if (acc) updateHomeAndSettings(acc, uid);
}

function setupStudentSync() {
  window.addEventListener('storage', function (e) {
    if (!e.key) return;
    if (e.key === 'emotion-checkin-teacher-msg') renderTeacherBanner();
    if (e.key === 'emotions' || (e.key.indexOf('emotions_') === 0)) renderAll();
    if (e.key === 'emotion-checkin-theme') {
      if (typeof syncStudentThemeFromOtherTab === 'function') syncStudentThemeFromOtherTab();
    }
    if (
      e.key === 'emotion-checkin-user-name' ||
      e.key === 'emotion-checkin-active-uid' ||
      e.key === 'emotion-checkin-roster-profiles' ||
      e.key === 'emotion-checkin-accounts' ||
      e.key === 'emotion-checkin-student-number' ||
      e.key === 'emotion-checkin-grade-label' ||
      e.key === 'emotion-checkin-class-label'
    ) {
      if (
        e.key === 'emotion-checkin-accounts' ||
        e.key === 'emotion-checkin-roster-profiles'
      )
        syncProfileUiFromAccounts();
      renderAll();
    }
  });
  try {
    const ch = new BroadcastChannel('emotion-checkin');
    ch.onmessage = function (ev) {
      const k = ev.data && ev.data.kind;
      if (k === 'teacher-msg') renderTeacherBanner();
      else if (k === 'emotions' || k === 'profile') {
        if (k === 'profile') syncProfileUiFromAccounts();
        renderAll();
      }
    };
  } catch (e) {}
}
