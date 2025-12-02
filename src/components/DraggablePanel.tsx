import React, { useState, useRef, useEffect } from 'react';
import './DraggablePanel.css';

interface DraggablePanelProps {
  title?: string;
  children: React.ReactNode;
  defaultPosition?: { x: number; y: number };
  storageKey?: string; // localStorage key to save position
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export const DraggablePanel: React.FC<DraggablePanelProps> = ({
  title,
  children,
  defaultPosition = { x: 100, y: 100 },
  storageKey,
  minWidth = 200,
  minHeight = 150,
  maxWidth,
  maxHeight
}) => {
  const [position, setPosition] = useState(defaultPosition);
  const [size, setSize] = useState({ width: 300, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // 从 localStorage 加载位置和大小
  useEffect(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.position) setPosition(data.position);
          if (data.size) setSize(data.size);
        }
      } catch (error) {
      }
    }
  }, [storageKey]);

  // 保存位置和大小到 localStorage
  const saveToStorage = (pos: { x: number; y: number }, sz: { width: number; height: number }) => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ position: pos, size: sz }));
      } catch (error) {
      }
    }
  };

  // 拖拽开始
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.draggable-panel-resize-handle')) {
      return; // 如果点击的是resize handle，不触发拖拽
    }
    
    if ((e.target as HTMLElement).closest('.draggable-panel-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  // 调整大小开始
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
  };

  // 鼠标移动
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // 限制在窗口内
        const maxX = window.innerWidth - size.width;
        const maxY = window.innerHeight - size.height;
        
        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));
        
        setPosition({ x: constrainedX, y: constrainedY });
      } else if (isResizing) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        
        let newWidth = size.width + deltaX;
        let newHeight = size.height + deltaY;
        
        // 应用最小/最大限制
        if (minWidth) newWidth = Math.max(newWidth, minWidth);
        if (minHeight) newHeight = Math.max(newHeight, minHeight);
        if (maxWidth) newWidth = Math.min(newWidth, maxWidth);
        if (maxHeight) newHeight = Math.min(newHeight, maxHeight);
        
        setSize({ width: newWidth, height: newHeight });
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, size, minWidth, minHeight, maxWidth, maxHeight]);

  // 保存位置和大小（在位置或大小改变后）
  useEffect(() => {
    if (storageKey && (position.x !== defaultPosition.x || position.y !== defaultPosition.y || size.width !== 300 || size.height !== 400)) {
      saveToStorage(position, size);
    }
  }, [position, size, storageKey, defaultPosition]);

  return (
    <div
      ref={panelRef}
      className="draggable-panel"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="draggable-panel-header">
        {title && <div className="draggable-panel-title">{title}</div>}
        <div className="draggable-panel-drag-indicator">⋮⋮</div>
      </div>
      <div className="draggable-panel-content">
        {children}
      </div>
      <div 
        className="draggable-panel-resize-handle"
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
};

