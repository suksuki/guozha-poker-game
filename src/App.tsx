import React from 'react';
import { MultiPlayerGameBoard } from './components/MultiPlayerGameBoard';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import './App.css';

function App() {
  return (
    <div className="App">
      <LanguageSwitcher />
      <MultiPlayerGameBoard />
    </div>
  );
}

export default App;

