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
const speech = require("@google-cloud/speech");
const logger = require("morgan");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");

app.use(logger("dev"));
app.use(bodyParser.json());

// OpenAI API 설정
const openai = new OpenAIApi('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');

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

//TODO: Create this file in the server directory of the project
process.env.GOOGLE_APPLICATION_CREDENTIALS = "./warmelephantmario.json";

const speechClient = new speech.SpeechClient();


io.on("connection", (socket) => {
  let recognizeStream = null;
  console.log("** a user connected - " + socket.id + " **\n");

  socket.on("disconnect", () => {
    console.log("** user disconnected ** \n");
  });

  socket.on("send_message", (message) => {
    console.log("message: " + message);
    setTimeout(() => {
      io.emit("receive_message", "got this message" + message);
    }, 1000);
  });

  socket.on("startGoogleCloudStream", function (data) {
    startRecognitionStream(this, data);
  });

  socket.on("endGoogleCloudStream", function () {
    console.log("** ending google cloud stream **\n");
    stopRecognitionStream();
  });

  socket.on("send_audio_data", async (audioData) => {
    io.emit("receive_message", "Got audio data");
    if (recognizeStream !== null) {
      try {
        recognizeStream.write(audioData.audio);
      } catch (err) {
        console.log("Error calling google api " + err);
      }
    } else {
      console.log("RecognizeStream is null");
    }
  });

  function startRecognitionStream(client) {
    console.log("* StartRecognitionStream\n");
    try {
      recognizeStream = speechClient
        .streamingRecognize(request)
        .on("error", console.error)
        .on("data", (data) => {
          const result = data.results[0];
          const isFinal = result.isFinal;
          const trans = data.results[0].alternatives[0].transcript;
          // console.log(isFinal);

          // const transcriptType = typeof trans;
          // console.log("Type of transcript:" + transcriptType);
          // console.log("자막:" + trans);

          const transcription = data.results
            .map((result) => result.alternatives[0].transcript)
            .join("\n");

          // console.log(`Transcription: `, transcription);

          client.emit("receive_audio_text", {
            text: transcription,
            isFinal: isFinal,
          });

          // if end of utterance, let's restart stream
          // this is a small hack to keep restarting the stream on the server and keep the connection with Google api
          // Google api disconects the stream every five minutes
          if (data.results[0] && data.results[0].isFinal) {
            stopRecognitionStream();
            startRecognitionStream(client);
            console.log("restarted stream serverside");
          }
        });
    } catch (err) {
      console.error("Error streaming google api " + err);
    }
  }

  function stopRecognitionStream() {
    if (recognizeStream) {
      console.log("* StopRecognitionStream \n");
      recognizeStream.end();
    }
    recognizeStream = null;
  }
});





//////////

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


// 파일 업로드 처리_대체텍스트
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


// 파일 업로드 처리_실시간 자막
app.post('/upload/subtitle', upload.single('file'), async (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.file.filename);

  // 업로드한 파일 경로 확인
  console.log('업로드한 이미지 파일:', filePath);

});


// 서버 시작
server.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 포트에서 실행 중입니다.`);
});


// =========================== GOOGLE CLOUD SETTINGS ================================ //

// The encoding of the audio file, e.g. 'LINEAR16'
// The sample rate of the audio file in hertz, e.g. 16000
// The BCP-47 language code to use, e.g. 'en-US'
const encoding = "LINEAR16";
const sampleRateHertz = 16000;
const languageCode = "ko-KR"; //en-US
const alternativeLanguageCodes = ["en-US", "ko-KR"];

const request = {
  config: {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: "ko-KR",
    //alternativeLanguageCodes: alternativeLanguageCodes,
    enableWordTimeOffsets: true,
    enableAutomaticPunctuation: true,
    enableWordConfidence: true,
    enableSpeakerDiarization: true,
    //diarizationSpeakerCount: 2,
    //model: "video",
    model: "command_and_search",
    //model: "default",
    useEnhanced: true,
  },
  interimResults: true,
};
