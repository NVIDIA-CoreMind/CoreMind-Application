import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, ArrowRight, Plus, ChevronDown, Check } from 'lucide-react';
import { useUiStore } from '../stores/uiStore';
import { useAgentStore } from '../stores/agentStore';
import { useTabsStore } from '../stores/tabsStore';
import { isMacClient } from '../../shared/utils/shortcuts';

export const GlobalPrompt: React.FC = () => {
  const { isGlobalPromptOpen, setGlobalPromptOpen, isRightPanelOpen } = useUiStore();
  const { sendMessage, isLoading, selectedModel, availableModels, setSelectedModel } = useAgentStore();
  const { tabs, activeTabId } = useTabsStore();

  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const isMac = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isMac : isMacClient();

  useEffect(() => {
    if (isGlobalPromptOpen) {
      setInput('');
      setShowModelMenu(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isGlobalPromptOpen]);

  // Adjust textarea height dynamically
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 250)}px`;
    }
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const currentInput = input;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Close modal and ensure side panel is open
    setGlobalPromptOpen(false);
    if (!isRightPanelOpen) {
      useUiStore.getState().toggleRightPanel();
    }
    
    await sendMessage(currentInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setGlobalPromptOpen(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Voice input is not supported in this environment.');
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => setIsRecording(false);
        recognition.onerror = () => setIsRecording(false);

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
            adjustHeight();
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('Speech recognition error:', err);
        setIsRecording(false);
      }
    }
  };

  const handleAttachActiveFile = () => {
    if (activeTab) {
      setInput((prev) => `@${activeTab.fileName} ${prev}`);
      textareaRef.current?.focus();
    }
  };

  if (!isGlobalPromptOpen) return null;

  return (
    <div
      onClick={() => setGlobalPromptOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(3px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (showModelMenu) setShowModelMenu(false);
        }}
        style={{
          width: '640px',
          backgroundColor: 'var(--bg-app)',
          border: '1px solid var(--ov-15)',
          borderRadius: '12px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 18px 12px 18px',
          gap: '12px',
        }}
      >
        <textarea
          ref={textareaRef}
          rows={2}
          placeholder={`Ask anything, @ to mention, / for actions (${isMac ? '⌘I' : 'Ctrl+I'} to open)`}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            resize: 'none',
            padding: '4px',
            fontSize: '15px',
            lineHeight: '1.5',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            minHeight: '60px',
          }}
        />

        {/* Bottom Row Inside Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '8px',
            borderTop: '1px solid var(--ov-8)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleAttachActiveFile}
              title={activeTab ? `Attach @${activeTab.fileName}` : 'Attach Context'}
              style={{
                padding: '4px',
                color: 'var(--text-secondary)',
                borderRadius: '6px',
                background: 'transparent',
                border: '1px solid var(--ov-8)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              <Plus size={14} />
              <span>Attach Context</span>
            </button>

            {/* Model Pill Button */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowModelMenu(!showModelMenu);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  border: '1px solid var(--ov-12)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-body)',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                <span>{selectedModel.split('/').pop()}</span>
                <ChevronDown size={11} color="var(--text-secondary)" />
              </button>

              {/* Model Menu */}
              {showModelMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '32px',
                    left: '0',
                    backgroundColor: 'var(--bg-raised)',
                    border: '1px solid var(--bg-raised-hover)',
                    borderRadius: '8px',
                    padding: '4px',
                    width: '240px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {availableModels.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setSelectedModel(m);
                        setShowModelMenu(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: '5px',
                        fontSize: '11px',
                        color: m === selectedModel ? '#ffffff' : 'var(--text-secondary)',
                        backgroundColor:
                          m === selectedModel ? 'var(--ov-8)' : 'transparent',
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{m}</span>
                      {m === selectedModel && <Check size={12} color="#3B82F6" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Mic & Send Arrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={toggleRecording}
              title={isRecording ? 'Listening... click to stop' : 'Voice Input'}
              style={{
                padding: '4px',
                color: isRecording ? '#ef4444' : 'var(--text-secondary)',
                borderRadius: '4px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
            </button>

            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              title="Send"
              aria-label="Send prompt"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: input.trim() && !isLoading ? '#0078D4' : 'var(--ov-6)',
                color: input.trim() && !isLoading ? '#FFFFFF' : 'var(--text-faint)',
                cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                boxShadow: input.trim() && !isLoading ? '0 1px 4px rgba(0, 120, 212, 0.35)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <ArrowRight size={16} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
