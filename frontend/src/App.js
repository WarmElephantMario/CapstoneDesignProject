import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './home/Home';
import AltText from './alt_text/App';
import Record from './subtitle/Record';
// import './App.css';

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/alt-text" element={<AltText />} />
        <Route path="/subtitle" element={<Record />} />
      </Routes>
    </div>
  );
}

export default App;
