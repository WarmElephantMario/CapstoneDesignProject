import React, { useState } from 'react';
import './App.css';
import { Link } from 'react-router-dom';

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

function AltText() {
  const [file, setFile] = useState(null); // 파일 상태 설정
  const [fileName, setFileName] = useState(''); // 파일명 상태 설정
  const [description, setDescription] = useState('');

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
        body: formData
      })
        .then(response => response.json())
        .then(data => {
          console.log('서버 응답:', data);
          console.log(data.message);
          console.log(data.description);
          setDescription(data.description); // 설명 상태 업데이트
        })
        .catch(error => {
          console.error('파일 업로드 중 오류 발생:', error);
        });
    }
  };

  return (
    <div>
      <Header Title="COMMA_DEMO" href="/" />
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
      {fileName && <div><p>파일명: {fileName}</p> <p>Uploaded Image:</p>
          <img src={URL.createObjectURL(file)} alt={fileName} /> </div>}
      {description && (
        <div>
          <h2>이미지 설명:</h2>
        </div>
      )}
      <div className="output-box">
        {description}
      </div>
    </div>
  );
}

export default AltText;

