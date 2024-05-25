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

// OpenAI API 설정
const openai = new OpenAIApi(/*fill here your api_key*/);

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


// 파일 업로드 처리
app.post('/upload', upload.single('file'), async (req, res) => {
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

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 포트에서 실행 중입니다.`);
});
