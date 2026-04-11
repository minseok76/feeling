/* ===========================
   교사 설정 — 학급 만들기 · 코드 안내
=========================== */

function updateTeacherHeaderClassLabel() {
  const el = document.getElementById('teacher-class-label');
  if (!el) return;
  const room = typeof getClassRoom === 'function' ? getClassRoom() : null;
  el.textContent = room && room.name ? room.name : '학급 미설정';
}

function setTeacherClassMsg(elId, msg, isError) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('teacher-auth-msg--error', !!isError);
}

/** 일부 환경에서 글자색이 검정으로 덮이는 문제 대비 — 인라인 !important */
function applyTeacherClassRoomActiveInline() {
  const activeWrap = document.getElementById('teacher-class-room-active');
  if (!activeWrap) return;
  const room = typeof getClassRoom === 'function' ? getClassRoom() : null;
  if (!room) return;

  const isLight =
    document.documentElement.getAttribute('data-teacher-theme') === 'light';

  function imp(el, prop, val) {
    if (!el) return;
    el.style.setProperty(prop, val, 'important');
  }

  const line = activeWrap.querySelector('.teacher-class-room-line');
  const ks = activeWrap.querySelectorAll('.teacher-class-room-k');
  const nameEl = document.getElementById('teacher-class-room-name');
  const codeEl = document.getElementById('teacher-class-room-code');
  const codeInner = codeEl ? codeEl.querySelector('.teacher-class-code-text') : null;

  if (isLight) {
    imp(activeWrap, 'color', '#0f172a');
    imp(line, 'color', '#0f172a');
    imp(line, '-webkit-text-fill-color', '#0f172a');
    ks.forEach(function (el) {
      imp(el, 'color', '#64748b');
      imp(el, '-webkit-text-fill-color', '#64748b');
    });
    imp(nameEl, 'color', '#0f172a');
    imp(nameEl, '-webkit-text-fill-color', '#0f172a');
    imp(codeEl, 'color', '#5b21b6');
    imp(codeEl, '-webkit-text-fill-color', '#5b21b6');
    imp(codeEl, 'background-color', '#f5f3ff');
    imp(codeEl, 'border-color', '#c4b5fd');
    imp(codeInner, 'color', '#5b21b6');
    imp(codeInner, '-webkit-text-fill-color', '#5b21b6');
  } else {
    imp(activeWrap, 'color', '#f9fafb');
    imp(line, 'color', '#f9fafb');
    imp(line, '-webkit-text-fill-color', '#f9fafb');
    ks.forEach(function (el) {
      imp(el, 'color', '#e5e7eb');
      imp(el, '-webkit-text-fill-color', '#e5e7eb');
    });
    imp(nameEl, 'color', '#ffffff');
    imp(nameEl, '-webkit-text-fill-color', '#ffffff');
    imp(codeEl, 'color', '#fffbeb');
    imp(codeEl, '-webkit-text-fill-color', '#fffbeb');
    imp(codeEl, 'background-color', '#1e1b4b');
    imp(codeEl, 'border-color', '#818cf8');
    imp(codeInner, 'color', '#fffbeb');
    imp(codeInner, '-webkit-text-fill-color', '#fffbeb');
  }
}

function clearTeacherClassRoomActiveInline() {
  const activeWrap = document.getElementById('teacher-class-room-active');
  if (!activeWrap) return;
  activeWrap.style.removeProperty('color');
  const line = activeWrap.querySelector('.teacher-class-room-line');
  if (line) {
    line.style.removeProperty('color');
    line.style.removeProperty('-webkit-text-fill-color');
  }
  activeWrap.querySelectorAll('.teacher-class-room-k').forEach(function (el) {
    el.style.removeProperty('color');
    el.style.removeProperty('-webkit-text-fill-color');
  });
  const nameEl = document.getElementById('teacher-class-room-name');
  if (nameEl) {
    nameEl.style.removeProperty('color');
    nameEl.style.removeProperty('-webkit-text-fill-color');
  }
  const codeEl = document.getElementById('teacher-class-room-code');
  if (codeEl) {
    codeEl.style.removeProperty('color');
    codeEl.style.removeProperty('-webkit-text-fill-color');
    codeEl.style.removeProperty('background-color');
    codeEl.style.removeProperty('border-color');
    const inner = codeEl.querySelector('.teacher-class-code-text');
    if (inner) {
      inner.style.removeProperty('color');
      inner.style.removeProperty('-webkit-text-fill-color');
    }
  }
}

