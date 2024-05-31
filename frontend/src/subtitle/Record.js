// import React, { useState } from 'react';
import './Record.css'
import { Link } from 'react-router-dom';
import { default as React, useEffect, useState, useRef } from "react";
//import { Button } from "react-bootstrap";
//import Container from "react-bootstrap/Container";
import * as io from "socket.io-client";

function Header(props) {
  return (
    <header>
      <h1>
        <Link to={props.href}>{props.Title}</Link>
      </h1>
    </header>
  );
}

function Article(props) {
  return <article>{props.Title}</article>;
}

const sampleRate = 16000;

const getMediaStream = () =>
  navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: "default",
      sampleRate: sampleRate,
      sampleSize: 16,
      channelCount: 1,
    },
    video: false,
  });

const AudioToText = () => {
  const [connection, setConnection] = useState();
  const [currentRecognition, setCurrentRecognition] = useState();
  const [recognitionHistory, setRecognitionHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState();
  const processorRef = useRef();
  const audioContextRef = useRef();
  const audioInputRef = useRef();
  const [fileInfo, setFileInfo] = useState(null);
  const [file, setFile] = useState(null); // file 상태 추가

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      console.log('업로드한 이미지 파일 URL:', url);
      setFileInfo({
        name: file.name,
        size: file.size,
        url: url,
      });
      setFile(file); // file 상태 설정
    }
  };

  const handleUploadClick = () => {
    document.getElementById('fileInput').click();
  };

  const handleFileSubmit = () => {
    // 파일을 서버로 전송하는 코드
    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      fetch('http://localhost:5000/upload/subtitle', {
        method: 'POST',
        body: formData
      })
        .then(response => response.json())
        .then(data => {
          console.log('서버 응답:', data);
        })
        .catch(error => {
          console.error('파일 업로드 중 오류 발생:', error);
        });
    }
  }

  const speechRecognized = (data) => {
    if (data.isFinal) {
      setCurrentRecognition("...");
      // setRecognitionHistory((old) => [data.text, ...old]);
      // 최신 자막이 밑으로 쭉 출력되도록
      setRecognitionHistory((old) => [...old, data.text]);
    } else setCurrentRecognition(data.text + "...");
  };

  useEffect(() => {
    console.log("\n\nrecognitionHistory", recognitionHistory);
  }, [recognitionHistory]);

  const connect = () => {
    connection?.disconnect();
    const socket = io.connect("http://localhost:5000");
    socket.on("connect", () => {
      console.log("connected", socket.id);
      setConnection(socket);
    });

    socket.emit("send_message", "hello world");

    socket.emit("startGoogleCloudStream");

    socket.on("receive_message", (data) => {
      console.log("received message", data);
    });

    socket.on("receive_audio_text", (data) => {
      speechRecognized(data);
      console.log("received audio text", data);
    });

    socket.on("disconnect", () => {
      console.log("disconnected", socket.id);
    });
  };

  const disconnect = () => {
    if (!connection) return;
    connection?.emit("endGoogleCloudStream");
    connection?.disconnect();
    processorRef.current?.disconnect();
    audioInputRef.current?.disconnect();
    audioContextRef.current?.close();
    setConnection(undefined);
    setRecorder(undefined);
    setIsRecording(false);
  };

  useEffect(() => {
    (async () => {
      if (connection) {
        if (isRecording) {
          return;
        }

        const stream = await getMediaStream();

        audioContextRef.current = new window.AudioContext();

        await audioContextRef.current.audioWorklet.addModule(
          "/src/worklets/recorderWorkletProcessor.js"
        );

        audioContextRef.current.resume();

        audioInputRef.current =
          audioContextRef.current.createMediaStreamSource(stream);

        processorRef.current = new AudioWorkletNode(
          audioContextRef.current,
          "recorder.worklet"
        );

        processorRef.current.connect(audioContextRef.current.destination);
        audioContextRef.current.resume();

        audioInputRef.current.connect(processorRef.current);

        processorRef.current.port.onmessage = (event) => {
          const audioData = event.data;
          connection.emit("send_audio_data", { audio: audioData });
        };
        setIsRecording(true);
      } else {
        console.error("No connection");
      }
    })();
    return () => {
      if (isRecording) {
        processorRef.current?.disconnect();
        audioInputRef.current?.disconnect();
        if (audioContextRef.current?.state !== "closed") {
          audioContextRef.current?.close();
        }
      }
    };
  }, [connection, isRecording, recorder]);

  const upload = <input type="button" value="업로드하기" className="button" onClick={handleUploadClick} />;
  const submit = <input type="button" value="submit" className="button" onClick={handleFileSubmit}/>;
  const record = <input type="button" value="실시간자막시작" className="button" onClick={connect}/>;
  const endRecord = <input type="button" value="실시간자막종료" className="button" onClick={disconnect}/>;

  return (
    <div>
      <Header Title="COMMA_DEMO" href ="/"/>
      <Article Title="이미지를 입력해주세요" />
      <div className="article-and-buttons">
        {upload}
        {submit}
        {record}
        {endRecord}
      </div>
      <input
        type="file"
        id="fileInput"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
      <div>
      {fileInfo && (
          <div>
            <p>파일명: {fileInfo.name}</p>
            <p>파일 크기: {fileInfo.size} bytes</p>
            <img src={fileInfo.url} alt="업로드된 이미지" />
          </div>
        )}
      </div>
      <div className="output-box">
         {recognitionHistory.map((tx, idx) => (
            <p key={idx}>{tx}</p>
          ))}
          <p>{currentRecognition}</p>
      </div>
    </div>
  );
}

export default AudioToText;