// Google Sheets API 데이터 → sales_data.js 자동 동기화
//
// 사용법: node sync_sales.js [--fetch]
//   --fetch 옵션: API에서 새로 받음. 없으면 기존 api_data.json 사용

const fs = require('fs');
const https = require('https');
const path = require('path');

const API_URL = 'https://script.google.com/macros/s/AKfycbzBt9AatpXhhCyP50UYzpD7ppMS3NH9iBbwRcrDS14n-_atFdQFuWKUALzPDCVc7s6n2Q/exec';
const VALID_BRANDS = ['일룸', '한샘', '리바트', '까사미아', '에몬스'];

const { STORE_NAME_MAPPING } = require('./store_name_mapping.js');

function fetchApi(url, depth = 0) {
  if (depth > 5) return Promise.reject(new Error('redirect loop'));
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchApi(res.headers.location, depth + 1).then(resolve, reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

function loadOldSalesData() {
  const txt = fs.readFileSync('sales_data.js', 'utf8');
  const m = txt.match(/var SALES_DATA\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) throw new Error('sales_data.js parse error');
  return eval(m[1]);
}

function applyMapping(brand, store) {
  const map = STORE_NAME_MAPPING[brand];
  if (!map) return store;
  return map[store] || store;
}

async function main() {
  const args = process.argv.slice(2);
  const doFetch = args.includes('--fetch');

  // 1) API 데이터 로드
  if (doFetch || !fs.existsSync('api_data.json')) {
    console.log('Fetching API data...');
    const raw = await fetchApi(API_URL);
    if (raw.startsWith('<')) throw new Error('API returned HTML error');
    fs.writeFileSync('api_data.json', raw);
  }
  const apiData = JSON.parse(fs.readFileSync('api_data.json', 'utf8'));
  console.log(`API rows: ${apiData.length}`);

  // 2) 정상 브랜드만 필터 + 매장 분석 대상 아닌 데이터 제외
  //    - 마테라소: 까사미아의 매트리스 전문 브랜드 (가구 매장 분석 아님)
  //    - 한샘 마포/방배: 본사 사옥/B2B 채널 추정 (마커 없음, 매장당 매출 효율 왜곡 방지)
  const SALES_BLOCKLIST = {
    '한샘': new Set(['마포', '마포직매장', '마포표준가구', '방배', '방배직매장',
      // 2026-07 검토: 채널성(팝업/위탁/표준매장/리하우스) 제외 — 매장당 매출 왜곡 방지
      '고양표준매장(패)', '기흥표준매장(패)', '롯데쇼핑(주) 동탄점_팝업',
      'INT기흥표준매장_주식회사 한샘인테리어지에스대리점', 'INT이현위탁유통_퍼스트에이치',
      '강동', '부천_미래엘', '부천_오늘의집']),
    '리바트': new Set(['리바트 문경점']),  // 가구매장 아님
    '까사미아': new Set(['L아울렛고양점(P)', 'L동부산점(P)', '팝업 등',
      // 2026-07 폐점/아울렛/매트리스 제외 (정성호 확인)
      '서대구위탁', '용인', '수원권선', '기흥위탁', '대구북구점', 'CDB강남']),
    '에몬스': new Set(['울산삼산리빙(법)', '외부인판매(김포현대아울렛점)'])
  };
  const cleanData = apiData.filter(r => {
    if (!VALID_BRANDS.includes(r.brand)) return false;
    const store = String(r.store || '');
    if (store.startsWith('마테라소')) return false;
    if (SALES_BLOCKLIST[r.brand] && SALES_BLOCKLIST[r.brand].has(store)) return false;
    return true;
  });
  console.log(`Valid brand rows: ${cleanData.length} (dropped ${apiData.length - cleanData.length})`);

  // 3) 기존 sales_data.js 로드 → 매핑 테이블 작성 (지도 매장명 ← API 매장명)
  const oldData = loadOldSalesData();
  // 역매핑: API 이름 → 지도 매장명 (지도 표시용)
  const apiToMap = {};
  Object.keys(STORE_NAME_MAPPING).forEach(brand => {
    Object.entries(STORE_NAME_MAPPING[brand]).forEach(([mapName, apiName]) => {
      if (!apiToMap[brand]) apiToMap[brand] = {};
      // apiName은 문자열 또는 배열(여러 API명 → 하나로 합산) 모두 지원
      (Array.isArray(apiName) ? apiName : [apiName]).forEach(a => { apiToMap[brand][a] = mapName; });
    });
  });

  // 4) 매장 단위로 집계: (brand, store) → { region, area, monthly: [...], s24, s25 }
  // 같은 매장명에 다른 사업소(market_no) 행이 있으면 월별 매출은 합산 (중복 제거)
  const stores = new Map();
  cleanData.forEach(r => {
    const brand = r.brand;
    const apiStore = String(r.store || '').trim();
    const mapStore = (apiToMap[brand] && apiToMap[brand][apiStore]) || apiStore;
    const key = brand + '|' + mapStore;

    if (!stores.has(key)) {
      stores.set(key, {
        brand: brand,
        store: mapStore,
        region: r.area_group,
        area: r.market_group,
        marketNo: r.market_no,
        _monthlyMap: new Map(),  // 월 → 합산 매출
        s24: 0,
        s25: 0
      });
    }
    const s = stores.get(key);
    const sales = r.sales || 0;
    s._monthlyMap.set(r.month, (s._monthlyMap.get(r.month) || 0) + sales);
    if (r.month && r.month.startsWith('2024')) s.s24 += sales;
    else if (r.month && r.month.startsWith('2025')) s.s25 += sales;
  });

  // _monthlyMap → monthly 배열로 변환 (월별 1행)
  stores.forEach(s => {
    s.monthly = [...s._monthlyMap.entries()]
      .map(([m, sum]) => ({ m, s: sum }))
      .sort((a, b) => a.m.localeCompare(b.m));
    delete s._monthlyMap;
  });

  // 5) 기존 매장 중 API에 없는 것 → 삭제 후보 리포트
  const newKeys = new Set([...stores.keys()]);
  const droppedFromOld = oldData.filter(o => !newKeys.has(o.brand + '|' + o.store));
  const addedFromApi = [];
  const oldKeys = new Set(oldData.map(o => o.brand + '|' + o.store));
  newKeys.forEach(k => { if (!oldKeys.has(k)) addedFromApi.push(stores.get(k)); });

  // 6) 랭크 계산: 같은 (brand, marketNo) 내에서 매출 내림차순 순위
  const groups = {};
  stores.forEach(s => {
    const gk = s.brand + '|' + (s.marketNo || '');
    if (!groups[gk]) groups[gk] = [];
    groups[gk].push(s);
  });
  Object.values(groups).forEach(grp => {
    [...grp].sort((a, b) => b.s24 - a.s24).forEach((s, i) => { s.r24 = i + 1; });
    [...grp].sort((a, b) => b.s25 - a.s25).forEach((s, i) => { s.r25 = i + 1; });
  });

  // 7) sales_data.js 출력 생성
  const sortedStores = [...stores.values()].sort((a, b) => {
    if (a.brand !== b.brand) return VALID_BRANDS.indexOf(a.brand) - VALID_BRANDS.indexOf(b.brand);
    if (a.region !== b.region) return (a.region || '').localeCompare(b.region || '');
    return (a.store || '').localeCompare(b.store || '');
  });

  // 메타 정보 계산
  const allMonths = new Set();
  sortedStores.forEach(s => (s.monthly || []).forEach(m => allMonths.add(m.m)));
  const monthsList = [...allMonths].sort();
  const earliestMonth = monthsList[0] || '';
  const latestMonth = monthsList[monthsList.length - 1] || '';

  let out = '// Google Sheets API에서 자동 생성됨 - sync_sales.js\n';
  out += '// 마지막 갱신: ' + new Date().toISOString().slice(0, 10) + '\n';
  out += '// 데이터 범위: ' + earliestMonth + ' ~ ' + latestMonth + '\n';
  out += '// 매장 수: ' + sortedStores.length + '\n\n';
  out += 'var SALES_META = ' + JSON.stringify({
    latestMonth: latestMonth,
    earliestMonth: earliestMonth,
    totalMonths: monthsList.length,
    generatedAt: new Date().toISOString().slice(0, 10),
    storeCount: sortedStores.length
  }) + ';\n\n';
  out += 'var SALES_DATA = [\n';
  sortedStores.forEach((s, idx) => {
    const monthlyStr = s.monthly
      .sort((a, b) => a.m.localeCompare(b.m))
      .map(m => `{m:"${m.m}",s:${m.s}}`)
      .join(',');
    out += `  { brand:"${s.brand}", store:${JSON.stringify(s.store)}, s24:${s.s24}, s25:${s.s25}, r24:${s.r24}, r25:${s.r25}, region:${JSON.stringify(s.region || '')}, area:${JSON.stringify(s.area || '')}, monthly:[${monthlyStr}] }`;
    if (idx < sortedStores.length - 1) out += ',';
    out += '\n';
  });
  out += '];\n';

  fs.writeFileSync('sales_data.js.new', out);
  console.log(`\nGenerated: sales_data.js.new (${sortedStores.length} stores)`);

  // 8) brand_history.js의 lastUpdated 갱신
  const todayStr = new Date().toISOString().slice(0, 10);
  let bh = fs.readFileSync('brand_history.js', 'utf8');
  bh = bh.replace(/lastUpdated:\s*'[^']*'/, `lastUpdated: '${todayStr}'`);
  fs.writeFileSync('brand_history.js.new', bh);
  console.log(`Updated: brand_history.js.new (lastUpdated → ${todayStr})`);

  // 9) 동기화 리포트
  let report = `# Sales Data Sync Report\n\n`;
  report += `생성: ${new Date().toLocaleString('ko-KR')}\n\n`;
  report += `## 요약\n`;
  report += `- API 행: ${apiData.length}\n`;
  report += `- 정상 브랜드 행: ${cleanData.length}\n`;
  report += `- 기존 sales_data.js 매장: ${oldData.length}\n`;
  report += `- 신규 sales_data.js 매장: ${sortedStores.length}\n`;
  report += `- 추가됨 (API에만 있던 신규): **${addedFromApi.length}개**\n`;
  report += `- 삭제됨 (기존엔 있었으나 API에 없음): **${droppedFromOld.length}개**\n\n`;

  report += `## 삭제된 매장 (${droppedFromOld.length}개)\n`;
  droppedFromOld.forEach(o => {
    report += `- ${o.brand} **${o.store}** (${o.region}) — s24:${o.s24}, s25:${o.s25}\n`;
  });

  report += `\n## 추가된 매장 (상위 50개)\n`;
  addedFromApi.slice(0, 50).forEach(s => {
    report += `- ${s.brand} **${s.store}** (${s.region}, ${s.area}) — s24:${s.s24.toLocaleString()}, s25:${s.s25.toLocaleString()}\n`;
  });
  if (addedFromApi.length > 50) report += `... 외 ${addedFromApi.length - 50}개\n`;

  fs.writeFileSync('sync_report.md', report);
  console.log('\nReport: sync_report.md');
  console.log(`- Dropped: ${droppedFromOld.length}`);
  console.log(`- Added:   ${addedFromApi.length}`);
  console.log('\n[적용하려면] mv sales_data.js.new sales_data.js && mv brand_history.js.new brand_history.js');
}

main().catch(e => { console.error(e); process.exit(1); });
