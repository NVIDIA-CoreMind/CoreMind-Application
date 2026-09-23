import React, { useState, useCallback, useEffect } from 'react';

interface ResizableSplitterProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  className?: string;
}

export const ResizableSplitter: React.FC<ResizableSplitterProps> = ({
  direction,
  onResize,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (direction === 'horizontal') {
        onResize(e.movementX);
      } else {
        onResize(-e.movementY); // Negative because dragging up expands bottom panel
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        width: direction === 'horizontal' ? '4px' : '100%',
        height: direction === 'vertical' ? '4px' : '100%',
        cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize',
        backgroundColor: isDragging ? 'var(--accent)' : 'transparent',
        transition: 'background-color 0.15s ease',
        zIndex: 30,
        position: 'relative',
        flexShrink: 0,
      }}
    />
  );
};
