const express = require('express');
const app = express();
const port = 5000; // 백엔드 서버 포트 번호
const multer = require('multer');

const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // 파일 저장 경로
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // 업로드된 파일명 그대로 사용
  }
});

const upload = multer({ storage: storage });

app.use(express.json());

// 파일 업로드 처리
app.post('/upload', upload.single('file'), (req, res) => {
  // 클라이언트에서 전송한 파일 데이터는 req.file 객체에 포함됩니다.
  console.log('업로드한 이미지 파일:', req.file);
  // 업로드 성공을 클라이언트에 응답
  res.status(200).send('이미지 업로드 성공');
});

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 포트에서 실행 중입니다.`);
});
