import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  History,
  MoreHorizontal,
  X,
  Mic,
  MicOff,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Check,
  FileCode,
  Trash2,
  Copy,
  ArrowLeft,
} from 'lucide-react';
import { useAgentStore } from '../stores/agentStore';
import { useTabsStore } from '../stores/tabsStore';
import { useUiStore } from '../stores/uiStore';
import { useWorkspaceStore } from '../stores/workspaceStore';

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d`;
}

export const AgentPanel: React.FC = () => {
  const {
    sessions,
    currentSessionId,
    messages,
    isLoading,
    selectedModel,
    availableModels,
    sendMessage,
    newSession,
    loadSession,
    deleteSession,
    setSelectedModel,
    clearMessages,
  } = useAgentStore();

  const { tabs, activeTabId } = useTabsStore();
  const { toggleRightPanel } = useUiStore();
  const { rootName } = useWorkspaceStore();

  const [input, setInput] = useState('');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const displayName = rootName || 'CoreMind-Application';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Adjust textarea height dynamically
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
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
    await sendMessage(currentInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this environment.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
        setTimeout(adjustHeight, 50);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleAttachActiveFile = () => {
    if (activeTab) {
      setInput((prev) => `${prev} @${activeTab.fileName} `);
      textareaRef.current?.focus();
      setTimeout(adjustHeight, 50);
    }
  };

  const recentList = showAllRecent ? sessions : sessions.slice(0, 3);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#181818',
        borderLeft: '1px solid #282828',
        overflow: 'hidden',
        userSelect: 'none',
        position: 'relative',
        color: '#e5e7eb',
        fontFamily: 'var(--font-sans)',
      }}
      onClick={() => {
        if (showModelMenu) setShowModelMenu(false);
        if (showOptionsMenu) setShowOptionsMenu(false);
      }}
    >
      {/* Top Header */}
      <div
        style={{
          height: '38px',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          backgroundColor: '#181818',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {showHistoryView ? (
            <button
              onClick={() => setShowHistoryView(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 6px',
                borderRadius: '4px',
                color: '#9ca3af',
                fontSize: '12px',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          ) : (
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#cccccc',
                letterSpacing: '-0.1px',
              }}
            >
              Agent
            </span>
          )}
        </div>

        {/* Header Right Action Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', position: 'relative' }}>
          <button
            onClick={() => {
              newSession();
              setShowHistoryView(false);
            }}
            title="New Chat"
            style={{
              padding: '5px',
              borderRadius: '5px',
              color: '#9ca3af',
            }}
          >
            <Plus size={15} />
          </button>

          <button
            onClick={() => setShowHistoryView(!showHistoryView)}
            title="Chat History"
            style={{
              padding: '5px',
              borderRadius: '5px',
              color: showHistoryView ? '#ffffff' : '#9ca3af',
              backgroundColor: showHistoryView ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            }}
          >
            <History size={14} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowOptionsMenu(!showOptionsMenu);
              setShowModelMenu(false);
            }}
            title="More Options"
            style={{
              padding: '5px',
              borderRadius: '5px',
              color: showOptionsMenu ? '#ffffff' : '#9ca3af',
              backgroundColor: showOptionsMenu ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            }}
          >
            <MoreHorizontal size={15} />
          </button>

          <button
            onClick={toggleRightPanel}
            title="Close Panel"
            style={{
              padding: '5px',
              borderRadius: '5px',
              color: '#9ca3af',
            }}
          >
            <X size={15} />
          </button>

          {/* Options Dropdown Menu */}
          {showOptionsMenu && (
            <div
              style={{
                position: 'absolute',
                top: '32px',
                right: '28px',
                backgroundColor: '#202022',
                border: '1px solid #333336',
                borderRadius: '8px',
                padding: '4px',
                width: '170px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  clearMessages();
                  setShowOptionsMenu(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  borderRadius: '5px',
                  fontSize: '12px',
                  color: '#e5e7eb',
                  width: '100%',
                  justifyContent: 'flex-start',
                }}
              >
                <Trash2 size={13} color="#ef4444" />
                <span>Clear Current Chat</span>
              </button>
              {currentSessionId && (
                <button
                  onClick={() => {
                    deleteSession(currentSessionId);
                    setShowOptionsMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 10px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    color: '#ef4444',
                    width: '100%',
                    justifyContent: 'flex-start',
                  }}
                >
                  <Trash2 size={13} />
                  <span>Delete Session</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Body */}
      {showHistoryView ? (
        /* Full History View */
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#d1d5db',
              marginBottom: '4px',
            }}
          >
            Chat History ({sessions.length})
          </div>
          {sessions.length === 0 ? (
            <div style={{ color: '#71717a', fontSize: '12px', padding: '16px 0' }}>
              No previous conversations found.
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  loadSession(session.id);
                  setShowHistoryView(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor:
                    session.id === currentSessionId ? 'rgba(255,255,255,0.06)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    session.id === currentSessionId ? 'rgba(255,255,255,0.06)' : 'transparent';
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      color: session.id === currentSessionId ? '#ffffff' : '#d1d5db',
                      fontWeight: session.id === currentSessionId ? 500 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {session.title}
                  </span>
                  <span style={{ fontSize: '10px', color: '#71717a' }}>
                    {session.messages.length} messages • {formatRelativeTime(session.updatedAt)}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  title="Delete"
                  style={{
                    padding: '4px',
                    color: '#6b7280',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      ) : messages.length === 0 ? (
        /* Empty State (Matches User's Screenshot Exactly) */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '28px 16px 16px 16px',
            overflowY: 'auto',
          }}
        >
          {/* Workspace Title */}
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#e4e4e7',
              marginBottom: '14px',
              letterSpacing: '-0.2px',
            }}
          >
            {displayName}
          </div>

          {/* Central Modern Prompt Card */}
          <div
            style={{
              backgroundColor: '#1e1e1e',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px 14px 10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
              transition: 'border-color 0.15s ease',
            }}
          >
            <textarea
              ref={textareaRef}
              rows={2}
              placeholder="Ask anything, @ to mention, / for actions"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                resize: 'none',
                padding: '0',
                fontSize: '13px',
                lineHeight: '1.45',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                fontFamily: 'inherit',
                minHeight: '44px',
              }}
            />

            {/* Bottom Row Inside Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '2px',
                position: 'relative',
              }}
            >
              {/* Left: Plus & Model Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleAttachActiveFile}
                  title={activeTab ? `Attach @${activeTab.fileName}` : 'Attach Context'}
                  style={{
                    padding: '2px',
                    color: '#8e8e93',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#8e8e93')}
                >
                  <Plus size={15} />
                </button>

                {/* Model Pill Button */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowModelMenu(!showModelMenu);
                      setShowOptionsMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      backgroundColor: 'transparent',
                      color: '#d1d5db',
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span>{selectedModel}</span>
                    <ChevronDown size={11} color="#9ca3af" />
                  </button>

                  {/* Model Selection Menu */}
                  {showModelMenu && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '28px',
                        left: '0',
                        backgroundColor: '#202022',
                        border: '1px solid #333336',
                        borderRadius: '8px',
                        padding: '4px',
                        width: '210px',
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
                            color: m === selectedModel ? '#ffffff' : '#9ca3af',
                            backgroundColor:
                              m === selectedModel ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            width: '100%',
                            textAlign: 'left',
                          }}
                        >
                          <span>{m}</span>
                          {m === selectedModel && <Check size={12} color="#10B981" />}
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
                    color: isRecording ? '#ef4444' : '#8e8e93',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isRecording) e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    if (!isRecording) e.currentTarget.style.color = '#8e8e93';
                  }}
                >
                  {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  title="Send"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor:
                      input.trim() && !isLoading ? '#e4e4e7' : 'rgba(255, 255, 255, 0.06)',
                    color: input.trim() && !isLoading ? '#09090b' : '#52525b',
                    cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Recent Conversations List */}
          {sessions.length > 0 && (
            <div
              style={{
                marginTop: '36px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {recentList.map((session) => (
                <div
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    padding: '2px 0',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    const textEl = e.currentTarget.querySelector('.session-title') as HTMLElement;
                    if (textEl) textEl.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    const textEl = e.currentTarget.querySelector('.session-title') as HTMLElement;
                    if (textEl) textEl.style.color = '#d1d5db';
                  }}
                >
                  <span
                    className="session-title"
                    style={{
                      fontSize: '12.5px',
                      color: '#d1d5db',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      paddingRight: '12px',
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {session.title}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#71717a',
                      flexShrink: 0,
                    }}
                  >
                    {formatRelativeTime(session.updatedAt)}
                  </span>
                </div>
              ))}

              {sessions.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllRecent(!showAllRecent)}
                  style={{
                    fontSize: '11.5px',
                    color: '#71717a',
                    cursor: 'pointer',
                    marginTop: '6px',
                    alignSelf: 'flex-start',
                    padding: '0',
                    background: 'transparent',
                    border: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#a1a1aa')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#71717a')}
                >
                  {showAllRecent ? 'Show less' : 'See all'}
                </button>
              )}
            </div>
          )}

          {/* Bottom Disclaimer */}
          <div
            style={{
              marginTop: 'auto',
              paddingTop: '20px',
              paddingBottom: '8px',
              textAlign: 'center',
              fontSize: '10.5px',
              color: '#71717a',
              letterSpacing: '0.1px',
            }}
          >
            AI may make mistakes. Double-check all generated code.
          </div>
        </div>
      ) : (
        /* Conversation Mode (When messages exist) */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100% - 38px)',
            overflow: 'hidden',
          }}
        >
          {/* Active Context Banner */}
          {activeTab && (
            <div
              style={{
                padding: '4px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: '#9ca3af',
              }}
            >
              <FileCode size={12} color="#10B981" />
              <span>Context:</span>
              <span
                style={{
                  color: '#e5e7eb',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10.5px',
                }}
              >
                {activeTab.fileName}
              </span>
            </div>
          )}

          {/* Message Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              userSelect: 'text',
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'stretch',
                  maxWidth: msg.role === 'user' ? '88%' : '100%',
                }}
              >
                {/* Header label */}
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    color: msg.role === 'user' ? '#10B981' : '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{msg.role === 'user' ? 'You' : 'CoreMind'}</span>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      title="Copy Response"
                      style={{
                        padding: '2px 4px',
                        color: '#6b7280',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#d1d5db')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={11} color="#10B981" />
                          <span style={{ color: '#10B981' }}>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Content Bubble */}
                <div
                  style={{
                    backgroundColor: msg.role === 'user' ? '#27272a' : 'transparent',
                    padding: msg.role === 'user' ? '10px 12px' : '4px 0',
                    borderRadius: msg.role === 'user' ? '10px' : '0',
                    color: '#e5e7eb',
                    fontSize: '12.5px',
                    lineHeight: '1.55',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11.5px',
                  color: '#10B981',
                  padding: '8px 0',
                }}
              >
                <Sparkles size={13} />
                <span>CoreMind is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Prompt Card in Conversation Mode */}
          <div
            style={{
              padding: '12px 14px 10px 14px',
              backgroundColor: '#181818',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div
              style={{
                backgroundColor: '#1e1e1e',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '10px 12px 8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Ask anything, @ to mention, / for actions"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                style={{
                  width: '100%',
                  resize: 'none',
                  padding: '0',
                  fontSize: '12.5px',
                  lineHeight: '1.4',
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontFamily: 'inherit',
                  minHeight: '32px',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'relative',
                }}
              >
                {/* Left: Plus & Model Pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleAttachActiveFile}
                    title={activeTab ? `Attach @${activeTab.fileName}` : 'Attach Context'}
                    style={{
                      padding: '2px',
                      color: '#8e8e93',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#8e8e93')}
                  >
                    <Plus size={15} />
                  </button>

                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowModelMenu(!showModelMenu);
                        setShowOptionsMenu(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: 'transparent',
                        color: '#d1d5db',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      <span>{selectedModel}</span>
                      <ChevronDown size={11} color="#9ca3af" />
                    </button>

                    {showModelMenu && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '30px',
                          left: '0',
                          backgroundColor: '#202022',
                          border: '1px solid #333336',
                          borderRadius: '8px',
                          padding: '4px',
                          width: '210px',
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
                              color: m === selectedModel ? '#ffffff' : '#9ca3af',
                              backgroundColor:
                                m === selectedModel ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                              width: '100%',
                              textAlign: 'left',
                            }}
                          >
                            <span>{m}</span>
                            {m === selectedModel && <Check size={12} color="#10B981" />}
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
                      color: isRecording ? '#ef4444' : '#8e8e93',
                      borderRadius: '4px',
                    }}
                  >
                    {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    title="Send"
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor:
                        input.trim() && !isLoading ? '#e4e4e7' : 'rgba(255, 255, 255, 0.06)',
                      color: input.trim() && !isLoading ? '#09090b' : '#52525b',
                      cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                textAlign: 'center',
                fontSize: '10.5px',
                color: '#71717a',
                paddingTop: '8px',
                letterSpacing: '0.1px',
              }}
            >
              AI may make mistakes. Double-check all generated code.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

