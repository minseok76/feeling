/* ===========================
   js/student/ui.js
   모달 열고 닫기, 기록 목록 그리기
=========================== */

// 현재 선택된 감정 (기본값: 😊)
let selectedEmo = '😊';
let selectedLabel = '기분 좋음';

// 감정 이모지 선택하기
function pickEmo(el) {
  // 기존 선택 해제
  document.querySelectorAll('.emo-opt').forEach(e => e.classList.remove('selected'));
  // 새 선택 적용
  el.classList.add('selected');
  selectedEmo = el.dataset.emo;
  selectedLabel = el.dataset.label;
}

// 모달 열기
function openModal() {
  document.getElementById('modal').classList.add('open');
}

// 모달 닫기
function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.getElementById('note-input').value = '';
  // 이모지 선택 초기화
  document.querySelectorAll('.emo-opt').forEach(e => e.classList.remove('selected'));
  document.querySelector('[data-emo="😊"]').classList.add('selected');
  selectedEmo = '😊';
  selectedLabel = '기분 좋음';
}

// 감정 저장하기
function saveEmo() {
  const note = document.getElementById('note-input').value.trim();
  saveEmotion(selectedEmo, selectedLabel, note);
  closeModal();
  renderAll(); // 화면 전체 새로 그리기
  showScreen('home');
}

// 홈 화면 오늘 기분 카드 업데이트
function renderTodayCard() {
  const emotions = getEmotions();
  const today = new Date().toDateString();
  const todayEmo = emotions.find(e => new Date(e.date).toDateString() === today);

  if (todayEmo) {
    document.getElementById('today-emo').textContent = todayEmo.emo;
    document.getElementById('today-label').textContent = todayEmo.label;
    document.getElementById('today-time').textContent =
      `오늘 · ${formatTime(todayEmo.date)}`;
  }
}

// 홈 화면 최근 기록 목록
function renderRecentLogs() {
  const container = document.getElementById('recent-logs');
  if (!container) return;

  const emotions = getEmotions().slice(0, 3); // 최근 3개만
  container.innerHTML = '';

  if (emotions.length === 0) {
    container.innerHTML =
      '<p class="empty-state-hint" style="padding:20px 0;">아직 기록이 없어요! ➕ 버튼을 눌러보세요</p>';
    return;
  }

  emotions.forEach(e => {
    const div = document.createElement('div');
    div.className = 'log-card';
    div.innerHTML = `
      <div class="log-emo">${e.emo}</div>
      <div class="log-info">
        <p class="log-title">${e.label}</p>
        <p class="log-sub">${e.note || '메모 없음'}</p>
      </div>
      <p class="log-time">${formatDate(e.date)}<br>${formatTime(e.date)}</p>
    `;
    container.appendChild(div);
  });
}

// 기록 화면 전체 목록
function renderHistoryList() {
  const container = document.getElementById('history-list');
  if (!container) return;

  const emotions = getEmotions();
  container.innerHTML = '';

  if (emotions.length === 0) {
    container.innerHTML =
      '<p class="empty-state-hint" style="padding:30px 0;">아직 기록이 없어요</p>';
    return;
  }

  emotions.forEach(e => {
    const div = document.createElement('div');
    div.className = 'hist-item';
    div.innerHTML = `
      <div class="log-emo">${e.emo}</div>
      <div class="log-info" style="flex:1;">
        <p class="log-title">${e.label}</p>
        <p class="log-sub">${e.note || '메모 없음'}</p>
      </div>
      <span class="hist-date">${formatDate(e.date)}</span>
    `;
    container.appendChild(div);
  });
}

// 선생님 메시지 배너 (홈 상단)
function renderTeacherBanner() {
  const wrap = document.getElementById('teacher-banner');
  const textEl = document.getElementById('teacher-banner-text');
  if (!wrap || !textEl || typeof getTeacherMessage !== 'function') return;

  const msg = getTeacherMessage();
  if (!msg || !msg.text) {
    wrap.style.display = 'none';
    return;
  }

  const dismissed = sessionStorage.getItem('emotion-banner-dismissed-at');
  if (dismissed === msg.at) {
    wrap.style.display = 'none';
    return;
  }

  textEl.textContent = msg.text;
  wrap.style.display = 'block';
}

// 모든 화면 한 번에 업데이트
function renderAll() {
  renderTodayCard();
  renderRecentLogs();
  renderHistoryList();
  renderStats();
  renderTeacherBanner();
}
