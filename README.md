# 감정 체크인 (Emotion Check-in)

**2026 KIT 바이브코딩 공모전 출품작**  
주제: AI 활용 차세대 교육 솔루션에 맞춘 **학급 단위 감정 체크인** 웹 애플리케이션입니다.

---

## 프로젝트 개요

학생은 스마트폰 형태의 UI에서 하루 감정을 기록하고, 지난 기록·통계·설정을 이용합니다. 교사는 별도 대시보드에서 같은 브라우저에 저장된 데이터를 바탕으로 학생별·학급 전체 현황을 보고, 전체 공지·학급 코드·명단 관리 등을 할 수 있습니다.

| 구분 | 설명 |
|------|------|
| **학생 앱** | `index.html` — 로컬 계정 로그인, 감정 기록, 기록 목록, 통계·달력, 알림 시간·다크/라이트 테마, 학급 코드 연결 |
| **교사 대시보드** | `teacher.html` — 교사 전용 로그인, 학생별 목록·상세, 학급 분포, 공지, 설정(테마·학급·명단) |
| **데이터 저장** | 브라우저 **localStorage** 위주 (서버 없음). 샘플·연동용 **`data/students.json`** |
| **동기화** | 같은 브라우저에서 학생 탭과 교사 탭을 열어두면 **저장소 이벤트 + BroadcastChannel**으로 화면이 갱신되도록 구성 |

외부 API·Firebase 없이 **HTML / CSS / 바닐라 JavaScript**만으로 동작하며, 이후 서버·DB로 옮기기 쉽게 키 구조와 JSON 필드를 맞춰 두었습니다.

---

## 기술 스택

- **HTML5 / CSS3 / JavaScript (ES5+ 호환 위주, 모듈 번들러 없음)**
- **localStorage** — 학생·교사 계정, 세션, 감정 기록, 학급 방 설정, 교사 메시지 등
- **Web Crypto API** — 비밀번호 SHA-256 해시 (`student-accounts.js`, `teacher-auth.js`)
- **`fetch`** — `data/students.json` 명단 로드 (`teacher-data.js`)
- **BroadcastChannel + storage 이벤트** — 탭 간 반영 (`cross-tab.js` 등)
- **Google Fonts** — Nunito (교사 화면)

---

## 디렉터리·파일 구조

```
emotion-checkin-app/
├── index.html                 # 학생 앱 진입점
├── teacher.html               # 교사 대시보드 진입점
├── README.md                  # 본 문서 (공모전 제출용 개요)
├── .gitignore
│
├── data/
│   └── students.json          # 샘플 학급 명단·감정 기록 (교사 화면 fetch용)
│
├── css/
│   ├── style.css              # 학생 앱: 폰 목업·레이아웃·상태바
│   ├── components.css         # 학생·공통 UI (버튼, 카드, 로그인 폼 등)
│   ├── theme-light.css        # 학생 앱 라이트 테마
│   ├── animations.css         # 전환·모달 등 애니메이션
│   ├── teacher.css            # 교사 대시보드 기본(다크) 스타일
│   └── teacher-theme-light.css # 교사 화면 라이트 테마 오버라이드
│
└── js/
    ├── core/
    │   ├── paths.js           # 상대 경로 → 절대 URL (Live Server·하위 폴더 배포 대비)
    │   ├── storage.js         # 감정 CRUD, 교사 메시지, 알림 시각, 날짜 포맷 등 공통 저장소
    │   ├── student-accounts.js # 학생 계정 생성·검증·JSON 명단 연동
    │   └── cross-tab.js       # 탭 간 브로드캐스트·가시성 시 새로고침 트리거
    │
    ├── student/
    │   ├── app.js             # DOMContentLoaded, 화면 전환, 교사 배너 등
    │   ├── auth.js            # 학생 로그인·회원가입·세션
    │   ├── ui.js              # 모달, 홈/기록 목록, 상태바 시계, 알림 설정 UI
    │   ├── charts.js          # 통계·학생용 감정 달력
    │   ├── theme.js           # 다크/라이트 전환
    │   └── student-class-link.js # 학급 코드 입력·연결 UI
    │
    └── teacher/
        ├── teacher-app.js     # 대시보드 메인 로직, 필터, 상세 패널, 인사이트 모달
        ├── teacher-auth.js    # 교사 로그인·가입·세션
        ├── teacher-data.js    # students.json 로드·학생 목록 병합
        ├── teacher-roster.js  # 명단·수동 추가 등
        ├── teacher-class-room.js # 학급 코드 생성·표시·인라인 스타일 보조
        └── teacher-theme.js   # 교사 라이트/다크 테마 전환
```

스크립트는 각 HTML 하단에서 **`js/core/*` → 도메인별 `js/student/*` 또는 `js/teacher/*`** 순으로 로드됩니다.

---

## 실행 방법 (심사·데모)

1. **반드시 로컬 HTTP 서버**로 루트 폴더를 연다.  
   - 예: VS Code **Live Server**, `npx serve`, Python `http.server` 등  
   - `index.html`만 파일 프로토콜로 연면 `fetch('data/students.json')`이 동작하지 않을 수 있습니다.
2. **학생**: 브라우저에서 `index.html` → 회원가입 또는 로그인 → 감정 기록·기록·통계 이용.
3. **교사**: 같은 브라우저에서 `teacher.html`을 새 탭으로 연 뒤, 교사 인증코드·계정으로 로그인 → 학생 데이터·공지·설정 확인.  
   - 학생 앱과 **동일 origin**이면 localStorage가 공유되어 연동이 됩니다.

**데모용 교사 인증코드**는 `js/teacher/teacher-auth.js`에 정의되어 있으며, 기본값은 **`5678`** 입니다. (로그인·회원가입 시 동일하게 입력)

---

## 주요 기능 요약

**학생**

- 이모지·라벨·메모와 함께 감정 저장, 홈·기록 목록·통계, 달력에서 일별 상세
- 계정(아이디·비밀번호·이름 등) 로컬 저장, 로그아웃
- 매일 알림 시각 설정(24시간 형식), 다크/라이트 테마
- 교사가 보낸 **한 줄 공지** 배너(같은 브라우저 저장소 기준)
- 학급 코드로 교사가 만든 **학급 방**과 연결(설정 화면)

**교사**

- 학생별 목록·필터·상세(오늘 감정, 주간, 최근 기록), 감정 분포·달력 인사이트 모달
- 학급 전체 보기(차트·요약), **전체 공지** 입력
- 설정: 화면 모드(라이트/다크), 학급 만들기·코드, 명단(JSON 가져오기·수동 편집 등)
- 모바일·PC 레이아웃 분기(하단 탭 등)

**공통**

- 기록 시각은 **24시간제**, 날짜+분 단위 표기(`storage.js`의 `formatRecordDateTime` 등)
- 기록·프로필 변경 시 **다른 탭에 반영**되도록 설계

---

## 제출 시 참고

- 본 프로젝트는 **교육 현장 데모·프로토타입**에 맞추었으며, 실제 운영 시에는 서버 인증·개인정보 처리방침·HTTPS 등이 필요합니다.
- `data/students.json`은 **시연용 샘플**이며, 필드 구조(`emo`, `label`, `note`, `date` 등)는 앱 내부 저장 형식과 맞춰져 있습니다.

문의·버전 정보는 교사 설정 화면의 앱 정보 영역을 참고하면 됩니다.
