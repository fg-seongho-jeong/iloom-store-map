// 우리 지도 매장명 → Google Sheets API 매장명 매핑
// (이름이 다른 동일 매장만 등록. 진짜 누락 매장은 sync 시 자연 탈락됨)
//
// 사용처: sync_sales.js
// 추가/제거 시 매장명을 정확히 일치시킬 것 (공백 포함)

var STORE_NAME_MAPPING = {
  // brand → { ourMapName: apiName }
  '에몬스': {
    '강릉점': '(신)강릉점'
  },
  '일룸': {
    '스타필드수원키즈(3': '스타필드수원키즈(3층)'
  },
  '한샘': {
    '대전NC유성점': '대전(NC)',
    // 2026-07 팝업: 마커 없이 매출만. HF중복분 합산(분당)
    'AK분당(팝업)': ['에이케이플라자(주) 분당점', 'HF에이케이 분당(직)'],
    'AK수원(팝업)': 'AK수원',
    '롯데노원(팝업)': 'HF롯데(D)_노원'
  },
  '까사미아': {
    '서산': '서산위탁'
  }
  // 한샘 7개(남양산/부산사상/수원인계/순천/아트몰링/용인/춘천/포천)는 매출 0이라 sync 시 자동 탈락
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { STORE_NAME_MAPPING };
}
