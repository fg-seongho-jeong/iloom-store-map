// 까사미아 크롤러 — 공식 API (POST)
var puppeteer = require('puppeteer');

async function crawlCasamia() {
  console.log('[까사미아] 크롤링 시작...');
  var browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
  });
  var page = await browser.newPage();
  // 2026-07 까사미아 사이트에 WAF 봇차단 추가됨 — 헤드리스 기본 UA는 403.
  // 정상 브라우저 UA로 위장해야 통과됨.
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' });
  await page.goto('https://www.casamiamall.com/customer/storeInformation', { waitUntil: 'networkidle0', timeout: 60000 });

  var data = await page.evaluate(async () => {
    var res = await fetch('/main/getShopListWithRpstImage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    return await res.json();
  });

  await browser.close();

  var stores = data.list || [];
  console.log('[까사미아] 전체 수신:', stores.length);

  var result = stores.map(s => ({
    brand: '까사미아',
    name: (s.SHOP_NAME || '').trim(),
    addr: s.ADDR || s.ADDRESS || '',
    lat: parseFloat(s.LATITUDE) || null,
    lng: parseFloat(s.LONGITUDE) || null,
    stype: s.SHOP_TYPE === '1' || (s.SHOP_NAME || '').includes('직영') ? '직영' : '대리',
    _raw: s
  }));
  return result;
}

module.exports = crawlCasamia;

if (require.main === module) {
  crawlCasamia().then(r => {
    var fs = require('fs');
    fs.writeFileSync(__dirname + '/../casamia_out.json', JSON.stringify(r, null, 2));
    console.log('저장:', r.length + '건');
  }).catch(e => { console.error(e); process.exit(1); });
}
