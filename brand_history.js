// 브랜드별 매장 데이터 기준 + 월별 변경 이력
// 매월 업데이트 시 이 파일도 함께 갱신

var BRAND_CRITERIA = {
  lastUpdated: '2026-04-27',

  brands: {
    '일룸': {
      count: 75,
      source: '일룸 공식 (iloom.com/store/storeListForMap.do)',
      filterType: '전체 매장 (P=프리미엄샵 + B=일반)',
      officialCount: 76,
      excluded: [
        { name: '청남가구단지점 / 청남3', reason: '내부 명명 차이 (같은 매장)', type: 'duplicate' }
      ],
      notes: '내부 매장명은 매출 데이터(sales_data.js) 매칭용으로 짧은 이름+숫자 형태. UI 표시는 displayName()이 끝의 숫자 제거 + "점" 추가.'
    },

    '한샘': {
      count: 63,
      source: '한샘 공식몰 (remodeling.hanssem.com)',
      filterType: '가구 카테고리 (itemTypes=FN)',
      officialCount: 64,
      excluded: [
        { name: 'INT부천위탁유통_오늘의집대리점', reason: '"부천중동대리점"과 동일 주소 (경기 부천시 원미구 길주로 254) - 중복 매장이므로 미등록', type: 'duplicate' }
      ],
      notes: '디자인파크/리하우스/플래그십 포함. 리하우스 신규 추가 시 수기 확인 필요.'
    },

    '리바트': {
      count: 91,
      source: '현대리바트 공식몰 (hyundailivart.co.kr)',
      filterType: '가구 카테고리 (shopScnCd 01 + 20 + 60 + 80 = 100개)',
      officialCount: 100,
      excluded: [
        { name: '리바트오피스/하움 직영송파전시장', reason: '사무가구 (오피스 패턴)', type: 'pattern' },
        { name: '리바트오피스/하움 직영강서전시장', reason: '사무가구', type: 'pattern' },
        { name: '리바트 오피스 대전직영전시장', reason: '사무가구', type: 'pattern' },
        { name: '리바트 오피스 광주 전시장', reason: '사무가구', type: 'pattern' },
        { name: '리바트 오피스 부산 전시장', reason: '사무가구', type: 'pattern' },
        { name: '리바트 용인점', reason: '상설 할인매장', type: 'blocklist' },
        { name: '리바트 상설할인점', reason: '상설 할인매장', type: 'blocklist' },
        { name: '리바트 대전상설점', reason: '상설 할인매장', type: 'blocklist' },
        { name: '리바트집테리어 현대아울렛 대전점', reason: '인테리어 카테고리 (집테리어) — 동일 주소에 가구 매장 별도', type: 'pattern' }
      ],
      notes: '리바트토탈/리바트집테리어 중복 매장은 "리바트"로 정리. 백화점 입점 아울렛(현대/신세계/롯데)은 포함.'
    },

    '까사미아': {
      count: 107,
      source: '까사미아 공식몰 (casamiamall.com)',
      filterType: '전체 매장 (대리점 + 직영점 + 기타유통)',
      officialCount: 134,
      excluded: [
        { name: '마테라소 매장 (21개)', reason: '매트리스 전문관 (가구점 아님)', type: 'pattern' },
        { name: '굳닷컴 쇼룸 서래마을점', reason: 'GUUD 쇼룸', type: 'blocklist' },
        { name: '카르페디엠베드 신세계강남점', reason: '매트리스 전문', type: 'blocklist' },
        { name: '팩토리아울렛 용인점', reason: '자체 아울렛', type: 'blocklist' },
        { name: '아울렛울산대리점', reason: '자체 아울렛 (울산)', type: 'blocklist' },
        { name: '아울렛 기흥대리점', reason: '자체 아울렛 (기흥)', type: 'blocklist' },
        { name: '서대구대리점', reason: '자체 아울렛 (실질적 아울렛)', type: 'blocklist' }
      ],
      notes: '자체 아울렛("아울렛"으로 시작 또는 서대구) 제외. 백화점 입점 아울렛(신세계사이먼/현대/롯데)은 포함.'
    },

    '에몬스': {
      count: 96,
      source: '에몬스 공식 (emons.co.kr)',
      filterType: '전체 매장',
      officialCount: 96,
      excluded: [],
      notes: '공식 사이트 매장 리스트 그대로 반영 (전시장 전체).'
    }
  }
};

