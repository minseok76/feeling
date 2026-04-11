/* ===========================
   학생 앱 — 학급 코드로 연결 (설정 화면에서만)
=========================== */

function setStudentClassUiMsg(elId, msg, isError) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('auth-msg--error', !!isError);
}

function updateStudentClassLinkUiAll() {
  const linked = typeof isStudentClassLinkActive === 'function' && isStudentClassLinkActive();
  const room = typeof getClassRoom === 'function' ? getClassRoom() : null;
  const stored = typeof getStudentLinkedClassCode === 'function' ? getStudentLinkedClassCode() : '';
  const mismatch = !!(stored && room && stored !== room.code);

  const settingsLinked = document.getElementById('settings-class-linked');
  const settingsForm = document.getElementById('settings-class-form-wrap');
  const badge = document.getElementById('home-class-badge');

  if (linked && room) {
    const text = '연결됨 · ' + room.name;
    if (settingsLinked) {
      settingsLinked.style.display = 'block';
      settingsLinked.textContent = text;
    }
    if (settingsForm) settingsForm.style.display = 'none';
    if (badge) {
      badge.style.display = 'block';
      badge.textContent = '🏫 ' + room.name;
    }
  } else {
    if (settingsLinked) settingsLinked.style.display = 'none';
    if (settingsForm) settingsForm.style.display = 'block';
    if (badge) badge.style.display = 'none';
  }

  if (mismatch && settingsForm) {
    setStudentClassUiMsg(
      'settings-class-msg',
      '저장된 코드와 선생님 학급 코드가 달라요. 아래에서 새 코드를 입력해 주세요.',
      true
    );
    if (settingsForm) settingsForm.style.display = 'block';
    if (settingsLinked) settingsLinked.style.display = 'none';
  }
}

function wireStudentClassLinkForms() {
  const setBtn = document.getElementById('settings-class-link-btn');
  if (setBtn && setBtn.dataset.wired !== '1') {
    setBtn.dataset.wired = '1';
    setBtn.addEventListener('click', function () {
      const input = document.getElementById('settings-class-code-input');
      const raw = (input && input.value) || '';
      setStudentClassUiMsg('settings-class-msg', '', false);
      if (typeof tryMatchStudentClassCode !== 'function') return;
      const res = tryMatchStudentClassCode(raw);
      if (!res.ok) {
        setStudentClassUiMsg('settings-class-msg', res.error || '연결할 수 없어요.', true);
        return;
      }
      if (input) input.value = '';
      setStudentClassUiMsg('settings-class-msg', '연결했어요: ' + res.className, false);
      updateStudentClassLinkUiAll();
    });
  }

  const unlinkBtn = document.getElementById('settings-class-unlink-btn');
  if (unlinkBtn && unlinkBtn.dataset.wired !== '1') {
    unlinkBtn.dataset.wired = '1';
    unlinkBtn.addEventListener('click', function () {
      if (typeof clearStudentLinkedClassCode === 'function') clearStudentLinkedClassCode();
      setStudentClassUiMsg('settings-class-msg', '학급 연결을 해제했어요.', false);
      updateStudentClassLinkUiAll();
    });
  }
}

window.updateStudentClassLinkUiAll = updateStudentClassLinkUiAll;

document.addEventListener('DOMContentLoaded', function () {
  wireStudentClassLinkForms();
  updateStudentClassLinkUiAll();
});
