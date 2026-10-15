import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Square,
  Zap,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { DebugAltIcon } from './Codicons';
import { useTabsStore } from '../stores/tabsStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useTerminalStore } from '../stores/terminalStore';
import { useVirtualMobileStore } from '../stores/virtualMobileStore';
import { useUiStore } from '../stores/uiStore';
import { isWindowsClient } from '../../shared/utils/shortcuts';

interface RunDebugButtonProps {
  compact?: boolean;
}

export const RunDebugButton: React.FC<RunDebugButtonProps> = ({ compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const saveActiveTab = useTabsStore((s) => s.saveActiveTab);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const runCommand = useTerminalStore((s) => s.runCommand);

  // Virtual Mobile / Flutter state
  const isFlutterProject = useVirtualMobileStore((s) => s.isFlutterProject);
  const flutterState = useVirtualMobileStore((s) => s.flutterState);
  const devices = useVirtualMobileStore((s) => s.devices);
  const selectedSerial = useVirtualMobileStore((s) => s.selectedSerial);
  const flutterHotReload = useVirtualMobileStore((s) => s.flutterHotReload);
  const flutterHotRestart = useVirtualMobileStore((s) => s.flutterHotRestart);
  const flutterStop = useVirtualMobileStore((s) => s.flutterStop);
  const flutterPubGet = useVirtualMobileStore((s) => s.flutterPubGet);

  const isWindows = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isWindows : isWindowsClient();


  const activeTab = tabs.find((t) => t.id === activeTabId);
  const fileName = activeTab?.fileName || '';
  const filePath = activeTab?.filePath || '';
  const ext = fileName.split('.').pop()?.toLowerCase();

  // Context detection
  const isPython = activeTab?.language === 'python' || ext === 'py';
  const isDart = ext === 'dart';
  const isFlutter = isFlutterProject || isDart || fileName === 'pubspec.yaml';
  const isJsTs = ext === 'js' || ext === 'jsx' || ext === 'ts' || ext === 'tsx' || ext === 'mjs' || ext === 'cjs';
  const isShell = ext === 'sh' || ext === 'bash' || ext === 'zsh';

  const isFlutterRunning = flutterState.status === 'running' || flutterState.status === 'starting';

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      // F5 shortcut to run
      if (e.key === 'F5' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        handleRunPrimary();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handlePointerDown);
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, activeTab, isFlutter, isPython]);

  // Save active file before execution
  const ensureSaved = async () => {
    if (activeTab?.isDirty && rootPath) {
      await saveActiveTab(rootPath);
    }
  };

  // Helper to ensure Flutter binary in ~/flutter/bin is in PATH and Android platform files exist
  const getFlutterCommand = (subcommand: string) => {
    const isRunOnAndroid = subcommand.startsWith('run') && !subcommand.includes('-d chrome') && !subcommand.includes('-d macos');
    if (isWindows) {
      if (isRunOnAndroid) {
        return `if (-not (Test-Path android)) { flutter create --platforms=android . }; flutter ${subcommand}`;
      }
      return `flutter ${subcommand}`;
    }
    const pathExport = 'export PATH="$HOME/flutter/bin:$HOME/development/flutter/bin:$PATH"';
    if (isRunOnAndroid) {
      return `${pathExport} && if [ ! -d android ]; then flutter create --platforms=android .; fi && flutter ${subcommand}`;
    }
    return `${pathExport} && flutter ${subcommand}`;
  };


  // Primary action executed when clicking the Play+Bug button
  const handleRunPrimary = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setIsOpen(false);

    try {
      await ensureSaved();

      if (isFlutter) {
        // Run Flutter in Integrated Terminal
        const target = selectedSerial ? `-d "${selectedSerial}"` : '';
        await runCommand(getFlutterCommand(`run ${target}`.trim()));
      } else if (isPython && filePath) {

        // Run Python with virtual environment auto-detection
        if (isWindows) {
          const cmd = `if (Test-Path .venv\\Scripts\\python.exe) { .venv\\Scripts\\python.exe "${filePath}" } else { python "${filePath}" }`;
          await runCommand(cmd);
        } else {
          const cmd = `if [ -f .venv/bin/python ]; then .venv/bin/python "${filePath}"; elif [ -f venv/bin/python ]; then venv/bin/python "${filePath}"; else python3 "${filePath}"; fi`;
          await runCommand(cmd);
        }
      } else if (isJsTs && filePath) {
        if (ext === 'ts' || ext === 'tsx') {
          await runCommand(`npx tsx "${filePath}"`);
        } else {
          await runCommand(`node "${filePath}"`);
        }
      } else if (isShell && filePath) {
        await runCommand(`bash "${filePath}"`);
      } else if (isFlutterProject) {
        await runCommand('flutter run');
      } else if (filePath) {
        // Generic file runner fallback
        await runCommand(`echo "Executing ${fileName}..." && cat "${filePath}"`);
      } else {
        // If no file open, check if python or flutter workspace
        if (rootPath) {
          await runCommand('python3 main.py || python main.py || flutter run');
        }
      }
    } finally {
      setTimeout(() => setIsExecuting(false), 500);
    }
  };

  // Run with Python Debugger (pdb)
  const handleDebugPython = async () => {
    if (!filePath) return;
    setIsOpen(false);
    await ensureSaved();
    const cmd = isWindows
      ? `python -m pdb "${filePath}"`
      : `python3 -m pdb "${filePath}"`;
    await runCommand(cmd);
  };

  // Run Python in Interactive Mode
  const handleInteractivePython = async () => {
    if (!filePath) return;
    setIsOpen(false);
    await ensureSaved();
    const cmd = isWindows
      ? `python -i "${filePath}"`
      : `python3 -i "${filePath}"`;
    await runCommand(cmd);
  };

  // Run pytest / Unit tests
  const handlePytest = async () => {
    setIsOpen(false);
    await ensureSaved();
    const target = filePath ? `"${filePath}"` : '';
    const cmd = `pytest ${target}`.trim();
    await runCommand(cmd);
  };

  // Run Flutter on Chrome
  const handleFlutterChrome = async () => {
    setIsOpen(false);
    await ensureSaved();
    await runCommand(getFlutterCommand('run -d chrome'));
  };

  // Run Flutter on Connected Device / Emulator
  const handleFlutterDevice = async (serial: string) => {
    setIsOpen(false);
    await ensureSaved();
    await runCommand(getFlutterCommand(`run -d "${serial}"`));
  };

  // Flutter Hot Reload
  const handleFlutterHotReload = async () => {
    setIsOpen(false);
    const activeId = useTerminalStore.getState().activeId;
    if (activeId && window.coreMindAPI?.terminalWrite) {
      await window.coreMindAPI.terminalWrite(activeId, 'r');
    }
    await flutterHotReload();
  };

  // Flutter Hot Restart
  const handleFlutterHotRestart = async () => {
    setIsOpen(false);
    const activeId = useTerminalStore.getState().activeId;
    if (activeId && window.coreMindAPI?.terminalWrite) {
      await window.coreMindAPI.terminalWrite(activeId, 'R');
    }
    await flutterHotRestart();
  };

  // Flutter Stop
  const handleFlutterStop = async () => {
    setIsOpen(false);
    const activeId = useTerminalStore.getState().activeId;
    if (activeId && window.coreMindAPI?.terminalWrite) {
      await window.coreMindAPI.terminalWrite(activeId, 'q');
    }
    await flutterStop();
  };

  // Flutter Pub Get
  const handleFlutterPubGet = async () => {
    setIsOpen(false);
    await runCommand(getFlutterCommand('pub get'));
    await flutterPubGet();
  };

  // Flutter Clean & Rebuild
  const handleFlutterClean = async () => {
    setIsOpen(false);
    await runCommand(getFlutterCommand('clean && flutter pub get'));
  };

  // Flutter Test
  const handleFlutterTest = async () => {
    setIsOpen(false);
    await runCommand(getFlutterCommand('test'));
  };


  // Compute primary button tooltip
  const getPrimaryTooltip = () => {
    if (isFlutter) return 'Run Flutter Project (F5)';
    if (isPython) return `Run Python File: ${fileName || 'script'} (F5)`;
    if (isJsTs) return `Run ${fileName} with Node/tsx (F5)`;
    if (isShell) return `Run Bash Script: ${fileName} (F5)`;
    return 'Run or Debug (F5)';
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        userSelect: 'none',
      }}
    >
      {/* Flutter Live Runtime Controls (Shows when Flutter is actively running) */}
      {isFlutterRunning && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            marginRight: '6px',
            backgroundColor: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '4px',
            padding: '2px 4px',
          }}
        >
          {/* Status Indicator */}
          <span
            style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              margin: '0 4px',
              animation: 'pulse 1.8s infinite',
            }}
            title="Flutter is running"
          />

          {/* Hot Reload Button */}
          <button
            onClick={handleFlutterHotReload}
            title="Flutter Hot Reload (r)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '3px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#facc15',
              cursor: 'pointer',
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(250, 204, 21, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Zap size={13} fill="#facc15" />
          </button>

          {/* Hot Restart Button */}
          <button
            onClick={handleFlutterHotRestart}
            title="Flutter Hot Restart (R)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '3px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#38bdf8',
              cursor: 'pointer',
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <RotateCw size={12} />
          </button>

          {/* Stop Button */}
          <button
            onClick={handleFlutterStop}
            title="Stop Flutter Application (q)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '3px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#ef4444',
              cursor: 'pointer',
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Square size={11} fill="#ef4444" />
          </button>
        </div>
      )}

      {/* Main Split Run & Debug Button (Play+Bug icon + Chevron Dropdown) */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          backgroundColor: isOpen ? 'var(--bg-active)' : 'transparent',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          height: compact ? '24px' : '26px',
          overflow: 'hidden',
          transition: 'all 0.15s ease',
        }}
      >
        {/* Left Side: Play + Bug Run Action */}
        <button
          onClick={handleRunPrimary}
          disabled={isExecuting}
          title={getPrimaryTooltip()}
          aria-label={getPrimaryTooltip()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: compact ? '0 5px' : '0 7px',
            height: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            color: isExecuting ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: isExecuting ? 'default' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!isExecuting) {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isExecuting) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }
          }}
        >
          {isExecuting ? (
            <Loader2 size={compact ? 13 : 14} className="animate-spin" color="var(--accent)" />
          ) : (
            <DebugAltIcon size={compact ? 14 : 16} />
          )}
        </button>

        {/* Divider between icon and chevron */}
        <div
          style={{
            width: '1px',
            height: '14px',
            backgroundColor: 'var(--border-color)',
          }}
        />

        {/* Right Side: Dropdown Chevron */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          title="Run and Debug Options"
          aria-label="Run and Debug Options"
          aria-expanded={isOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: compact ? '0 4px' : '0 5px',
            height: '100%',
            backgroundColor: isOpen ? 'var(--bg-active)' : 'transparent',
            border: 'none',
            color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isOpen ? 'var(--bg-active)' : 'transparent';
            e.currentTarget.style.color = isOpen ? 'var(--text-primary)' : 'var(--text-secondary)';
          }}
        >
          <ChevronDown
            size={compact ? 11 : 12}
            strokeWidth={2.4}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        </button>
      </div>

      {/* Dropdown Menu Modal / Popover (Matches Screenshot: clean text-only, rounded corners, elegant dividers) */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: '290px',
            backgroundColor: 'var(--bg-menu, var(--bg-surface))',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.28), 0 2px 8px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            padding: '7px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
            color: 'var(--text-primary)',
            animation: 'fadeIn 0.12s ease-out',
            backdropFilter: 'blur(16px)',
          }}
        >
          {isFlutter ? (
            <>
              <MenuItem label="Run Flutter Application" onClick={handleRunPrimary} />
              <MenuItem
                label="Run Flutter in Dedicated Terminal"
                onClick={async () => {
                  setIsOpen(false);
                  const ui = useUiStore.getState();
                  if (!ui.isTerminalOpen) ui.toggleTerminal();
                  useTerminalStore.getState().addTab('flutter');
                  await runCommand(getFlutterCommand('run'));
                }}
              />
              <MenuItem label="Run Flutter on Chrome" onClick={handleFlutterChrome} />
              {devices.map((device) => (
                <MenuItem
                  key={device.serial}
                  label={`Run on ${device.name || device.avdName || device.serial}`}
                  onClick={() => handleFlutterDevice(device.serial)}
                />
              ))}

              <MenuDivider />

              <MenuItem
                label="Run as Task"
                onClick={async () => {
                  setIsOpen(false);
                  await handleRunPrimary();
                }}
              />

              <MenuDivider />

              <MenuItem label="Flutter Debugger: Start Debugging" onClick={handleRunPrimary} />
              <MenuItem label="Flutter: Hot Reload" onClick={handleFlutterHotReload} />
              <MenuItem label="Flutter: Hot Restart" onClick={handleFlutterHotRestart} />
              <MenuItem label="Flutter: Pub Get" onClick={handleFlutterPubGet} />
              <MenuItem label="Flutter: Clean & Rebuild" onClick={handleFlutterClean} />
              <MenuItem label="Flutter: Run Tests" onClick={handleFlutterTest} />
            </>
          ) : isPython ? (
            <>
              <MenuItem label="Run Python File" onClick={handleRunPrimary} />
              <MenuItem
                label="Run Python File in Dedicated Terminal"
                onClick={async () => {
                  setIsOpen(false);
                  const ui = useUiStore.getState();
                  if (!ui.isTerminalOpen) ui.toggleTerminal();
                  useTerminalStore.getState().addTab('python');
                  if (filePath) {
                    await runCommand(`python3 "${filePath}"`);
                  }
                }}
              />

              <MenuDivider />

              <MenuItem
                label="Run as Task"
                onClick={async () => {
                  setIsOpen(false);
                  await handleRunPrimary();
                }}
              />

              <MenuDivider />

              <MenuItem
                label="Python Debugger: Debug Python File"
                onClick={handleDebugPython}
              />
              <MenuItem
                label="Python Debugger: Debug using launch.json"
                onClick={handleDebugPython}
              />
              <MenuItem
                label="Python: Run in Interactive Mode"
                onClick={handleInteractivePython}
              />
              <MenuItem
                label="Python: Run Tests (pytest)"
                onClick={handlePytest}
              />
            </>
          ) : isJsTs ? (
            <>
              <MenuItem label={`Run ${fileName}`} onClick={handleRunPrimary} />
              <MenuItem
                label="Run in Dedicated Terminal"
                onClick={async () => {
                  setIsOpen(false);
                  const ui = useUiStore.getState();
                  if (!ui.isTerminalOpen) ui.toggleTerminal();
                  useTerminalStore.getState().addTab('node');
                  if (filePath) {
                    await runCommand(ext?.includes('ts') ? `npx tsx "${filePath}"` : `node "${filePath}"`);
                  }
                }}
              />

              <MenuDivider />

              <MenuItem
                label="Run as Task"
                onClick={async () => {
                  setIsOpen(false);
                  await handleRunPrimary();
                }}
              />

              <MenuDivider />

              <MenuItem
                label="Debugger: Debug with Node Inspector"
                onClick={async () => {
                  setIsOpen(false);
                  await ensureSaved();
                  await runCommand(`node --inspect "${filePath}"`);
                }}
              />
            </>
          ) : (
            <>
              <MenuItem label="Run Current File" onClick={handleRunPrimary} />
              <MenuItem
                label="Run in Dedicated Terminal"
                onClick={() => {
                  setIsOpen(false);
                  const ui = useUiStore.getState();
                  if (!ui.isTerminalOpen) ui.toggleTerminal();
                  useTerminalStore.getState().addTab();
                }}
              />

              <MenuDivider />

              <MenuItem
                label="Run as Task"
                onClick={async () => {
                  setIsOpen(false);
                  await handleRunPrimary();
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

const MenuItem: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '8px 14px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        color: 'var(--text-primary)',
        fontSize: '13.5px',
        fontWeight: 450,
        lineHeight: 1.35,
        transition: 'background-color 0.1s ease',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {label}
    </button>
  );
};

const MenuDivider: React.FC = () => (
  <div
    style={{
      height: '1px',
      backgroundColor: 'var(--border-color)',
      margin: '6px 8px',
    }}
  />
);


