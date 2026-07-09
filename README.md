# 🤖 성남중원도서관 AI 홍보 비서 시스템 (Library AI PR Assistant)

> **"포스터 이미지 한 장으로 홈페이지 공지, SNS 피드, 디자인 원고까지 30초 만에 해결"**  
> 본 프로젝트는 구글 앱스 스크립트(Google Apps Script)와 최신 멀티모달 AI(Gemini 3.5 Flash)를 활용하여 도서관 사서의 반복적인 홍보 업무를 자동화하고 다채널 맞춤형 콘텐츠를 생성하는 로우코드(Low-Code) 솔루션입니다.

---

## ✨ 핵심 기능 (Key Features)

1. **멀티모달 이미지 OCR 분석 (Vision API)**
   * 도서관 PC 보안 규정을 준수하기 위해 외부 드라이브 저장 단계를 배제하고, 브라우저 메모리상에서 포스터 이미지(PNG/JPG)를 즉시 인코딩하여 Gemini API로 전송합니다.
   * AI가 이미지 내 텍스트(강좌명, 운영 일시, 모집 대상 등)를 완벽하게 파싱하여 홍보 원천 데이터로 활용합니다.

2. **3대 핵심 홍보 채널 맞춤형 동시 생성**
   * **🖥️ 홈페이지 공지문:** 개조식 구성, 배움숲 접수 링크 매핑 및 공공기관의 정중한 톤앤매너 적용
   * **📸 인스타그램 홍보문:** 우수 도서관(서울도서관, 국립중앙도서관 등) 벤치마킹 스타일, 직관적인 비주얼 이모지 핀, 8개 이상의 해시태그 및 모바일 최적화 레이아웃
   * **🎨 홍보 포스터 원고:** 디자인 툴(Canva, 망고보드 등)에 바로 배치할 수 있도록 헤드카피 위주의 극도로 정제된 요약본 제공

3. **스프레드시트 및 웹 독립 인터페이스 동시 지원**
   * 구글 스프레드시트 내 맞춤 메뉴(`🤖 도서관 AI 비서`)를 통한 일괄 처리
   * 현장 사서 전용 웹 대시보드(HTML5 호환 Web App) 제공

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend:** HTML5, CSS (Bulma Framework), JavaScript (FileReader API)
- **Backend:** Google Apps Script (GAS)
- **AI Core:** Google Gemini 3.5 Flash API (Multimodal Mode)

---

## 🚀 시작하기 (Installation & Setup)

1. **구글 스프레드시트 설정**
   - 새 구글 스프레드시트를 생성하고 `확장 프로그램` -> `Apps Script`를 클릭합니다.
2. **코드 붙여넣기**
   - 본 리포지토리의 `Code.gs`와 `index.html` 소스코드를 복사하여 각각 붙여넣습니다.
3. **API 키 설정**
   - `Code.gs` 파일 맨 상단의 `GEMINI_API_KEY` 변수에 본인의 Google AI Studio에서 발급받은 Gemini API 키를 입력합니다.
   ```javascript
   const GEMINI_API_KEY = "본인의_실제_API_키_입력";
