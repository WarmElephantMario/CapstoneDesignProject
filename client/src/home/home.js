import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './index.css';

function Header(props) {
  return (
  <h1>
    {props.Title}
  </h1>
  );
}

function Article(props) {
  return <article>
    <h2>
      <Link to={props.href}>{props.Title}</Link>
    </h2></article>;
}

function Home() {
  return (
    <div>
      <Header Title="COMMA_DEMO" />
      <Article Title="대체텍스트" href="/alt-text"/>
      <Article Title="실시간 자막" href="/subtitle"/>

    </div>
  );
}

export default Home;
