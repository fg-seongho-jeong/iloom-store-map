// 오늘이 이번 달 첫 영업일인지 확인 (한국 시간 기준)
// GitHub Actions에서 1~7일 매일 트리거되지만, 첫 영업일에만 실제 작업 수행

// 한국 공휴일 (2026~2028) - 매월 1~7일 사이에 걸칠 가능성 있는 것만
var KR_HOLIDAYS = [
  '2026-01-01', // 신정
  '2026-02-16', '2026-02-17', '2026-02-18', // 설날
  '2026-03-01', // 삼일절
  '2026-05-01', // 근로자의 날
  '2026-05-05', // 어린이날
  '2026-05-25', // 부처님오신날
  '2026-06-06', // 현충일
  '2026-08-15', // 광복절
  '2026-09-24', '2026-09-25', '2026-09-26', // 추석
  '2026-10-03', // 개천절
  '2026-10-09', // 한글날
  '2026-12-25', // 성탄절
  '2027-01-01',
  '2027-02-06', '2027-02-07', '2027-02-08',
  '2027-03-01',
  '2027-05-01', // 근로자의 날
  '2027-05-05',
  '2027-05-13', // 부처님오신날
  '2027-06-06',
  '2027-08-15',
  '2027-09-14', '2027-09-15', '2027-09-16',
  '2027-10-03',
  '2027-10-09',
  '2027-12-25'
];

function getKstDate() {
  // GitHub Actions 서버는 UTC. KST = UTC + 9
  var now = new Date();
  var utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcMs + 9 * 60 * 60 * 1000);
}

function fmt(d) {
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth()+1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}

function isBusinessDay(d) {
  var day = d.getUTCDay(); // 0=일, 6=토
  if (day === 0 || day === 6) return false;
  return KR_HOLIDAYS.indexOf(fmt(d)) === -1;
}

var today = getKstDate();
var year = today.getUTCFullYear();
var month = today.getUTCMonth();

// 이번 달 첫 영업일 찾기
var firstBizDay = null;
for (var d = 1; d <= 7; d++) {
  var date = new Date(Date.UTC(year, month, d));
  if (isBusinessDay(date)) { firstBizDay = date; break; }
}

var todayStr = fmt(today);
var firstBizStr = firstBizDay ? fmt(firstBizDay) : null;
var isToday = todayStr === firstBizStr;

console.log('오늘:', todayStr);
console.log('이번 달 첫 영업일:', firstBizStr);
console.log('실행:', isToday);

// GitHub Actions output
if (process.env.GITHUB_OUTPUT) {
  var fs = require('fs');
  fs.appendFileSync(process.env.GITHUB_OUTPUT,
    'run=' + (isToday ? 'true' : 'false') + '\n' +
    'month=' + (year + '-' + String(month+1).padStart(2, '0')) + '\n' +
    'today=' + todayStr + '\n'
  );
}

process.exit(0);
