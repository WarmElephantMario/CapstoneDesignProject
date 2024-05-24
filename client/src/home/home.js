import React, { useState } from 'react';
import './index.css';

function Header(props) {
  return (
    <header>
      <h1>{props.Title}</h1>
    </header>
  );
}

function Article(props) {
  return <article><h2><a href='/'>{props.Title}</a></h2></article>;
}

function Home() {
  return (
    <div>
      <Header Title="COMMA_DEMO" />
      <Article Title="대체텍스트" />
      <Article Title="실시간 자막" />

    </div>
  );
}

export default Home;
