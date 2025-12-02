/**
 * 配置组模态面板组件
 */

import React from 'react';

interface ConfigGroupModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const ConfigGroupModal: React.FC<ConfigGroupModalProps> = ({
  isOpen,
  title,
  onClose,
  children
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className={`config-modal-overlay ${isOpen ? '' : 'hidden'}`}
      onClick={onClose}
    >
      <div 
        className="config-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="config-modal-header">
          <h2 className="config-modal-title">{title}</h2>
          <button 
            className="config-modal-close-btn"
            onClick={onClose}
            title="关闭"
          >
            ✕
          </button>
        </div>
        <div className="config-modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

