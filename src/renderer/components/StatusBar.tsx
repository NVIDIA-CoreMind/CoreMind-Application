import React, { useEffect, useState } from 'react';
import { GitBranch } from 'lucide-react';
import { useTabsStore } from '../stores/tabsStore';
import { useEditorStore } from '../stores/editorStore';
import { useWorkspaceStore } from '../stores/workspaceStore';

export const StatusBar: React.FC = () => {
  const { tabs, activeTabId } = useTabsStore();
  const { cursorPosition } = useEditorStore();
  const { rootPath } = useWorkspaceStore();
  const [gitBranch, setGitBranch] = useState<string | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    let mounted = true;
    async function checkGit() {
      if (!rootPath) {
        setGitBranch(null);
        return;
      }
      try {
        const res = await window.coreMindAPI.getGitStatus(rootPath);
        if (mounted && res.success && res.data.isRepo) {
          setGitBranch(res.data.branch);
        } else if (mounted) {
          setGitBranch(null);
        }
      } catch {
        if (mounted) setGitBranch(null);
      }
    }
    checkGit();
    return () => {
      mounted = false;
    };
  }, [rootPath]);

  return (
    <div
      style={{
        height: 'var(--statusbar-height)',
        backgroundColor: 'var(--bg-app)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        zIndex: 50,
      }}
    >
      {/* Left: Status & Git */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--success)',
            }}
          />
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Ready</span>
        </div>

        {gitBranch && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <GitBranch size={12} color="var(--accent)" />
            <span>{gitBranch}</span>
          </div>
        )}
      </div>

      {/* Right: Language, Line/Col, Encoding, Platform */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {activeTab && (
          <>
            <span>
              Ln {cursorPosition.line}, Col {cursorPosition.column}
            </span>
            <span style={{ textTransform: 'capitalize' }}>{activeTab.language}</span>
          </>
        )}
        <span>UTF-8</span>
        <span>Spaces: 2</span>
        <span style={{ color: 'var(--text-muted)' }}>macOS</span>
        <span
          style={{
            padding: '1px 6px',
            borderRadius: '3px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--accent-hover)',
          }}
        >
          Apple Silicon
        </span>
      </div>
    </div>
  );
};
