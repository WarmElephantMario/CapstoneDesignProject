import React, { useState } from 'react';
import './App.css';

function Header(props) {
  return (
    <header>
      <h1>{props.Title}</h1>
    </header>
  );
}

function Article(props) {
  return <article>{props.Title}</article>;
}

function AltText() {
  const [file, setFile] = useState(null); // 파일 상태 설정
  const [fileName, setFileName] = useState(''); // 파일명 상태 설정

  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile); // 파일 상태 업데이트
      setFileName(selectedFile.name); // 파일명 상태 업데이트
      const url = URL.createObjectURL(selectedFile);
      console.log('업로드한 이미지 파일 URL:', url);
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

      fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      })
      .then(response => {
        if (response.ok) {
          console.log('파일 업로드 성공');
          // 업로드 성공 시 추가 작업 수행
        } else {
          console.error('파일 업로드 실패');
        }
      })
      .catch(error => {
        console.error('파일 업로드 중 오류 발생:', error);
      });
    }
  };

  return (
    <div>
      <Header Title="COMMA_DEMO" />
      <Article Title="이미지를 입력해주세요" />
      <div className="article-and-buttons">
        <input type="button" value="업로드하기" className="button" onClick={handleUploadClick} />
        <input type="button" value="submit" className="button" onClick={handleFileSubmit} />
      </div>
      <input
        type="file"
        id="fileInput"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
      {fileName && <div>파일명: {fileName}</div>}
      <div className="output-box">
      </div>
    </div>
  );
}

export default AltText;

