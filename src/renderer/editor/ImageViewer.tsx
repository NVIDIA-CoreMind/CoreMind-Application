import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { TabItem } from '@shared/types/tab';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useThemeStore, resolveEffectiveTheme } from '../stores/themeStore';

interface ImageViewerProps {
  tab: TabItem;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ tab }) => {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const theme = useThemeStore((s) => s.theme);
  const isDark = resolveEffectiveTheme(theme) === 'dark';

  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Compute breadcrumbs matching Image 1: folder > icon.png
  const getBreadcrumbs = () => {
    const root = rootPath ? rootPath.replace(/\\/g, '/').replace(/\/$/, '') : '';
    const full = tab.filePath.replace(/\\/g, '/');
    let rel = full;
    if (root && full.startsWith(root)) {
      rel = full.slice(root.length).replace(/^\//, '');
    }
    const parts = rel.split('/').filter(Boolean);
    if (parts.length <= 1) {
      return { dir: '', file: tab.fileName };
    }
    const file = parts.pop() || tab.fileName;
    const dir = parts.join(' > ');
    return { dir, file };
  };

  const { dir, file } = getBreadcrumbs();

  // Reset transforms when tab changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setHasError(false);
    setNaturalDimensions(null);
  }, [tab.id, tab.filePath]);

  // Fit image to current container view if larger than container
  const fitToView = useCallback(() => {
    if (!containerRef.current || !naturalDimensions) return;
    const containerW = containerRef.current.clientWidth - 40;
    const containerH = containerRef.current.clientHeight - 40;
    if (containerW <= 0 || containerH <= 0) return;

    const scaleW = containerW / naturalDimensions.width;
    const scaleH = containerH / naturalDimensions.height;
    const bestScale = Math.min(scaleW, scaleH, 1);

    setScale(Math.max(0.05, bestScale));
    setPosition({ x: 0, y: 0 });
  }, [naturalDimensions]);

  const handleImageLoad = () => {
    if (imgRef.current) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      setNaturalDimensions({ width: naturalWidth, height: naturalHeight });

      if (containerRef.current) {
        const cW = containerRef.current.clientWidth - 40;
        const cH = containerRef.current.clientHeight - 40;
        if (naturalWidth > cW || naturalHeight > cH) {
          const sW = cW / naturalWidth;
          const sH = cH / naturalHeight;
          setScale(Math.max(0.05, Math.min(sW, sH)));
        } else {
          setScale(1);
        }
      }
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setScale((prev) => Math.max(0.05, Math.min(prev * factor, 30)));
  };

  // Pan / Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (scale !== 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      fitToView();
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        setScale((prev) => Math.min(prev * 1.25, 30));
      } else if (e.key === '-') {
        setScale((prev) => Math.max(prev / 1.25, 0.05));
      } else if (e.key === '0') {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      } else if (e.key === 'f' || e.key === 'F') {
        fitToView();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fitToView]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-app)',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* VS Code Breadcrumb Header: assets > icon.png */}
      <div
        style={{
          height: '24px',
          minHeight: '24px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          gap: '6px',
          backgroundColor: 'var(--bg-app)',
          borderBottom: '1px solid var(--border-color)',
          zIndex: 5,
        }}
      >
        {dir && (
          <>
            <span style={{ color: 'var(--text-secondary)' }}>{dir}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>&gt;</span>
          </>
        )}
        <ImageIcon size={12} style={{ color: isDark ? '#c084fc' : '#9333ea', flexShrink: 0 }} />
        <span style={{ color: 'var(--text-primary)' }}>{file}</span>
      </div>

      {/* Main Interactive Image Canvas */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-app)',
          cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default',
        }}
      >
        {hasError ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: 'var(--text-muted)',
            }}
          >
            <ImageIcon size={32} color="var(--text-muted)" />
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Could not load image
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {tab.fileName}
            </div>
          </div>
        ) : (
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.08s ease-out',
              display: 'inline-block',
              lineHeight: 0,
              // Checkerboard pattern behind transparent image adapted to light / dark theme
              backgroundColor: isDark ? '#202020' : '#ffffff',
              backgroundImage: isDark
                ? `
                    linear-gradient(45deg, #262626 25%, transparent 25%),
                    linear-gradient(-45deg, #262626 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #262626 75%),
                    linear-gradient(-45deg, transparent 75%, #262626 75%)
                  `
                : `
                    linear-gradient(45deg, #ececec 25%, transparent 25%),
                    linear-gradient(-45deg, #ececec 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #ececec 75%),
                    linear-gradient(-45deg, transparent 75%, #ececec 75%)
                  `,
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              boxShadow: isDark ? '0 2px 12px rgba(0, 0, 0, 0.4)' : '0 2px 12px rgba(0, 0, 0, 0.08)',
            }}
          >
            <img
              ref={imgRef}
              src={tab.content}
              alt={tab.fileName}
              onLoad={handleImageLoad}
              onError={() => setHasError(true)}
              draggable={false}
              style={{
                display: 'block',
                maxWidth: 'none',
                maxHeight: 'none',
                pointerEvents: 'none',
                imageRendering: scale > 2 ? 'pixelated' : 'auto',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
