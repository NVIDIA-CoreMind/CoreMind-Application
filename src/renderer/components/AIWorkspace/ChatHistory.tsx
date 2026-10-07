import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Trash2, Edit3, Check, X, Clock, Search } from 'lucide-react';
import { useAIWorkspaceStore, ChatSession } from '../../services/aiWorkspaceService';
import { useThemeStore } from '../../stores/themeStore';

/** Format a relative time string like "2m", "1h", "3d" */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

/** Group sessions by time period */
function groupSessions(sessions: ChatSession[]): { label: string; sessions: ChatSession[] }[] {
  const now = Date.now();
  const today: ChatSession[] = [];
  const yesterday: ChatSession[] = [];
  const thisWeek: ChatSession[] = [];
  const thisMonth: ChatSession[] = [];
  const older: ChatSession[] = [];

  const dayMs = 86400000;
  const todayStart = new Date().setHours(0, 0, 0, 0);

  for (const session of sessions) {
    const diff = now - session.updatedAt;
    if (session.updatedAt >= todayStart) {
      today.push(session);
    } else if (session.updatedAt >= todayStart - dayMs) {
      yesterday.push(session);
    } else if (diff < 7 * dayMs) {
      thisWeek.push(session);
    } else if (diff < 30 * dayMs) {
      thisMonth.push(session);
    } else {
      older.push(session);
    }
  }

  const groups: { label: string; sessions: ChatSession[] }[] = [];
  if (today.length) groups.push({ label: 'Today', sessions: today });
  if (yesterday.length) groups.push({ label: 'Yesterday', sessions: yesterday });
  if (thisWeek.length) groups.push({ label: 'This Week', sessions: thisWeek });
  if (thisMonth.length) groups.push({ label: 'This Month', sessions: thisMonth });
  if (older.length) groups.push({ label: 'Older', sessions: older });

  return groups;
}

export const ChatHistory: React.FC = () => {
  const {
    sessions,
    activeSessionId,
    isHistoryOpen,
    setHistoryOpen,
    loadSession,
    deleteSession,
    renameSession,
    newSession,
  } = useAIWorkspaceStore();

  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus input when editing
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Close panel on click outside
  useEffect(() => {
    if (!isHistoryOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    };
    // Delay to avoid the toggle click itself closing the panel
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isHistoryOpen, setHistoryOpen]);

  // Filter sessions
  const filteredSessions = searchQuery.trim()
    ? sessions.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.chatHistory.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : sessions;

  // Sort by most recent first
  const sortedSessions = [...filteredSessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const groups = groupSessions(sortedSessions);

  const handleStartEdit = (session: ChatSession) => {
    setEditingId(session.id);
    setEditValue(session.title);
  };

  const handleConfirmEdit = () => {
    if (editingId && editValue.trim()) {
      renameSession(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleDelete = (sessionId: string) => {
    deleteSession(sessionId);
    setDeletingId(null);
  };

  if (!isHistoryOpen) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        top: '40px',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        backgroundColor: isDark ? 'rgba(24, 24, 24, 0.97)' : 'rgba(243, 243, 243, 0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInFromTop 0.2s ease-out',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      {/* Search bar */}
      <div style={{
        padding: '12px 14px',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
          borderRadius: '8px',
          padding: '6px 10px',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          transition: 'border-color 0.15s',
        }}>
          <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '12px',
              padding: 0,
              userSelect: 'text',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* New chat button */}
      <div style={{ padding: '8px 14px 4px 14px' }}>
        <button
          onClick={newSession}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
            color: 'var(--accent)',
            border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)'}`,
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s',
          }}
        >
          <MessageSquare size={13} />
          New Conversation
        </button>
      </div>

      {/* Sessions list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 0',
      }}>
        {groups.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)',
            gap: '8px',
          }}>
            <Clock size={32} strokeWidth={1.2} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>
              {searchQuery ? 'No matching conversations' : 'No conversation history'}
            </span>
            <span style={{ fontSize: '11px', textAlign: 'center', maxWidth: '200px' }}>
              {searchQuery
                ? 'Try a different search term'
                : 'Start a new conversation and it will appear here'
              }
            </span>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.label}>
            {/* Group header */}
            <div style={{
              padding: '8px 14px 4px 14px',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-muted)',
            }}>
              {group.label}
            </div>

            {/* Session items */}
            {group.sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isEditing = editingId === session.id;
              const isDeleting = deletingId === session.id;
              const messageCount = session.chatHistory.length;
              const lastMessage = session.chatHistory[session.chatHistory.length - 1];

              return (
                <div
                  key={session.id}
                  className="session-item"
                  style={{
                    margin: '0 8px',
                    borderRadius: '8px',
                    backgroundColor: isActive
                      ? (isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.06)')
                      : 'transparent',
                    border: isActive
                      ? `1px solid ${isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)'}`
                      : '1px solid transparent',
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}
                >
                  {isDeleting ? (
                    /* Delete confirmation */
                    <div style={{
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Delete this conversation?
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleDelete(session.id)}
                          style={{
                            flex: 1,
                            padding: '5px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#DC2626',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 500,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          style={{
                            flex: 1,
                            padding: '5px 8px',
                            borderRadius: '6px',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            color: 'var(--text-primary)',
                            fontSize: '11px',
                            fontWeight: 500,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        if (!isEditing) loadSession(session.id);
                      }}
                      style={{
                        padding: '10px 12px',
                        cursor: isEditing ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                      }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        backgroundColor: isActive
                          ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)')
                          : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <MessageSquare
                          size={13}
                          style={{
                            color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                          }}
                        />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              ref={editInputRef}
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleConfirmEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              style={{
                                flex: 1,
                                border: `1px solid var(--accent)`,
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '12px',
                                backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#fff',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                userSelect: 'text',
                              }}
                            />
                            <button
                              onClick={e => { e.stopPropagation(); handleConfirmEdit(); }}
                              style={{ ...iconBtnStyle, color: 'var(--accent)' }}
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleCancelEdit(); }}
                              style={{ ...iconBtnStyle, color: 'var(--text-muted)' }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{
                              fontSize: '12px',
                              fontWeight: isActive ? 500 : 400,
                              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginBottom: '2px',
                            }}>
                              {session.title}
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '10px',
                              color: 'var(--text-muted)',
                            }}>
                              <span>{messageCount} message{messageCount !== 1 ? 's' : ''}</span>
                              <span style={{ opacity: 0.4 }}>•</span>
                              <span>{formatRelativeTime(session.updatedAt)}</span>
                            </div>
                            {lastMessage && lastMessage.role === 'assistant' && (
                              <div style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                marginTop: '3px',
                                maxWidth: '100%',
                              }}>
                                {lastMessage.content.replace(/\*\*/g, '').slice(0, 60)}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Actions (visible on hover via CSS class) */}
                      {!isEditing && (
                        <div
                          className="session-item-actions"
                          style={{
                            display: 'flex',
                            gap: '2px',
                            opacity: 0,
                            transition: 'opacity 0.1s',
                          }}
                        >
                          <button
                            onClick={e => { e.stopPropagation(); handleStartEdit(session); }}
                            style={iconBtnStyle}
                            title="Rename"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeletingId(session.id); }}
                            style={{ ...iconBtnStyle, color: '#EF4444' }}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      {sessions.length > 0 && (
        <div style={{
          padding: '8px 14px',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          fontSize: '10px',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}>
          {sessions.length} conversation{sessions.length !== 1 ? 's' : ''} saved locally
        </div>
      )}
    </div>
  );
};

const iconBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'color 0.1s, background-color 0.1s',
};
