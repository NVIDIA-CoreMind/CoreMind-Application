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
  ChevronUp,
  Sparkles,
  Check,
  FileCode,
  Trash2,
  Copy,
  ArrowLeft,
  Square,
  HelpCircle,
  ShieldAlert,
  GitPullRequest,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useAgentStore, AgentLifecycleStage } from '../stores/agentStore';
import { useTabsStore } from '../stores/tabsStore';
import { useUiStore } from '../stores/uiStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useBackendStore } from '../stores/backendStore';

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

const STAGES: { stage: AgentLifecycleStage; label: string }[] = [
  { stage: 'analyzing', label: 'Analyze' },
  { stage: 'planning', label: 'Plan' },
  { stage: 'executing', label: 'Execute' },
  { stage: 'observing', label: 'Observe' },
  { stage: 'verifying', label: 'Verify' },
  { stage: 'completed', label: 'Complete' },
];

export const AgentPanel: React.FC = () => {
  const {
    sessions,
    currentSessionId,
    messages,
    isLoading,
    selectedModel,
    availableModels,
    lifecycleStage,
    taskGraph,
    activityLogs,
    pendingQuestion,
    pendingApproval,
    activeChangeId,
    changeSet,
    steps,
    tokenUsage,
    initWsListeners,
    sendMessage,
    stopAgent,
    answerQuestion,
    approveAction,
    denyAction,
    setIsReviewingChanges,
    newSession,
    loadSession,
    deleteSession,
    setSelectedModel,
    clearMessages,
  } = useAgentStore();

  const { tabs, activeTabId } = useTabsStore();
  const { toggleRightPanel } = useUiStore();
  const { rootName } = useWorkspaceStore();
  const { isHealthy, wsStatus } = useBackendStore();

  const [input, setInput] = useState('');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [showTaskGraph, setShowTaskGraph] = useState(true);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Custom question answer input
  const [customAnswer, setCustomAnswer] = useState('');
  const [denyReason, setDenyReason] = useState('');
  const [showDenyInput, setShowDenyInput] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const displayName = rootName || 'CoreMind-Application';

  // Initialize real-time WebSocket listeners
  useEffect(() => {
    initWsListeners();
  }, [initWsListeners]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, lifecycleStage]);

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

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAttachActiveFile = () => {
    if (activeTab) {
      setInput((prev) => `@${activeTab.fileName} ${prev}`);
      textareaRef.current?.focus();
    }
  };

  const isConnected = isHealthy && wsStatus === 'connected';
  const recentList = showAllRecent ? sessions : sessions.slice(0, 3);
  const taskNodes = taskGraph?.tasks || taskGraph?.nodes || [];

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
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#cccccc',
                  letterSpacing: '-0.1px',
                }}
              >
                CoreMind AI
              </span>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isConnected ? '#10B981' : '#EF4444',
                }}
                title={isConnected ? 'Connected to AI Backend' : 'Backend Disconnected'}
              />
            </div>
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
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
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
              border: 'none',
              cursor: 'pointer',
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
              border: 'none',
              cursor: 'pointer',
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
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
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
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
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
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
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
        /* History View */
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>
            Recent Sessions
          </div>
          {sessions.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#71717a', fontSize: '12px' }}>
              No previous chats recorded yet.
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
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor:
                    session.id === currentSessionId ? 'rgba(255, 255, 255, 0.08)' : '#1e1e20',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#e5e7eb',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {session.title}
                  </div>
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
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
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
        /* Empty Welcome State */
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleAttachActiveFile}
                  title={activeTab ? `Attach @${activeTab.fileName}` : 'Attach Context'}
                  style={{
                    padding: '2px',
                    color: '#8e8e93',
                    borderRadius: '4px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
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
                    }}
                  >
                    <span>{selectedModel.split('/').pop()}</span>
                    <ChevronDown size={11} color="#9ca3af" />
                  </button>

                  {/* Model Menu */}
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
                            color: m === selectedModel ? '#ffffff' : '#9ca3af',
                            backgroundColor:
                              m === selectedModel ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            width: '100%',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{m}</span>
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
                    border: 'none',
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
                  }}
                >
                  <span
                    style={{
                      fontSize: '12.5px',
                      color: '#d1d5db',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      paddingRight: '12px',
                    }}
                  >
                    {session.title}
                  </span>
                  <span style={{ fontSize: '11px', color: '#71717a', flexShrink: 0 }}>
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
            }}
          >
            CoreMind AI powered by Nebius / NVIDIA Nemotron.
          </div>
        </div>
      ) : (
        /* Conversation Mode */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100% - 38px)',
            overflow: 'hidden',
          }}
        >
          {/* Real Agent Lifecycle Stages Bar */}
          {lifecycleStage !== 'idle' && (
            <div
              style={{
                padding: '6px 12px',
                backgroundColor: '#1b1b1e',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
                {STAGES.map((s, idx) => {
                  const isActive = lifecycleStage === s.stage;
                  const isPast =
                    STAGES.findIndex((st) => st.stage === lifecycleStage) > idx ||
                    lifecycleStage === 'completed';

                  return (
                    <React.Fragment key={s.stage}>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: isActive ? 600 : 400,
                          backgroundColor: isActive
                            ? 'rgba(16, 185, 129, 0.2)'
                            : isPast
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'transparent',
                          color: isActive ? '#10B981' : isPast ? '#9ca3af' : '#52525b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        {isActive && <Loader2 size={9} className="animate-spin" />}
                        {isPast && <Check size={9} color="#10B981" />}
                        <span>{s.label}</span>
                      </span>
                      {idx < STAGES.length - 1 && (
                        <span style={{ fontSize: '9px', color: '#3f3f46' }}>›</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {steps && (
                <span style={{ fontSize: '9.5px', color: '#9ca3af' }}>
                  step {steps.current}/{steps.max}
                </span>
              )}
            </div>
          )}

          {/* Task Graph Plan (Collapsible) */}
          {taskNodes.length > 0 && (
            <div
              style={{
                backgroundColor: '#1a1a1d',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '6px 12px',
                flexShrink: 0,
              }}
            >
              <div
                onClick={() => setShowTaskGraph(!showTaskGraph)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#d1d5db',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={13} color="#10B981" />
                  <span>
                    Task Plan ({taskNodes.filter((t) => t.status === 'completed').length}/{taskNodes.length} done)
                  </span>
                </div>
                {showTaskGraph ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </div>

              {showTaskGraph && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  {taskNodes.map((task) => {
                    const isDone = task.status === 'completed';
                    const isRunning = task.status === 'in_progress';
                    const isFailed = task.status === 'failed';

                    return (
                      <div
                        key={task.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '6px',
                          fontSize: '11px',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          backgroundColor: isRunning ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                        }}
                      >
                        <div style={{ marginTop: '2px' }}>
                          {isDone ? (
                            <Check size={12} color="#10B981" />
                          ) : isRunning ? (
                            <Loader2 size={12} color="#10B981" className="animate-spin" />
                          ) : isFailed ? (
                            <AlertTriangle size={12} color="#EF4444" />
                          ) : (
                            <Clock size={12} color="#6b7280" />
                          )}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div
                            style={{
                              color: isDone ? '#9ca3af' : isRunning ? '#ffffff' : '#d1d5db',
                              textDecoration: isDone ? 'line-through' : 'none',
                              fontWeight: isRunning ? 500 : 400,
                            }}
                          >
                            {task.title}
                          </div>
                          {task.description && !isDone && (
                            <div style={{ fontSize: '10px', color: '#71717a' }}>
                              {task.description}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Activity Logs (Collapsible) */}
          {activityLogs.length > 0 && (
            <div
              style={{
                backgroundColor: '#161618',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '4px 12px',
                flexShrink: 0,
              }}
            >
              <div
                onClick={() => setShowActivityLog(!showActivityLog)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '10.5px',
                  color: '#9ca3af',
                }}
              >
                <span>Activity & Tool Executions ({activityLogs.length})</span>
                {showActivityLog ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </div>

              {showActivityLog && (
                <div
                  style={{
                    maxHeight: '120px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    marginTop: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                  }}
                >
                  {activityLogs.map((log) => (
                    <div key={log.id} style={{ color: '#9ca3af', display: 'flex', gap: '4px' }}>
                      <span style={{ color: '#52525b' }}>›</span>
                      <span>{log.summary}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Human-in-the-Loop Clarification Card */}
          {pendingQuestion && (
            <div
              style={{
                margin: '10px 14px',
                padding: '12px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60A5FA', fontSize: '12px', fontWeight: 600 }}>
                <HelpCircle size={15} />
                <span>CoreMind needs your clarification:</span>
              </div>
              <div style={{ fontSize: '12.5px', color: '#f3f4f6' }}>
                {pendingQuestion.question}
              </div>

              {/* Options buttons if available */}
              {pendingQuestion.options && pendingQuestion.options.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {pendingQuestion.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => answerQuestion(opt)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#2563EB',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Custom input */}
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <input
                  type="text"
                  placeholder="Or type custom answer..."
                  value={customAnswer}
                  onChange={(e) => setCustomAnswer(e.target.value)}
                  style={{
                    flex: 1,
                    fontSize: '11.5px',
                    height: '26px',
                    padding: '2px 8px',
                  }}
                />
                <button
                  onClick={() => {
                    if (customAnswer.trim()) {
                      answerQuestion(customAnswer.trim());
                      setCustomAnswer('');
                    }
                  }}
                  disabled={!customAnswer.trim()}
                  style={{
                    padding: '2px 10px',
                    backgroundColor: 'rgba(59, 130, 246, 0.3)',
                    color: '#ffffff',
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: customAnswer.trim() ? 'pointer' : 'default',
                  }}
                >
                  Answer
                </button>
              </div>
            </div>
          )}

          {/* Security Approval Card */}
          {pendingApproval && (
            <div
              style={{
                margin: '10px 14px',
                padding: '12px',
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FACC15', fontSize: '12px', fontWeight: 600 }}>
                <ShieldAlert size={15} />
                <span>Security Approval Requested</span>
              </div>
              <div style={{ fontSize: '12px', color: '#f3f4f6' }}>
                {pendingApproval.description}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: '#9ca3af',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  padding: '6px 8px',
                  borderRadius: '4px',
                }}
              >
                Tool: {pendingApproval.tool} {JSON.stringify(pendingApproval.args)}
              </div>

              {showDenyInput && (
                <input
                  type="text"
                  placeholder="Optional reason for denying..."
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                  style={{ fontSize: '11.5px', height: '24px' }}
                />
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={approveAction}
                  style={{
                    padding: '5px 12px',
                    backgroundColor: '#10B981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Approve Action
                </button>

                <button
                  onClick={() => {
                    if (!showDenyInput) {
                      setShowDenyInput(true);
                    } else {
                      denyAction(denyReason || undefined);
                      setShowDenyInput(false);
                      setDenyReason('');
                    }
                  }}
                  style={{
                    padding: '5px 12px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#EF4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '5px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Deny Action
                </button>
              </div>
            </div>
          )}

          {/* Change Review Notice Banner */}
          {activeChangeId && (
            <div
              style={{
                margin: '10px 14px',
                padding: '10px 12px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitPullRequest size={15} color="#10B981" />
                <span style={{ fontSize: '12px', color: '#f3f4f6', fontWeight: 500 }}>
                  Proposed changes ready for review
                </span>
                {changeSet?.files && (
                  <span style={{ fontSize: '10.5px', color: '#10B981' }}>
                    ({changeSet.files.length} files)
                  </span>
                )}
              </div>

              <button
                onClick={() => setIsReviewingChanges(true)}
                style={{
                  padding: '4px 10px',
                  backgroundColor: '#10B981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Review Diffs
              </button>
            </div>
          )}

          {/* Active File Context Pill */}
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
                flexShrink: 0,
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
                  <span>{msg.role === 'user' ? 'You' : 'CoreMind AI'}</span>
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
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
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
                <Sparkles size={13} className="animate-spin" />
                <span>
                  {lifecycleStage === 'analyzing'
                    ? 'Analyzing project context...'
                    : lifecycleStage === 'planning'
                    ? 'Creating execution plan...'
                    : lifecycleStage === 'executing'
                    ? 'Executing code modifications...'
                    : lifecycleStage === 'verifying'
                    ? 'Verifying unit tests & compilation...'
                    : lifecycleStage === 'fixing'
                    ? 'Self-healing & fixing errors...'
                    : 'CoreMind is thinking...'}
                </span>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleAttachActiveFile}
                    title={activeTab ? `Attach @${activeTab.fileName}` : 'Attach Context'}
                    style={{
                      padding: '2px',
                      color: '#8e8e93',
                      borderRadius: '4px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={15} />
                  </button>

                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {selectedModel.split('/').pop()}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isLoading ? (
                    <button
                      type="button"
                      onClick={stopAgent}
                      title="Stop Agent Execution"
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#EF4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Square size={10} fill="#EF4444" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={toggleRecording}
                        title={isRecording ? 'Listening... click to stop' : 'Voice Input'}
                        style={{
                          padding: '4px',
                          color: isRecording ? '#ef4444' : '#8e8e93',
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
                        disabled={!input.trim()}
                        title="Send"
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: input.trim() ? '#e4e4e7' : 'rgba(255, 255, 255, 0.06)',
                          color: input.trim() ? '#09090b' : '#52525b',
                          cursor: input.trim() ? 'pointer' : 'default',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                        }}
                      >
                        <ArrowRight size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {tokenUsage && (
              <div
                style={{
                  fontSize: '10px',
                  color: '#71717a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '6px',
                  paddingLeft: '4px',
                  paddingRight: '4px',
                }}
              >
                <span>Tokens: {tokenUsage.total_tokens.toLocaleString()}</span>
                <span>(Prompt: {tokenUsage.prompt_tokens} | Output: {tokenUsage.completion_tokens})</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
