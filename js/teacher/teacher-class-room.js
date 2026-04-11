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
    if (codeEl) codeEl.textContent = room.code;
  } else {
    createWrap.style.display = 'block';
    activeWrap.style.display = 'none';
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
