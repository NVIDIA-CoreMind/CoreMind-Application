import React, { useState, useEffect, useRef } from 'react';
import { FilePlus } from 'lucide-react';

interface CreateFileDialogProps {
  isOpen: boolean;
  title?: string;
  placeholder?: string;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (filename: string) => void;
}

export const CreateFileDialog: React.FC<CreateFileDialogProps> = ({
  isOpen,
  title = 'Create New File',
  placeholder = 'e.g. main.py, package.json',
  errorMessage,
  onClose,
  onSubmit,
}) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const validateName = (name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name cannot be empty.');
      return false;
    }
    if (trimmed.includes('..')) {
      setError('Path traversal (..) is not allowed.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (validateName(value)) {
        onSubmit(value.trim());
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '100px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '500px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {title}
          </span>
        </div>
        
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 14px',
          }}
        >
          <FilePlus size={16} color="var(--accent)" />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              fontSize: '13px',
              padding: 0,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        {(error || errorMessage) && (
          <div style={{ padding: '8px 14px', backgroundColor: 'rgba(239, 68, 68, 0.12)', borderTop: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <span style={{ fontSize: '11px', color: '#F87171' }}>{error || errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
