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
const { distance } = require('fastest-levenshtein');
keywords = "";

//CER 계산 함수 
/** 
 * Calculate Character Error Rate (CER)
 * @param {string} ref - The reference text
 * @param {string} hyp - The hypothesis text
 * @returns {number} The CER as a percentage
 */

function calculateCER(ref, hyp) {
  const levenshteinDistance = distance(ref, hyp);
  return (levenshteinDistance / ref.length) * 100;
}
//WER 계산 함수 
function calculateWER(ref, hyp) {
  const refWords = ref.split(' ');
  const hypWords = hyp.split(' ');
  const levenshteinDistance = distance(refWords.join(' '), hypWords.join(' '));
  return (levenshteinDistance / refWords.length) * 100;
}

const ref = "안녕하세요, 오늘은 동물세포와 식물세포의 구조에 대해 간단히 알아보겠습니다. 동물세포는 핵, 세포질, 세포막, 미토콘드리아, 리보솜 등으로 구성되어 있습니다. 식물세포는 동물세포의 구성 요소 외에도 세포벽, 엽록체, 큰 액포를 가지고 있어 광합성 및 구조적 지지에 중요한 역할을 합니다. 이처럼 동물세포와 식물세포는 비슷하면서도 고유한 특징들을 가지고 있습니다."; //대본
let finalTranscription = "";

app.use(logger("dev"));
app.use(bodyParser.json());

// TODO: OpenAI API 설정
const openai = new OpenAIApi();
openai.api_key = process.env.OPENAI_API_KEY;

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
process.env.GOOGLE_APPLICATION_CREDENTIALS = "warmelephantmario.json";

const speechClient = new speech.SpeechClient();


io.on("connection", (socket) => {
  let recognizeStream = null;
  console.log("** a user connected - " + socket.id + " **\n");

  socket.on("disconnect", () => {
    calculateAndLogAccuracy();
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

          if (isFinal) {
            finalTranscription += trans;
            console.log("최종 자막: " + finalTranscription);
          }

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

  function calculateAndLogAccuracy() {
    const cer = calculateCER(ref, finalTranscription); // CER 계산
    const wer = calculateWER(ref, finalTranscription); // WER 계산
    console.log(`입력 스트링 - CER calculated: ${cer.toFixed(2)}%`);
    console.log(`입력 스트링 - WER calculated: ${wer.toFixed(2)}%`);
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
      "max_tokens": 300
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
    const prompt = `이 강의자료에 포함된 주요 키워드 단어를 나열해 주세요: [이미지 데이터 Base64] ${fileData}`;

    // OpenAI GPT-4에 프롬프트로 설명 요청
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            //Please find the keywords for this lecture material as much as possible.
            { type: "text", text: "이 강의자료의 키워드를 가능한 한 많이 찾아주세요. 중복되지 않는 것으로, 그림으로부터 연상할 수 있는 이 수업과 관련될 수 있는 단어들을 최대한 많이. 그리고 키워드만 나열해주세요." },
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
    console.log(keywords);
    console.log(typeof (keywords));
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

//스트링 받기 실험 (녹음시작 버튼 누르면 실행됨)
//실행 순서: 실시간으로 자막을 가져오고 -> 그걸 전역변수 keyword 이용해서 정확도 향상 -> 그걸 웹사이트에 뿌려줌
// app.post('/upload/subtitle/record', upload.single('file'), async (req, res) => {

//   //여기에 계속 실시간 자막이 isfinal마다 들어와야 함..
//   const text = req.body.text;
//   console.log('입력 스트링:', text)


//   try {
//     const response = await openai.chat.completions.create({
//       messages: [
//         // 수정: 키워드를 포함하여 설명을 요청
//         { "role": "user", "content": `The following is a subtitle that recognizes colloquialism of what the teacher said in class, so the accuracy is poor. Look at the keywords related to today's class, and change **only the less accurate word** of the subtitles according to the keywords. I want to save as much part of the teacher speak as possible, so please correct **only the inaccurate part**. "${text}" with keywords: ${keywords}` }
//       ],
//       model: "gpt-3.5-turbo",
//     });

//     console.log(response.choices[0].message);
//     const description = response.choices[0].message.content;
//     console.log('GPT 답변:', description);    //gpt의 응답 (수정된 답변)을 repsonse에 담아서 보내줌

//     res.status(200).send({
//       message: '수정된 자막 업로드 및 설명 생성 성공',
//       description: description,
//     });

//   } catch (error) {
//     console.error('Error:', error.response.data);
//     res.status(500).send('GPT와의 대화에서 오류가 발생했습니다.'); // 에러 발생 시 클라이언트에 에러 응답
//   }

// });


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
    model: "latest_long",
    // model: "command_and_search",
    // model: "default",
    useEnhanced: true,
    "speechContexts": [{
      "phrases": [keywords]
    }]
  },
  interimResults: true,
};