function renderTeacherClassRoomCard() {
  const room = typeof getClassRoom === 'function' ? getClassRoom() : null;
  const createWrap = document.getElementById('teacher-class-room-create');
  const activeWrap = document.getElementById('teacher-class-room-active');
  if (!createWrap || !activeWrap) return;

  if (room) {
    createWrap.style.display = 'none';
    activeWrap.style.display = 'block';
    const nameEl = document.getElementById('teacher-class-room-name');
    const codeEl = document.getElementById('teacher-class-room-code');
    if (nameEl) nameEl.textContent = room.name;
    if (codeEl) {
      codeEl.textContent = '';
      const span = document.createElement('span');
      span.className = 'teacher-class-code-text';
      span.textContent = room.code;
      codeEl.appendChild(span);
    }
    applyTeacherClassRoomActiveInline();
    requestAnimationFrame(function () {
      applyTeacherClassRoomActiveInline();
    });
  } else {
    createWrap.style.display = 'block';
    activeWrap.style.display = 'none';
    clearTeacherClassRoomActiveInline();
  }
  setTeacherClassMsg('teacher-class-room-msg', '', false);
  if (typeof window.updateTeacherRosterClassPageTitle === 'function') {
    window.updateTeacherRosterClassPageTitle();
  }
}

async function copyTeacherClassCode() {
  const room = typeof getClassRoom === 'function' ? getClassRoom() : null;
  if (!room) return;
  const code = room.code;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(code);
      setTeacherClassMsg('teacher-class-room-msg', '코드를 복사했어요.', false);
    } else {
      throw new Error('clipboard');
    }
  } catch (e) {
    setTeacherClassMsg('teacher-class-room-msg', '복사에 실패했어요. 코드를 직접 선택해 복사해 주세요.', true);
  }
}

function initTeacherClassRoomPanel() {
  updateTeacherHeaderClassLabel();
  renderTeacherClassRoomCard();

  const createBtn = document.getElementById('teacher-class-create-btn');
  if (createBtn && createBtn.dataset.wired !== '1') {
    createBtn.dataset.wired = '1';
    createBtn.addEventListener('click', function () {
      const nameEl = document.getElementById('teacher-class-name-input');
      const name = (nameEl && nameEl.value) || '';
      const code = typeof generateClassJoinCode === 'function' ? generateClassJoinCode() : '';
      if (typeof setClassRoom === 'function' && setClassRoom(name, code)) {
        renderTeacherClassRoomCard();
        updateTeacherHeaderClassLabel();
        setTeacherClassMsg('teacher-class-room-msg', '학급이 만들어졌어요. 아래 코드를 학생에게 알려 주세요.', false);
      } else {
        setTeacherClassMsg('teacher-class-room-msg', '학급을 만들 수 없어요.', true);
      }
    });
  }

  const copyBtn = document.getElementById('teacher-class-copy-btn');
  if (copyBtn && copyBtn.dataset.wired !== '1') {
    copyBtn.dataset.wired = '1';
    copyBtn.addEventListener('click', function () {
      void copyTeacherClassCode();
    });
  }

  const regenBtn = document.getElementById('teacher-class-regenerate-btn');
  if (regenBtn && regenBtn.dataset.wired !== '1') {
    regenBtn.dataset.wired = '1';
    regenBtn.addEventListener('click', function () {
      const room = typeof getClassRoom === 'function' ? getClassRoom() : null;
      if (!room) return;
      if (
        !confirm(
          '코드를 바꾸면 예전 코드로는 연결할 수 없어요. 학생에게 새 코드를 다시 알려야 해요. 계속할까요?'
        )
      )
        return;
      const next = typeof generateClassJoinCode === 'function' ? generateClassJoinCode() : '';
      if (typeof setClassRoom === 'function' && setClassRoom(room.name, next)) {
        renderTeacherClassRoomCard();
        setTeacherClassMsg('teacher-class-room-msg', '새 코드로 바꿨어요.', false);
      }
    });
  }

  const removeBtn = document.getElementById('teacher-class-remove-btn');
  if (removeBtn && removeBtn.dataset.wired !== '1') {
    removeBtn.dataset.wired = '1';
    removeBtn.addEventListener('click', function () {
      if (!confirm('학급을 없앨까요? 학생 쪽 연결도 함께 지워져요.')) return;
      if (typeof clearClassRoom === 'function') clearClassRoom();
      renderTeacherClassRoomCard();
      updateTeacherHeaderClassLabel();
      setTeacherClassMsg('teacher-class-room-msg', '학급을 없앴어요.', false);
    });
  }
}
