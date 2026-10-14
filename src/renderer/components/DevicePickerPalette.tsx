import React, { useState, useEffect, useRef } from 'react';
import { useUiStore } from '../stores/uiStore';
import { useVirtualMobileStore } from '../stores/virtualMobileStore';

type TargetCategory = 'root' | 'mobile' | 'web';

interface QuickPickItem {
  id: string;
  label: string;
  description?: string;
  detail?: string;
  isSeparator?: boolean;
  action?: () => Promise<void> | void;
}

export const DevicePickerPalette: React.FC = () => {
  const { isDevicePickerOpen, setDevicePickerOpen } = useUiStore();
  const {
    avds,
    devices,
    emulatorState,
    startEmulator,
    openAndroidStudio,
    refresh,
  } = useVirtualMobileStore();

  const [category, setCategory] = useState<TargetCategory>('root');
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize and focus on open
  useEffect(() => {
    if (isDevicePickerOpen) {
      setCategory('root');
      setQuery('');
      setSelectedIndex(0);
      void refresh();
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isDevicePickerOpen, refresh]);

  // Determine active running serial for an AVD
  const getRunningDevice = (avdName: string) => {
    return devices.find(
      (d) =>
        d.avdName === avdName ||
        (emulatorState.avdName === avdName && emulatorState.serial === d.serial)
    );
  };

  // Build items based on current category and search query
  const getItems = (): QuickPickItem[] => {
    const q = query.toLowerCase().trim();

    // If user is searching and query doesn't match root categories, search across all emulators & web
    if (q.length > 0 && category === 'root') {
      const results: QuickPickItem[] = [];

      // Web matches
      if ('web app (chrome)'.includes(q) || 'web'.includes(q) || 'chrome'.includes(q)) {
        results.push({
          id: 'web-chrome',
          label: 'Web App (Chrome)',
          description: 'Launch application in Chrome',
          action: () => {
            if (typeof window !== 'undefined') window.open('http://localhost:3000', '_blank');
            setDevicePickerOpen(false);
          },
        });
      }
      if ('web app (edge)'.includes(q) || 'edge'.includes(q)) {
        results.push({
          id: 'web-edge',
          label: 'Web App (Edge)',
          description: 'Launch application in Edge',
          action: () => {
            if (typeof window !== 'undefined') window.open('http://localhost:3000', '_blank');
            setDevicePickerOpen(false);
          },
        });
      }

      // Android AVD matches
      const matchingAvds = avds.filter((avd) => avd.name.toLowerCase().includes(q));
      if (matchingAvds.length > 0) {
        if (results.length > 0) {
          results.push({ id: 'sep-search-1', label: '', isSeparator: true });
        }
        for (const avd of matchingAvds) {
          const running = getRunningDevice(avd.name);
          results.push({
            id: `avd-${avd.name}`,
            label: avd.name.replace(/_/g, ' '),
            description: running
              ? `Running (${running.serial})`
              : avd.apiLevel
              ? `Android ${avd.apiLevel} • ${avd.abi || 'arm64'}`
              : 'Android Emulator',
            action: async () => {
              if (!running) {
                await startEmulator(avd.name);
              }
              setDevicePickerOpen(false);
            },
          });
        }
      }

      // Android Studio Device Manager action
      if ('android studio'.includes(q) || 'device manager'.includes(q) || 'create emulator'.includes(q)) {
        if (results.length > 0) {
          results.push({ id: 'sep-search-2', label: '', isSeparator: true });
        }
        results.push({
          id: 'open-device-manager',
          label: 'Open Android Studio Device Manager...',
          action: async () => {
            await openAndroidStudio();
            setDevicePickerOpen(false);
          },
        });
      }

      return results;
    }

    if (category === 'root') {
      const items: QuickPickItem[] = [
        {
          id: 'cat-web',
          label: 'Web App (Chrome)',
          action: () => {
            if (typeof window !== 'undefined') window.open('http://localhost:3000', '_blank');
            setDevicePickerOpen(false);
          },
        },
        {
          id: 'cat-web-edge',
          label: 'Web App (Edge)',
          action: () => {
            if (typeof window !== 'undefined') window.open('http://localhost:3000', '_blank');
            setDevicePickerOpen(false);
          },
        },
        {
          id: 'cat-web-more',
          label: 'Web Options...',
          description: 'Default browser, Chrome, Edge',
          action: () => {
            setCategory('web');
            setQuery('');
            setSelectedIndex(0);
          },
        },
        {
          id: 'sep-1',
          label: '',
          isSeparator: true,
        },
        {
          id: 'cat-mobile',
          label: 'Mobile (Android Studio Emulators)',
          description:
            avds.length > 0
              ? `${avds.length} downloaded (${avds.map((a) => a.name).join(', ')})`
              : 'View downloaded emulators & Device Manager',
          action: () => {
            setCategory('mobile');
            setQuery('');
            setSelectedIndex(0);
          },
        },
        {
          id: 'sep-2',
          label: '',
          isSeparator: true,
        },
        {
          id: 'action-device-mgr',
          label: 'Open Android Studio Device Manager...',
          action: async () => {
            await openAndroidStudio();
            setDevicePickerOpen(false);
          },
        },
      ];

      return items;
    }

    if (category === 'mobile') {
      const items: QuickPickItem[] = [
        {
          id: 'mobile-back',
          label: '← Back to targets',
          action: () => {
            setCategory('root');
            setQuery('');
            setSelectedIndex(0);
          },
        },
        {
          id: 'sep-mobile-back',
          label: '',
          isSeparator: true,
        },
      ];

      if (avds.length === 0) {
        items.push({
          id: 'no-avds',
          label: 'No Android Studio emulators found',
          description: 'Open Device Manager in Android Studio to create one',
        });
      } else {
        for (const avd of avds) {
          if (q && !avd.name.toLowerCase().includes(q)) continue;
          const running = getRunningDevice(avd.name);
          const isThisBooting =
            emulatorState.avdName === avd.name && emulatorState.status === 'starting';

          items.push({
            id: `avd-${avd.name}`,
            label: avd.name.replace(/_/g, ' '),
            description: running
              ? `Running (${running.serial})`
              : isThisBooting
              ? 'Starting emulator...'
              : avd.apiLevel
              ? `Android ${avd.apiLevel} • ${avd.abi || 'arm64'}`
              : 'Android Emulator',
            action: async () => {
              if (!running) {
                await startEmulator(avd.name);
              }
              setDevicePickerOpen(false);
            },
          });
        }
      }

      items.push(
        {
          id: 'sep-mobile-actions',
          label: '',
          isSeparator: true,
        },
        {
          id: 'mobile-open-studio',
          label: 'Open Android Studio Device Manager...',
          action: async () => {
            await openAndroidStudio();
            setDevicePickerOpen(false);
          },
        },
        {
          id: 'mobile-refresh',
          label: 'Refresh Emulators...',
          action: async () => {
            await refresh();
          },
        }
      );

      return items;
    }

    if (category === 'web') {
      return [
        {
          id: 'web-back',
          label: '← Back to targets',
          action: () => {
            setCategory('root');
            setQuery('');
            setSelectedIndex(0);
          },
        },
        {
          id: 'sep-web-back',
          label: '',
          isSeparator: true,
        },
        {
          id: 'web-chrome-item',
          label: 'Web App (Chrome)',
          description: 'Launch in Google Chrome',
          action: () => {
            if (typeof window !== 'undefined') window.open('http://localhost:3000', '_blank');
            setDevicePickerOpen(false);
          },
        },
        {
          id: 'web-edge-item',
          label: 'Web App (Edge)',
          description: 'Launch in Microsoft Edge',
          action: () => {
            if (typeof window !== 'undefined') window.open('http://localhost:3000', '_blank');
            setDevicePickerOpen(false);
          },
        },
        {
          id: 'web-default-item',
          label: 'Default Web Browser',
          description: 'Launch in system default browser',
          action: () => {
            if (typeof window !== 'undefined') window.open('http://localhost:3000', '_blank');
            setDevicePickerOpen(false);
          },
        },
      ];
    }

    return [];
  };

  const allItems = getItems();
  // Filter out separators for keyboard navigation selection
  const selectableItems = allItems.filter((it) => !it.isSeparator);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (selectableItems.length > 0 ? (prev + 1) % selectableItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (selectableItems.length > 0 ? (prev - 1 + selectableItems.length) % selectableItems.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = selectableItems[selectedIndex];
      if (item?.action) {
        item.action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (category !== 'root') {
        setCategory('root');
        setQuery('');
        setSelectedIndex(0);
      } else {
        setDevicePickerOpen(false);
      }
    } else if (e.key === 'Backspace' && query === '' && category !== 'root') {
      setCategory('root');
      setSelectedIndex(0);
    }
  };

  if (!isDevicePickerOpen) return null;

  let selectableCounter = -1;

  return (
    <div
      onClick={() => setDevicePickerOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        zIndex: 2500,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '620px',
          maxWidth: '92vw',
          backgroundColor: '#1e1e1e',
          border: '1px solid #3c3c3c',
          borderRadius: '6px',
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.55), 0 0 1px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          padding: '6px',
          color: '#cccccc',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          userSelect: 'none',
        }}
      >
        {/* VS Code QuickPick Input Box with Blue Focus Outline */}
        <div style={{ padding: '2px 2px 4px 2px' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder={
              category === 'root'
                ? 'Select target (web, mobile)...'
                : category === 'mobile'
                ? 'Select Android emulator to launch...'
                : 'Select web target...'
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: '#313131',
              border: '1px solid #007acc',
              borderRadius: '2px',
              color: '#ffffff',
              fontSize: '13px',
              height: '30px',
              padding: '4px 8px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Dropdown Items List */}
        <div
          style={{
            maxHeight: '340px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            marginTop: '2px',
          }}
        >
          {allItems.length === 0 ? (
            <div
              style={{
                padding: '8px 10px',
                fontSize: '13px',
                color: '#858585',
              }}
            >
              No matching targets or emulators found
            </div>
          ) : (
            allItems.map((item) => {
              if (item.isSeparator) {
                return (
                  <div
                    key={item.id}
                    style={{
                      height: '1px',
                      backgroundColor: '#333333',
                      margin: '4px 6px',
                    }}
                  />
                );
              }

              selectableCounter++;
              const isSelected = selectableCounter === selectedIndex;
              const currentIndex = selectableCounter;

              return (
                <div
                  key={item.id}
                  onClick={() => item.action && item.action()}
                  onMouseEnter={() => setSelectedIndex(currentIndex)}
                  style={{
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 10px',
                    fontSize: '13px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#04395e' : 'transparent',
                    color: isSelected ? '#ffffff' : '#cccccc',
                    transition: 'none',
                  }}
                >
                  <span
                    style={{
                      fontWeight: isSelected ? 500 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label}
                  </span>
                  {item.description && (
                    <span
                      style={{
                        fontSize: '12px',
                        color: isSelected ? 'rgba(255, 255, 255, 0.8)' : '#858585',
                        marginLeft: '12px',
                        flexShrink: 0,
                      }}
                    >
                      {item.description}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
