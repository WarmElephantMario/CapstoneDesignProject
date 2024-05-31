require('dotenv').config();
const express = require('express');
const app = express();
const port = 5000; // 백엔드 서버 포트 번호
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const OpenAIApi = require('openai'); // OpenAI 패키지 불러오기
const os = require('os');
const uploadSubtitle = multer({ dest: 'uploads/subtitle/' });
const axios = require('axios');
keywords = "";



//RTZR API 설정 및 토큰 받기



// OpenAI API 설정


app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'backend/uploads/'); // 파일 저장 경로
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // 업로드된 파일명 그대로 사용
  }
});

const upload = multer({ storage: storage });
app.use(express.json());



// 대체텍스트_파일 업로드 + 바로 대체텍스트 생성
app.post('/upload/alt_text', upload.single('file'), async (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.file.filename);

  // 업로드한 파일 경로 확인
  console.log('업로드한 이미지 파일:', filePath);

  try {
    // 이미지 파일을 Base64로 인코딩
    const fileData = fs.readFileSync(filePath, 'base64');
    const prompt = `이 이미지의 내용을 설명해 주세요: [이미지 데이터 Base64] ${fileData}`;

    // OpenAI GPT-4에 프롬프트로 설명 요청
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What’s in this image? Please explain the content of the picture precisely. And translate the description into Korean. Output is only consist of korean." },
            {
              type: "image_url",
              image_url: {
                "url": `data:image/jpeg;base64,${fileData}`,
              },
            },
          ],
        },
      ],
    });

    console.log(response.choices[0].message);
    const description = response.choices[0].message.content;
    console.log(description);

    res.status(200).send({
      message: '이미지 업로드 및 설명 생성 성공',
      description: description,
    });
  } catch (error) {
    console.error('이미지 설명 생성 중 오류 발생:', error);
    res.status(500).send('이미지 설명 생성 실패');
  }
});



//실시간 자막_파일 업로드 처리 + 사진에서 키워드 추출하기
app.post('/upload/subtitle', upload.single('file'), async (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.file.filename);

  console.log('업로드한 이미지 파일:', filePath);

  try {
    // 이미지 파일을 Base64로 인코딩
    const fileData = fs.readFileSync(filePath, 'base64');
    const prompt = `이 이미지에 포함된 주요 키워드 단어를 가능한 많이 나열해 주세요: [이미지 데이터 Base64] ${fileData}`;

    // OpenAI GPT-4에 프롬프트로 설명 요청
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Find keywords contained in the image as much as possible." },
            {
              type: "image_url",
              image_url: {
                "url": `data:image/jpeg;base64,${fileData}`,
              },
            },
          ],
        },
      ],
    });

    console.log(response.choices[0].message);
    keywords = response.choices[0].message.content;
    console.log(typeof(keywords));
    // const keywordString = keywords.join(', '); // 키워드 배열을 문자열로 변환

    res.status(200).send({
      message: '이미지 업로드 및 키워드 생성 성공',
      keywords: keywords,
    });
  } catch (error) {
    console.error('이미지 설명 생성 중 오류 발생:', error);
    res.status(500).send('이미지 설명 생성 실패');
  }


});



//스트링 받기 실험
app.post('/upload/subtitle/record', upload.single('file'), async (req, res) => {
  const example = "대기 중에 씨오투와 씨오가 있네요";

  console.log('입력 스트링:', example);

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        // 수정: 키워드를 포함하여 설명을 요청
        { "role": "user", "content": `다음 string에서 부정확한 설명만 keyword에 해당하는 단어로 고쳐서 내보내줘 "${example}" with keywords: ${keywords}` }
      ],
      model: "gpt-3.5-turbo",
    });

    const response = completion.choices[0].message.content;
    console.log('GPT 답변:', response);
    res.send(response); // 클라이언트에 응답으로 답변 전송
  } catch (error) {
    console.error('Error:', error.response.data);
    res.status(500).send('GPT와의 대화에서 오류가 발생했습니다.'); // 에러 발생 시 클라이언트에 에러 응답
  }

});



//실시간 자막_ 녹음 버튼 누른 경우에 실시간 자막 생성 (키워드 바탕으로)
app.post('/upload/record', async (req, res) => {


});


// 서버 시작
app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 포트에서 실행 중입니다.`);
});
