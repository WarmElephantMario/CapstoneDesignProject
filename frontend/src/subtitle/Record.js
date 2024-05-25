import React, { useState } from 'react';
import './Record.css'
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

function Record() {
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

  const upload = <input type="button" value="업로드하기" className="button" onClick={handleUploadClick} />;
  const submit = <input type="button" value="submit" className="button" onClick={handleFileSubmit}/>;
  const record = <input type="button" value="녹음시작" className="button" />;

  return (
    <div>
      <Header Title="COMMA_DEMO" href ="/"/>
      <Article Title="이미지를 입력해주세요" />
      <div className="article-and-buttons">
        {upload}
        {submit}
        {record}
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
      <div className="output-box"></div>
    </div>
  );
}

export default Record;