// 월별 변경 이력
var BRAND_HISTORY = [
  {
    date: '2026-04-29',
    summary: '매출 데이터 정합성 강화 (명칭 변경 페어 합산 + 본사 채널 제외)',
    events: [
      { brand: '한샘', type: 'note', name: '마포/방배 매출', reason: '본사 사옥/B2B 채널 추정 (마커 없음) → 매장 분석에서 제외 (sync 필터)' },
      { brand: '한샘', type: 'note', name: '24-25년 명칭 변경 매장', reason: 'X → X직매장/표준가구로 sales 데이터 분리 → marker_to_sales.js에서 합산 매핑' },
      { brand: '에몬스', type: 'note', name: '용산 아이파크', reason: '"외부인판매(아이파크_X)" 시리즈 모두 용산 아이파크 매장 매출 채널' }
    ]
  },
  {
    date: '2026-04-27',
    summary: 'Google Sheets API 매출 데이터 동기화 + 매칭 강화',
    events: [
      { brand: '까사미아', type: 'blocked', name: '서대구대리점', reason: '자체 아울렛 — 블랙리스트 추가' },
      { brand: '까사미아', type: 'note', name: '마테라소 매장', reason: '매트리스 전문 브랜드 → 가구 매장 분석에서 제외 (sync 시 자동 필터링)' }
    ]
  },
  {
    date: '2026-04-15',
    summary: '자동화 첫 크롤링 결과 정리',
    events: [
      { brand: '일룸', type: 'blocked', name: '엄마의서재', reason: '가구 매장 아님 — 블랙리스트' },
      { brand: '리바트', type: 'blocked', name: '현대리바트 송도점 (공식명)', reason: '우리는 "리바트토탈 송도 현대프리미엄아울렛점"으로 등록된 동일 매장' }
    ]
  },
  {
    date: '2026-04-15',
    summary: '공식몰 5개 브랜드 크롤링 + 데이터 정리',
    events: [
      { brand: '일룸', type: 'removed', name: '포항점', reason: '공식 사이트에서 폐점 확인' },
      { brand: '일룸', type: 'removed', name: '대전도안점', reason: '공식 사이트에서 폐점 확인' },
      { brand: '일룸', type: 'removed', name: '천안불당점', reason: '공식 사이트에서 폐점 확인' },
      { brand: '일룸', type: 'removed', name: '롯데몰여수점(팝업)', reason: '팝업 매장 종료' },
      { brand: '까사미아', type: 'added', name: '까사미아 롯데아울렛고양점', reason: '공식몰 신규 확인 (롯데아울렛 고양점 입점)' },
      { brand: '까사미아', type: 'added', name: '까사미아 신세계프리미엄아울렛 부산점', reason: '공식몰 신규 확인 (기존 신세계사이먼부산아울렛점 → 명칭 변경 후 등록)' },
      { brand: '까사미아', type: 'blocked', name: '아울렛 기흥대리점', reason: '자체 아울렛 — 블랙리스트 추가' },
      { brand: '한샘', type: 'blocked', name: 'INT부천위탁유통_오늘의집대리점', reason: '"부천중동대리점"과 동일 주소 - 중복이므로 미등록' },
      { brand: '리바트', type: 'removed', name: '현대리바트 송도점 / 리바트토탈 송도 현대프리미엄 아울렛 → "리바트토탈 송도 현대프리미엄아울렛점"(직영)으로 병합', reason: '같은 주소 중복 매장 통합 + 공식 shopTypeCd=01 반영 (직영)' }
    ]
  },
  {
    date: '2026-04-14',
    summary: '초기 데이터 정리 + 자동 업데이트 체계 구축',
    events: [
      { brand: '리바트', type: 'added', name: '스타필드 고양점', reason: '공식몰 확인 신규 추가' },
      { brand: '에몬스', type: 'removed', name: '금호월드점', reason: '공식몰에서 폐점 확인' },
      { brand: '리바트', type: 'blocked', name: '리바트 용인점 / 리바트 상설할인점', reason: '상설 할인매장 — 블랙리스트' }
    ]
  }
];
