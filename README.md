1. backend 디렉토리에 .env 만들기
아래 내용 입력
OPENAI_API_KEY = YOUR_API_KEY

2. 루트 디렉토리에 your_google_api.json 파일 넣기
server.js 의 아래 부분 본인 파일 이름으로 수정
process.env.GOOGLE_APPLICATION_CREDENTIALS = "your_google_api.json";
