// =========================================================================
// 성남중원도서관 AI 홍보 비서 시스템 (멀티모달 이미지 인식 지원 업그레이드 버전)
// =========================================================================

// ⚠️ 환경 설정: 사서님의 Gemini API 키를 입력해주세요!
const GEMINI_API_KEY = ""YOUR_GEMINI_API_KEY_HERE"; 

// 글로벌 비즈니스 고정 값 및 환경 설정
const BASE_URL_BAEUMSOOP = "https://sugang.seongnam.go.kr";
const LIB_CONTACT_DEFAULT = "성남중원도서관  (031-724-0674)";
const MODEL_NAME = "gemini-3.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

// 시트 열(Column) 인덱스 정의 (1부터 시작, A=1, B=2...)
const COL_TITLE    = 1;  // A열: 강좌/행사명
const COL_EDU_DATE = 2;  // B열: 교육 기간 (전시 기간)
const COL_REG_DATE = 3;  // C열: 접수 기간
const COL_TARGET   = 4;  // D열: 대상 및 정원
const COL_PLACE    = 5;  // E열: 운영 장소
const COL_COST     = 6;  // F열: 수강료 및 재료비
const COL_CONTENT  = 7;  // G열: 주요 내용
const COL_CONTACT  = 8;  // H열: 문의 사항
const COL_OUT_HOME = 9;  // I열: 홈페이지 공지문 저장
const COL_OUT_INS  = 10; // J열: 인스타그램 홍보문 저장
const COL_OUT_POS  = 11; // K열: 홍보 포스터 원고 저장
const COL_TYPE     = 12; // L열: 홍보유형 (강좌, 행사, 전시 등)

/**
 * 구글 스프레드시트 내 메뉴 생성
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🤖 도서관 AI 비서')
    .addItem('현재 행 3개 채널 홍보문 동시 생성', 'generateLibraryPromos')
    .addToUi();
}

/**
 * 메인 실행 함수 (시트 제어용 컨트롤러)
 */
function generateLibraryPromos() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const activeRow = sheet.getActiveCell().getRow(); 
    
    if (activeRow <= 3) {
      showError("안내: 제목 줄이 아닌, 실제 데이터가 있는 4행부터 클릭하고 실행해주세요.");
      return;
    }
    
    if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("여기에_")) {
      showError("오류: 코드 맨 첫 줄에 실제 발급받으신 Gemini API Key를 입력해주셔야 작동합니다.");
      return;
    }

    const rowData = getRowData(sheet, activeRow);
    
    if (!rowData.title) {
      showError("오류: 현재 선택한 행에 가장 중요한 '강좌/행사명'이 비어있습니다. 제목을 입력해주세요.");
      return;
    }

    // 텍스트 전용 페이로드 생성 후 전송
    const payload = buildTextPayload(rowData);
    const aiResponse = callGemini(payload);
    
    const splitResults = splitResponse(aiResponse);
    saveResult(sheet, activeRow, splitResults);

    Browser.msgBox("🎉 홍보 문구 생성이 모두 완료되었습니다! I, J, K열을 확인해 보세요.");

  } catch (error) {
    showError(error.message);
  }
}

/**
 * 특정 행의 데이터를 읽어 객체로 반환하는 함수
 */
function getRowData(sheet, row) {
  const getVal = (col) => sheet.getRange(row, col).getDisplayValue().trim();
  
  let promoType = getVal(COL_TYPE);
  if (!promoType || promoType === 'nan' || promoType === 'None') promoType = "강좌";

  return {
    title: getVal(COL_TITLE),
    eduDate: getVal(COL_EDU_DATE),
    regDate: getVal(COL_REG_DATE),
    target: getVal(COL_TARGET),
    place: getVal(COL_PLACE),
    cost: getVal(COL_COST),
    content: getVal(COL_CONTENT),
    contact: getVal(COL_CONTACT) || LIB_CONTACT_DEFAULT,
    promoType: promoType
  };
}

/**
 * [공통 수식 시스템 시스템 프롬프트 및 가이드라인 호출 지표]
 */
