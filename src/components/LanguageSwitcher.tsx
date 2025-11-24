/**
 * 语言切换组件
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages, SupportedLanguage } from '../i18n/config';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: SupportedLanguage) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 1000,
      display: 'flex',
      gap: '5px',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: '5px',
      borderRadius: '5px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
    }}>
      {supportedLanguages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          style={{
            padding: '5px 10px',
            border: i18n.language === lang.code ? '2px solid #4CAF50' : '1px solid #ccc',
            borderRadius: '3px',
            backgroundColor: i18n.language === lang.code ? '#4CAF50' : 'white',
            color: i18n.language === lang.code ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 0.3s'
          }}
          title={lang.name}
        >
          {lang.flag} {lang.name}
        </button>
      ))}
    </div>
  );
};

