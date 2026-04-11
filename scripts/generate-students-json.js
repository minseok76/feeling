/**
 * data/students.json 생성 — 학생 다수 + 약 한 달(평일 위주) 감정 기록
 * 실행: node scripts/generate-students-json.js
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'data', 'students.json');

const EMOS = [
  { emo: '😊', label: '기분 좋음', notes: ['', '오늘 좋은 일이 있었어요', '친구랑 웃었어요', '수업이 재밌었다', '날씨가 좋았다'] },
  { emo: '😐', label: '보통', notes: ['', '그냥 보통이에요', '무난한 하루', '별일 없음'] },
  { emo: '😢', label: '슬픔', notes: ['', '조금 우울해요', '집에 가고 싶다', '친구랑 멀어진 느낌'] },
  { emo: '😡', label: '화남', notes: ['', '짜증 났어요', '공부하기 싫다', '시끄러웠다'] },
  { emo: '😴', label: '피곤함', notes: ['', '잠이 부족해요', '야자 때문에', '컨디션이 안 좋아요'] },
];

const STUDENTS = [
  { id: 1, userId: 'minjun01', name: '김민준', number: '01번', bias: 0 },
  { id: 2, userId: 'seoyeon02', name: '이서연', number: '02번', bias: 1 },
  { id: 3, userId: 'jiho03', name: '박지호', number: '03번', bias: 2 },
  { id: 4, userId: 'yuna04', name: '최유나', number: '04번', bias: 3 },
  { id: 5, userId: 'dohyun05', name: '정도현', number: '05번', bias: 4 },
  { id: 6, userId: 'sohee06', name: '한소희', number: '06번', bias: 0 },
  { id: 7, userId: 'seungmin07', name: '오승민', number: '07번', bias: 2 },
  { id: 8, userId: 'chaewon08', name: '윤채원', number: '08번', bias: 1 },
  { id: 9, userId: 'minseo09', name: '강민서', number: '09번', bias: 3 },
  { id: 10, userId: 'taeyang10', name: '임태양', number: '10번', bias: 4 },
  { id: 11, userId: 'jiwoo11', name: '서지우', number: '11번', bias: 1 },
  { id: 12, userId: 'haeun12', name: '안하은', number: '12번', bias: 2 },
];

function pick(arr, i) {
  return arr[i % arr.length];
}

function buildEmotionsForStudent(student) {
  const emotions = [];
  const start = new Date(Date.UTC(2026, 2, 11, 0, 0, 0, 0));
  const totalDays = 34;

  for (let d = 0; d < totalDays; d++) {
    const dt = new Date(start);
    dt.setUTCDate(start.getUTCDate() + d);
    const dow = dt.getUTCDay();
    if (dow === 0 || dow === 6) continue;

    const seed = student.id * 10007 + d * 1301;
    if (seed % 11 === 0) continue;

    let emoIdx = (seed + student.bias * 17) % EMOS.length;
    if (student.id === 2 && seed % 5 === 0) emoIdx = 2;
    if (student.id === 3 && seed % 4 !== 0) emoIdx = 0;
    const pack = EMOS[emoIdx];
    const hour = 7 + (seed % 10);
    const minute = (seed * 3) % 60;
    dt.setUTCHours(hour, minute, 0, 0);
    const note = pick(pack.notes, seed);

    emotions.push({
      emo: pack.emo,
      label: pack.label,
      note,
      date: dt.toISOString(),
    });
  }

  emotions.sort((a, b) => new Date(b.date) - new Date(a.date));
  return emotions;
}

const students = STUDENTS.map(s => ({
  id: s.id,
  userId: s.userId,
  name: s.name,
  number: s.number,
  gradeLabel: '고등학교 2학년',
  classLabel: '3반',
  emotions: buildEmotionsForStudent(s),
}));

const payload = {
  schemaVersion: 1,
  meta: {
    description:
      '반 학생·감정 샘플 (교사 화면용). 12명, 약 한 달(2026-03-11~2026-04-13, 평일 위주) 체크인. date는 ISO 8601.',
    gradeLabel: '고등학교 2학년',
    classLabel: '3반',
    generatedBy: 'scripts/generate-students-json.js',
    approxSchoolDaysPerStudent: '~18~24 (주말·무기록일 제외)',
  },
  students,
};

fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf8');
const totalEmo = students.reduce((n, s) => n + s.emotions.length, 0);
console.log('Wrote', OUT);
console.log('Students:', students.length, 'Total emotion rows:', totalEmo);
