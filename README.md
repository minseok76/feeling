# 감정 체크인 앱 🎓

> 2026 KIT 바이브코딩 공모전 출품작  
> 주제: AI활용 차세대 교육 솔루션

## 프로젝트 소개

학생들이 매일 자신의 감정을 기록하고,  
선생님이 학급 전체의 감정 흐름을 파악할 수 있는 웹앱입니다.

## 파일 구조

```
emotion-checkin-app/
├── index.html                 ← 학생 앱
├── teacher.html               ← 교사 대시보드
├── data/
│   └── students.json          ← 반 명단·감정 샘플 (교사 쪽 단일 소스)
├── css/
│   ├── style.css              ← 학생 앱 레이아웃·폰 목업
│   ├── components.css         ← 공통 UI·로그인·카드
│   ├── animations.css         ← 모달·차트 애니메이션
│   └── teacher.css            ← 교사 페이지 전용
└── js/
    ├── core/
    │   └── storage.js         ← localStorage·동기화·교사 메시지 (학생/교사 공용)
    ├── student/
    │   ├── app.js             ← 화면 전환
    │   ├── ui.js              ← 모달·목록·홈 배너
    │   ├── charts.js          ← 통계 차트
    │   └── auth.js            ← 내부 로그인·회원가입 (localStorage + 비밀번호 해시)
    └── teacher/
        ├── teacher-data.js    ← 명단 로드(JSON)·hybrid
        └── teacher-app.js     ← 대시보드 UI
```

## 사용 기술

- HTML5 / CSS3 / JavaScript (바닐라)
- localStorage (`emotion-checkin-accounts`, 세션, 감정 기록)
- `data/students.json` (`fetch` — 교사 명단)
- Web Crypto API (SHA-256, 비밀번호 해시)
- Google Fonts (Nunito)

## 실행 방법

1. **Live Server**(또는 `npx serve` 등)로 프로젝트 루트를 연다.  
   - `index.html`만 파일로 더블클릭하면 `fetch('data/students.json')`이 막힐 수 있음.
2. 학생: `index.html` — 회원가입 후 로그인.
3. 교사: `teacher.html` — 학생과 같은 브라우저면 localStorage 연동.

## 주요 기능

- 😊 감정 기록·기록 목록·주간 통계
- 🔐 이름·아이디·비밀번호 회원가입·로그인 (이 브라우저 내부 저장)
- 📊 교사 대시보드 + `students.json` 기반 명단
- 💬 교사 → 학생 한 줄 메시지(같은 브라우저 탭 간)