function getSystemAndUserInstruction(promoType, styleFocus, dataSummary) {
  const systemInstruction = 
    "너는 성남중원도서관의 베테랑 홍보 담당 사서이다. " +
    "제공된 데이터를 바탕으로 [홈페이지 공지문], [인스타그램 홍보문], [홍보 포스터 원고] 3개를 반드시 순서대로 생성해야 한다. " +
    "공공기관에 적합한 정확하고 자연스러우며 정중한 문체를 사용하라. " +
    "⚠️ 절대 규칙: 마크다운 기호(예: **, #, -, * 등)는 어떤 경우에도 사용하지 마라. 볼드나 제목 기호를 텍스트에 포함하면 안 된다. " +
    "텍스트 출력 외에 '네 알겠습니다'와 같은 부연 설명이나 인사말은 절대 금지한다. " +
    `각 채널별 콘텐츠 사이에는 오직 [구분선] 이라는 단어만 단독으로 한 줄 입력하여 구별하라.`;

  const userPrompt = `
  현재 홍보해야 할 콘텐츠의 유형은 [${promoType}]이며, 이에 맞춰 AI 비서로서 ${styleFocus}

  [제공된 데이터 컨텍스트]
  ${dataSummary}

  정확히 아래 명시된 순서와 구조로만 본문을 작성해줘. 마크다운 기호는 절대 쓰지 마라.

  ① 홈페이지용 공지문 본문 작성
  (양식 가이드: ▢ 운영 개요, ▢ 신청 안내, ▢ 주요 내용 형태로 깔끔하게 개조식 작성하고, '▢ 문의 처' 항목을 포함할 것. 접수 방법이 존재하는 경우에만 "성남시 평생학습 통합플랫폼 '배움숲' 온라인 접수(${BASE_URL_BAEUMSOOP})" 문구를 필수로 명시할 것.)

  [구분선]

  ② 인스타그램용 홍보문 본문 작성
  (양식 가이드 - 서울도서관 우수 피드 벤치마킹 스타일):
  - [도입부]: 첫 줄은 무조건 내용과 어울리는 감성적이거나 눈에 띄는 이모지(예: 🚨, 🎨, 🗳️, 🌙, ❄️ 등)와 함께 주민들의 일상이나 타깃의 시선을 확 사로잡는 강렬한 훅(Hooking) 카피 한 줄로 시작하라.
  - [본문 구조]: 한 문장이나 의미 단위가 끝나면 반드시 엔터로 한 줄씩 띄어(여백 적극 활용) 모바일 가독성을 극대화하라. 어조는 주민들에게 다가가는 다정하고 정중한 '해요체'를 사용하라.
  - [상세 안내]: 중간 부분에는 아래 가이드라인처럼 내용과 어울리는 비주얼 이모지 핀을 활용해 핵심 정보를 한눈에 들어오게 정리하라. (제공된 정보가 없는 항목은 과감히 생략하라)
    (예시 필수 이모지 매핑: 📅운영기간 / 👥참여대상 / 📍운영장소 / 💰관람료 및 수강료 / 📌신청방법)
  - [마무리]: 마지막 줄에는 이 프로그램에 참여하면 좋은 점이나 가치(예: 환경 보호, 힐링, 선물, 역량 강화 등)를 직관적인 문장과 다채로운 이모지로 리드미컬하게 요약하고 독려하며 마무리하라.
  - [필수 정보 및 태그]: 해당되는 경우 접수 주소(sugang.seongnam.go.kr)와 연락처를 명확히 포함하고, 맨 마지막엔 콘텐츠와 관련된 공식 해시태그를 8개 이상 나열하라. 마크다운 별표(*) 기호는 절대 사용 금지.

  [구분선]
  
  ③ 홍보 포스터용 원고 작성
  (양식 가이드: 디자인 툴에 즉시 배치할 수 있도록 텍스트 위주로 명확히 구획 처리할 것.)
  - [메인 타이틀]: 시선을 사로잡는 대형 헤드카피 추천 2개
  - [핵심 요약 포인트]: 포스터 중앙용 매력적인 한 줄 문구
  - [상세 안내 세션]: 디자인 상자용 간결한 핵심 단어 정리 (일시, 대상, 장소, 수강료, 신청방법, 문의처)
  `;

  return systemInstruction + "\n\n" + userPrompt;
}

/**
 * 홍보 유형별 스타일 가이드 추출
 */
function getStyleFocus(promoType) {
  switch(promoType) {
    case "강좌": return "모집과 교육 내용 중심의 안내 스타일로 작성해줘.";
    case "행사": return "주민들의 흥미를 자극하고 적극적인 참여를 유도하는 스타일에 중점을 두어 작성해줘.";
    case "전시": return "감성적이고 정중한 관람 안내 톤앤매너로 여유로운 느낌을 주어 작성해줘. 비어있는 입력 항목(예: 접수 기간 등)은 무리하게 가짜 정보를 지어내지 말고 상시 관람 맥락으로 유연하게 넘어가줘.";
    case "독서문화": return "독서의 가치와 문화 향유의 중요성을 깊이 있게 강조하며 신뢰감을 주도록 작성해줘.";
    case "방학특강": return "학부모 타깃에 완벽히 맞추고, 선착순 마감의 긴급성을 강조하여 작성해줘.";
    case "공지": return "공공기관 고유의 정형화되고 정중하며 깔끔한 공식 안내문 스타일로 작성해줘.";
    default: return "모집 중심의 단정하고 직관적인 스타일로 작성해줘.";
  }
}

/**
 * 텍스트 기반 일반 페이로드 빌더
 */
