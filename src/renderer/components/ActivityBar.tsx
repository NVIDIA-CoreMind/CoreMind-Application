import React from 'react';
import { Files, Search, GitBranch, Play, Boxes, Settings } from 'lucide-react';
import { useUiStore, SidebarTab } from '../stores/uiStore';
import { isMacClient, getShortcutDisplay } from '../../shared/utils/shortcuts';

export const ActivityBar: React.FC = () => {
  const { activeSidebarTab, isSidebarOpen, setActiveSidebarTab } = useUiStore();
  const isMac = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isMac : isMacClient();

  const topItems: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: 'explorer', label: 'Explorer', icon: <Files size={18} /> },
    { id: 'search', label: `Search (${getShortcutDisplay('search', isMac)})`, icon: <Search size={18} /> },
    { id: 'git', label: 'Source Control', icon: <GitBranch size={18} /> },
    { id: 'debug', label: 'Run & Debug', icon: <Play size={18} /> },
    { id: 'extensions', label: 'Extensions', icon: <Boxes size={18} /> },
  ];


  return (
    <div
      style={{
        width: 'var(--activitybar-width)',
        height: '100%',
        backgroundColor: 'var(--bg-app)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        zIndex: 40,
      }}
    >
      {/* Top Nav Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
        {topItems.map((item) => {
          const isActive = isSidebarOpen && activeSidebarTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSidebarTab(item.id)}
              title={item.label}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                backgroundColor: isActive ? 'var(--bg-hover)' : 'transparent',
                position: 'relative',
              }}
            >
              {item.icon}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '6px',
                    bottom: '6px',
                    width: '2px',
                    backgroundColor: 'var(--accent)',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Nav: Settings */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center' }}>
        <button
          onClick={() => setActiveSidebarTab('settings')}
          title="Settings"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            color: isSidebarOpen && activeSidebarTab === 'settings' ? 'var(--text-primary)' : 'var(--text-muted)',
            backgroundColor: isSidebarOpen && activeSidebarTab === 'settings' ? 'var(--bg-hover)' : 'transparent',
          }}
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
};
