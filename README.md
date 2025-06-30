# 철도 작업장 안전관리 웹


```html

<!DOCTYPE html> <html lang="ko"> <head> <meta charset="UTF-8" /> <title>Mermaid 작업 단계 플로우차트</title> <!-- 1. Mermaid 라이브러리 로딩 --> <script type="module"> import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs'; mermaid.initialize({ startOnLoad: true }); </script> <!-- 2. 스타일 정의 (높이, 배경, 테두리 등) --> <style> body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; } h2 { margin-bottom: 16px; } .mermaid-container { width: 100%; height: 600px; /* ▶ 전체 영역 높이 설정 */ overflow: auto; /* ▶ 내부 차트가 넘치면 스크롤 */ border: 1px solid #ccc; background-color: #fff; padding: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); } .mermaid { width: 100%; min-height: 500px; /* ▶ Mermaid 차트의 최소 높이 */ } </style> </head> <body> <!-- 3. 제목 영역 --> <h2>작업 단계 Flowchart</h2> <!-- 4. Mermaid 차트 렌더링 영역 --> <div class="mermaid-container"> <div class="mermaid"> flowchart TD A[요구사항 수집] --> B[기획 및 설계] B --> C[디자인] C --> D[개발] D --> E[테스트] E --> F[배포] F --> G[운영 및 유지보수] </div> </div> </body> </html> \```
