import React from 'react';
import { MultiPlayerGameBoard } from './components/MultiPlayerGameBoard';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { IdeasManager } from './components/IdeasManager';
import './App.css';

function App() {
  return (
    <div className="App">
      <LanguageSwitcher />
      <MultiPlayerGameBoard />
      <IdeasManager />
    </div>
  );
}

export default App;

