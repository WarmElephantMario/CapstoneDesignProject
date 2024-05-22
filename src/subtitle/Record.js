import React, { useState } from 'react';
import './Record.css';

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

function Record() {
  const [fileInfo, setFileInfo] = useState(null);

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
    }
  };

  const handleUploadClick = () => {
    document.getElementById('fileInput').click();
  };

  const upload = <input type="button" value="업로드하기" className="button" onClick={handleUploadClick} />;
  const submit = <input type="button" value="submit" className="button" />;
  const record = <input type="button" value="녹음시작" />;

  return (
    <div>
      <Header Title="COMMA_DEMO" />
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
      <div className="output-box">
      </div>
    </div>
  );
}

export default Record;

