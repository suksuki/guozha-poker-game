/**
 * 语言切换组件
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages, SupportedLanguage } from '../i18n/config';
import './LanguageSwitcher.css';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLanguage = supportedLanguages.find(lang => lang.code === i18n.language) || supportedLanguages[0];

  const changeLanguage = (lng: SupportedLanguage) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="language-switcher-container" ref={menuRef}>
      <button
        className="language-switcher-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title={`当前语言: ${currentLanguage.name} | 点击选择语言`}
      >
        <span className="language-flag">{currentLanguage.flag}</span>
      </button>

      {isOpen && (
        <div className="language-switcher-menu">
          <div className="language-menu-header">
            <span>选择语言</span>
          </div>
          <div className="language-menu-list">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`language-menu-item ${i18n.language === lang.code ? 'active' : ''}`}
                title={lang.name}
              >
                <span className="language-flag">{lang.flag}</span>
                <span className="language-name">{lang.name}</span>
                {i18n.language === lang.code && (
                  <span className="language-check">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