function buildTextPayload(data) {
  const styleFocus = getStyleFocus(data.promoType);
  const dataSummary = `
  - 강좌/행사명: ${data.title}
  - 교육/운영 기간: ${data.eduDate}
  - 접수 기간: ${data.regDate}
  - 대상 및 정원: ${data.target}
  - 운영 장소: ${data.place}
  - 수강료 및 재료비: ${data.cost}
  - 주요 내용: ${data.content}
  - 문의 사항: ${data.contact}`;

  const promptText = getSystemAndUserInstruction(data.promoType, styleFocus, dataSummary);

  return {
    "contents": [{ "parts": [{ "text": promptText }] }],
    "generationConfig": { "temperature": 0.6, "topP": 0.9, "topK": 40 },
    "safetySettings": getSafetySettings()
  };
}

/**
 * 웹용 멀티모달(텍스트+이미지) / 텍스트 겸용 처리 함수
 */
function callGeminiFromWeb(formData) {
  let parts = [];
  const styleFocus = getStyleFocus(formData.promoType);

  let dataSummary = "";
  
  // 만약 이미지 파일 데이터가 넘어온 경우 (멀티모달 Vision 모드)
  if (formData.imageObj && formData.imageObj.base64Data) {
    parts.push({
      "inlineData": {
        "mimeType": formData.imageObj.mimeType,
        "data": formData.imageObj.base64Data
      }
    });
    dataSummary = `사서님이 첨부하신 홍보용 포스터(리플렛) 이미지 파일을 함께 전달합니다. 이미지에서 텍스트 정보(프로그램 제목, 일시, 장소, 대상 등)를 완벽히 판독(OCR)한 뒤 홍보 콘텐츠 제작 원천 데이터로 사용하세요.`;
  }

  // 텍스트 입력창 데이터 병합
  dataSummary += `
  [보조/직접 입력 정보]
  - 강좌/행사명: ${formData.title || '이미지 분석에 위임'}
  - 교육/운영 기간: ${formData.eduDate || '이미지 분석에 위임'}
  - 접수 기간: ${formData.regDate || '이미지 분석에 위임'}
  - 대상 및 정원: ${formData.target || '이미지 분석에 위임'}
  - 운영 장소: ${formData.place || '이미지 분석에 위임'}
  - 수강료 및 재료비: ${formData.cost || '이미지 분석에 위임'}
  - 주요 내용: ${formData.content || '이미지 분석에 위임'}
  - 문의 사항: ${formData.contact || LIB_CONTACT_DEFAULT}`;

  const finalPromptText = getSystemAndUserInstruction(formData.promoType, styleFocus, dataSummary);
  parts.push({ "text": finalPromptText });

  const payload = {
    "contents": [{ "parts": parts }],
    "generationConfig": { "temperature": 0.5, "topP": 0.9, "topK": 40 },
    "safetySettings": getSafetySettings()
  };

  const aiResponse = callGemini(payload);
  return splitResponse(aiResponse);
}

function getSafetySettings() {
  return [
    { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
    { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
    { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
    { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
  ];
}

/**
 * Gemini API 통신을 수행하고 응답 텍스트를 반환하는 함수
 */
function callGemini(payload) {
  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  let response;
  try {
    response = UrlFetchApp.fetch(API_URL, options);
  } catch (netError) {
    throw new Error("네트워크 오류: API 서버에 연결할 수 없습니다. (" + netError.toString() + ")");
  }

  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();
  
  let json;
  try {
    json = JSON.parse(responseText);
  } catch (parseError) {
    throw new Error("JSON Parse 오류: API 서버 응답을 해석할 수 없습니다.");
  }

  if (responseCode !== 200) {
    const errorMsg = json.error ? json.error.message : responseText;
    throw new Error(`Gemini API 오류 (코드 ${responseCode}): ${errorMsg}`);
  }

  if (!json.candidates || !json.candidates[0] || !json.candidates[0].content || !json.candidates[0].content.parts) {
    throw new Error("응답 없음: API 결과에 유효한 텍스트가 없습니다.");
  }

  return json.candidates[0].content.parts[0].text;
}

/**
 * 구분선 기준 데이터 삼등분 분할
 */
function splitResponse(aiResponse) {
  const regex = /\[?\s*구\s*분\s*선\s*\]?/g;
  const parts = aiResponse.split(regex);

  if (!parts || parts.length < 3) {
    throw new Error("구분선 없음: AI 응답 내 규정된 [구분선]이 누락되었습니다. 생성 결과를 나누지 못했습니다.");
  }

  return {
    homepage: parts[0].trim(),
    instagram: parts[1].trim(),
    poster: parts[2].trim()
  };
}

function saveResult(sheet, row, results) {
  sheet.getRange(row, COL_OUT_HOME).setValue(results.homepage);
  sheet.getRange(row, COL_OUT_INS).setValue(results.instagram);
  sheet.getRange(row, COL_OUT_POS).setValue(results.poster);
}

function showError(message) {
  Browser.msgBox("알림", message, Browser.Buttons.OK);
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('성남중원도서관 AI 홍보 비서')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
