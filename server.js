const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const chalk = require('chalk');
const {Writable} = require('stream');
const recorder = require('node-record-lpcm16');
const speech = require('@google-cloud/speech').v1p1beta1;
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'ko-KR';
const streamingLimit = 290000;

const client = new speech.SpeechClient();

app.use(cors());

const config = {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode
  };
  
  const request = {
    config,
    interimResults: true,
    single_utterance: true
  };
  
  let recognizeStream = null;
  let restartCounter = 0;
  let audioInput = [];
  let lastAudioInput = [];
  let resultEndTime = 0;
  let isFinalEndTime = 0;
  let finalRequestEndTime = 0;
  let newStream = true;
  let bridgingOffset = 0;
  let lastTranscriptWasFinal = false;
  
  function startStream() {
    audioInput = [];
    recognizeStream = client
      .streamingRecognize(request)
      .on('error', err => {
        if (err.code === 11) {
          // restartStream();
        } else {
          console.error('API request error ' + err);
        }
      })
      .on('data', speechCallback);
  
    setTimeout(restartStream, streamingLimit);
  }

  

  const speechCallback = stream => {
    if (stream.results && stream.results[0]) {
      if (stream.results[0].resultEndTime) {
        resultEndTime =
          stream.results[0].resultEndTime.seconds * 1000 +
          Math.round(stream.results[0].resultEndTime.nanos / 1000000);
      }
  
      const correctedTime =
        resultEndTime - bridgingOffset + streamingLimit * restartCounter;
  
      let stdoutText = '';
      if (stream.results[0].alternatives[0]) {
        stdoutText =
          correctedTime + ': ' + stream.results[0].alternatives[0].transcript;
      }
  
      if (stream.results[0].isFinal) {
        io.emit('transcript', { text: stdoutText, color: 'green' });
  
        isFinalEndTime = resultEndTime;
        lastTranscriptWasFinal = true;
      }
    }
  }
//       } else {
//         if (stdoutText.length > process.stdout.columns) {
//           stdoutText =
//             stdoutText.substring(0, process.stdout.columns - 4) + '...';
//         }
//         io.emit('transcript', { text: stdoutText, color: 'red' });
  
//         lastTranscriptWasFinal = false;
//       }
//     }
//   };
  
  const audioInputStreamTransform = new Writable({
    write(chunk, encoding, next) {
      if (newStream && lastAudioInput.length !== 0) {
        const chunkTime = streamingLimit / lastAudioInput.length;
        if (chunkTime !== 0) {
          if (bridgingOffset < 0) {
            bridgingOffset = 0;
          }
          if (bridgingOffset > finalRequestEndTime) {
            bridgingOffset = finalRequestEndTime;
          }
          const chunksFromMS = Math.floor(
            (finalRequestEndTime - bridgingOffset) / chunkTime
          );
          bridgingOffset = Math.floor(
            (lastAudioInput.length - chunksFromMS) * chunkTime
          );
  
          for (let i = chunksFromMS; i < lastAudioInput.length; i++) {
            recognizeStream.write(lastAudioInput[i]);
          }
        }
        newStream = false;
      }
  
      audioInput.push(chunk);
  
      if (recognizeStream) {
        recognizeStream.write(chunk);
      }
  
      next();
    },
  
    final() {
      if (recognizeStream) {
        recognizeStream.end();
      }
    },
  });
  
  function restartStream() {
    if (recognizeStream) {
      recognizeStream.end();
      recognizeStream.removeListener('data', speechCallback);
      recognizeStream = null;
    }
    if (resultEndTime > 0) {
      finalRequestEndTime = isFinalEndTime;
    }
    resultEndTime = 0;
  
    lastAudioInput = [];
    lastAudioInput = audioInput;
  
    restartCounter++;
  
    if (!lastTranscriptWasFinal) {
      io.emit('transcript', { text: '', color: 'yellow' });
    }
  
    newStream = true;
  
    startStream();
  }
  
  recorder
    .record({
      sampleRateHertz: sampleRateHertz,
      threshold: 200, // Silence threshold
      silence: 5,
      keepSilence: true,
      recordProgram: 'sox', // Try also "arecord" or "sox"
    })
    .stream()
    .on('error', err => {
        console.error('Audio recording error' + err);
    })
    .pipe(audioInputStreamTransform);
    console.log('');
console.log(`Server is listening port8080...`);
console.log('');

// startStream();

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});


io.on('connection', socket => {
  console.log('A client connected');
  startStream();

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('A client disconnected');
  });
});

server.listen(8080);