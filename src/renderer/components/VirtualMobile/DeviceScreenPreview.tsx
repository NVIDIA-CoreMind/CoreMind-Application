import React, { useState, useRef } from 'react';
import {
  Smartphone,
  Play,
  Square,
  Circle,
  Triangle,
  Camera,
  Wifi,
  Battery,
  AlertTriangle,
  RotateCw,
  Eye,
  EyeOff,
  Send,
  Info,
} from 'lucide-react';
import { useVirtualMobileStore } from '../../stores/virtualMobileStore';

export const DeviceScreenPreview: React.FC = () => {
  const {
    devices,
    avds,
    selectedSerial,
    selectedAvd,
    emulatorState,
    currentScreenshot,
    isCapturingScreenshot,
    isAutoRefreshScreenshot,
    orientation,
    startEmulator,
    takeScreenshot,
    toggleAutoRefreshScreenshot,
    toggleOrientation,
    sendTouch,
    sendSwipe,
    sendKey,
    sendText,
  } = useVirtualMobileStore();

  const [inputText, setInputText] = useState('');
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const screenContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const selectedDevice = devices.find((d) => d.serial === selectedSerial);
  const selectedAvdDef = avds.find((a) => a.name === selectedAvd);

  const isOnline = selectedDevice?.isOnline ?? false;
  const isStarting = emulatorState.status === 'starting';
  const hasError = emulatorState.status === 'error';
  const isLandscape = orientation === 'landscape';

  // Handle touch tap & swipe on the screen
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!screenContainerRef.current || !isOnline) return;
    const rect = screenContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragStartRef.current = { x, y, time: Date.now() };

    // Trigger visual ripple
    setRipple({ x, y });
    setTimeout(() => setRipple(null), 400);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!screenContainerRef.current || !dragStartRef.current || !isOnline) return;
    const rect = screenContainerRef.current.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    const startX = dragStartRef.current.x;
    const startY = dragStartRef.current.y;
    const duration = Date.now() - dragStartRef.current.time;
    dragStartRef.current = null;

    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 8) {
      // Tap
      const xPercent = Math.max(0, Math.min(1, startX / rect.width));
      const yPercent = Math.max(0, Math.min(1, startY / rect.height));
      void sendTouch(xPercent, yPercent);
    } else {
      // Swipe / Drag
      const x1 = Math.max(0, Math.min(1, startX / rect.width));
      const y1 = Math.max(0, Math.min(1, startY / rect.height));
      const x2 = Math.max(0, Math.min(1, endX / rect.width));
      const y2 = Math.max(0, Math.min(1, endY / rect.height));
      void sendSwipe(x1, y1, x2, y2, Math.min(800, Math.max(150, duration)));
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !isOnline) return;
    void sendText(inputText);
    setInputText('');
  };

  // Dimensions based on orientation
  const frameWidth = isLandscape ? 560 : 280;
  const frameHeight = isLandscape ? 280 : 560;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        padding: '12px',
        overflow: 'auto',
        position: 'relative',
        backgroundColor: 'var(--bg-app)',
      }}
    >
      {/* Top Device Bar & Quick Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px',
          fontSize: '11px',
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {selectedDevice ? selectedDevice.name : selectedAvd ? selectedAvd : 'Android Emulator'}
        </span>

        {isOnline && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              color: '#22c55e',
              fontSize: '10px',
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              padding: '1px 6px',
              borderRadius: '8px',
            }}
          >
            ● Online
          </span>
        )}

        {/* Rotate Orientation */}
        <button
          onClick={() => void toggleOrientation()}
          disabled={!isOnline}
          title={`Switch to ${isLandscape ? 'Portrait' : 'Landscape'}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '3px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            cursor: isOnline ? 'pointer' : 'not-allowed',
            fontSize: '10.5px',
          }}
        >
          <RotateCw size={11} />
          <span>{isLandscape ? 'Portrait' : 'Landscape'}</span>
        </button>

        {/* Live Stream Toggle */}
        <button
          onClick={() => toggleAutoRefreshScreenshot()}
          disabled={!isOnline}
          title={isAutoRefreshScreenshot ? 'Pause live stream' : 'Enable live stream'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '3px 6px',
            borderRadius: '4px',
            backgroundColor: isAutoRefreshScreenshot ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-panel)',
            border: isAutoRefreshScreenshot ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border-color)',
            color: isAutoRefreshScreenshot ? '#22c55e' : 'var(--text-muted)',
            cursor: isOnline ? 'pointer' : 'not-allowed',
            fontSize: '10.5px',
          }}
        >
          {isAutoRefreshScreenshot ? <Eye size={11} /> : <EyeOff size={11} />}
          <span>Live Mirror</span>
        </button>

        {/* Info Toggle */}
        <button
          onClick={() => setShowInfo(!showInfo)}
          title="Device Details"
          style={{
            background: 'transparent',
            border: 'none',
            color: showInfo ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer',
            padding: '3px',
          }}
        >
          <Info size={13} />
        </button>
      </div>

      {/* Device Details Dropdown Card */}
      {showInfo && (
        <div
          style={{
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '10px',
            fontSize: '10.5px',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            width: '280px',
          }}
        >
          <div>
            Device Name: <strong style={{ color: 'var(--text-primary)' }}>{selectedDevice?.name ?? selectedAvd}</strong>
          </div>
          <div>
            Serial: <span style={{ color: 'var(--text-primary)' }}>{selectedSerial ?? 'None'}</span>
          </div>
          <div>
            Target ABI: <span style={{ color: 'var(--text-primary)' }}>{selectedAvdDef?.abi ?? 'arm64-v8a'}</span>
          </div>
          {currentScreenshot && (
            <div>
              Resolution:{' '}
              <span style={{ color: 'var(--text-primary)' }}>
                {currentScreenshot.width} x {currentScreenshot.height} px
              </span>
            </div>
          )}
        </div>
      )}

      {/* Device Shell Frame */}
      <div
        style={{
          width: `${frameWidth}px`,
          height: `${frameHeight}px`,
          backgroundColor: '#0a0d14',
          borderRadius: isLandscape ? '24px' : '36px',
          padding: '10px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 0 2px rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: isLandscape ? 'row' : 'column',
          position: 'relative',
          userSelect: 'none',
          border: '3px solid #232733',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Hardware side buttons (interactive!) */}
        {!isLandscape && (
          <>
            {/* Power button (right side) */}
            <div
              onClick={() => void sendKey(26)}
              title="Power (Lock / Wake)"
              style={{
                position: 'absolute',
                right: '-7px',
                top: '110px',
                width: '5px',
                height: '42px',
                backgroundColor: '#4c566a',
                borderRadius: '0 3px 3px 0',
                cursor: 'pointer',
              }}
            />
            {/* Volume Up (left side) */}
            <div
              onClick={() => void sendKey(24)}
              title="Volume Up"
              style={{
                position: 'absolute',
                left: '-7px',
                top: '90px',
                width: '5px',
                height: '34px',
                backgroundColor: '#4c566a',
                borderRadius: '3px 0 0 3px',
                cursor: 'pointer',
              }}
            />
            {/* Volume Down (left side) */}
            <div
              onClick={() => void sendKey(25)}
              title="Volume Down"
              style={{
                position: 'absolute',
                left: '-7px',
                top: '134px',
                width: '5px',
                height: '34px',
                backgroundColor: '#4c566a',
                borderRadius: '3px 0 0 3px',
                cursor: 'pointer',
              }}
            />
          </>
        )}

        {/* Screen Bezel Container */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#000000',
            borderRadius: isLandscape ? '16px' : '26px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {/* Top Camera Punch Hole / Dynamic Island */}
          {!isLandscape && (
            <div
              style={{
                position: 'absolute',
                top: '6px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '56px',
                height: '14px',
                backgroundColor: '#05070a',
                borderRadius: '10px',
                zIndex: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#1a1f2c',
                  border: '1px solid #2a3142',
                }}
              />
            </div>
          )}

          {/* Status Bar */}
          <div
            style={{
              height: '24px',
              padding: '0 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '9px',
              color: 'rgba(255, 255, 255, 0.7)',
              zIndex: 20,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
            }}
          >
            <span>9:41</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Wifi size={10} />
              <Battery size={11} />
            </div>
          </div>

          {/* Interactive Screen Canvas / Content */}
          <div
            ref={screenContainerRef}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#070a10',
              overflow: 'hidden',
              cursor: isOnline ? 'crosshair' : 'default',
            }}
          >
            {/* Case 1: Emulator Booting / Starting */}
            {isStarting && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '20px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    border: '3px solid var(--border-color)',
                    borderTopColor: 'var(--accent)',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Opening Android Emulator...
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {selectedAvd ? selectedAvd.replace(/_/g, ' ') : 'Virtual Device'}
                  </span>
                </div>
              </div>
            )}

            {/* Case 2: Online with Live Screen Mirroring */}
            {!isStarting && isOnline && currentScreenshot && (
              <img
                src={`data:image/png;base64,${currentScreenshot.data}`}
                alt="Device Screen"
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  backgroundColor: '#000000',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Touch Feedback Ripple */}
            {ripple && (
              <div
                style={{
                  position: 'absolute',
                  left: ripple.x - 16,
                  top: ripple.y - 16,
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(34, 197, 94, 0.4)',
                  border: '1px solid #22c55e',
                  pointerEvents: 'none',
                  animation: 'rippleAnim 0.4s ease-out forwards',
                }}
              />
            )}

            {/* Case 3: Online without screenshot yet */}
            {!isStarting && isOnline && !currentScreenshot && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '20px',
                  textAlign: 'center',
                }}
              >
                <Smartphone size={32} color="var(--accent)" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#f3f4f6' }}>
                    {selectedDevice?.name || 'Device Online'}
                  </span>
                  <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                    Emulator connected. Ready for mirror.
                  </span>
                </div>
                <button
                  onClick={() => void takeScreenshot()}
                  disabled={isCapturingScreenshot}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 10px',
                    backgroundColor: 'var(--accent)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    marginTop: '6px',
                  }}
                >
                  <Camera size={12} />
                  <span>Capture Screen</span>
                </button>
              </div>
            )}

            {/* Case 4: Device Offline / Idle */}
            {!isStarting && !isOnline && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '24px 16px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Smartphone size={24} color="#6b7280" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f3f4f6' }}>
                    {selectedAvdDef ? selectedAvdDef.name : 'Device Offline'}
                  </span>
                  {selectedAvdDef?.apiLevel && (
                    <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                      API {selectedAvdDef.apiLevel} • {selectedAvdDef.abi ?? 'arm64'}
                    </span>
                  )}
                </div>

                {hasError && emulatorState.error && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px',
                      padding: '8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#f87171',
                      fontSize: '10px',
                      textAlign: 'left',
                      maxWidth: '220px',
                    }}
                  >
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ wordBreak: 'break-word' }}>{emulatorState.error}</span>
                  </div>
                )}

                <button
                  onClick={() => void startEmulator()}
                  disabled={!selectedAvd && avds.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    backgroundColor: 'var(--accent)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: selectedAvd || avds.length > 0 ? 'pointer' : 'not-allowed',
                    opacity: selectedAvd || avds.length > 0 ? 1 : 0.5,
                    marginTop: '8px',
                  }}
                >
                  <Play size={12} fill="#ffffff" />
                  <span>Launch Emulator</span>
                </button>
              </div>
            )}
          </div>

          {/* Interactive Android Navigation Bar */}
          <div
            style={{
              height: '32px',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: '0 24px',
              zIndex: 20,
            }}
          >
            {/* Back (Triangle rotated) */}
            <div
              onClick={() => void sendKey(4)}
              title="Back (KEYCODE_BACK)"
              style={{
                cursor: isOnline ? 'pointer' : 'default',
                opacity: isOnline ? 0.9 : 0.4,
                display: 'flex',
                alignItems: 'center',
                padding: '6px 12px',
              }}
            >
              <Triangle size={11} style={{ transform: 'rotate(-90deg)' }} color="#ffffff" fill="#ffffff" />
            </div>

            {/* Home (Circle) */}
            <div
              onClick={() => void sendKey(3)}
              title="Home (KEYCODE_HOME)"
              style={{
                cursor: isOnline ? 'pointer' : 'default',
                opacity: isOnline ? 0.9 : 0.4,
                display: 'flex',
                alignItems: 'center',
                padding: '6px 12px',
              }}
            >
              <Circle size={11} color="#ffffff" />
            </div>

            {/* Overview / Recent apps (Square) */}
            <div
              onClick={() => void sendKey(187)}
              title="Overview (KEYCODE_APP_SWITCH)"
              style={{
                cursor: isOnline ? 'pointer' : 'default',
                opacity: isOnline ? 0.9 : 0.4,
                display: 'flex',
                alignItems: 'center',
                padding: '6px 12px',
              }}
            >
              <Square size={10} color="#ffffff" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Text Input for Typing on Device */}
      {isOnline && (
        <form
          onSubmit={handleSendText}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '12px',
            width: '280px',
          }}
        >
          <input
            type="text"
            placeholder="Type text to device..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: 'var(--bg-panel)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '4px 8px',
              backgroundColor: inputText.trim() ? 'var(--accent)' : 'var(--bg-panel)',
              color: inputText.trim() ? '#ffffff' : 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: inputText.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            <Send size={11} />
          </button>
        </form>
      )}

      {/* Touch Interaction Hint */}
      <div
        style={{
          marginTop: '8px',
          fontSize: '10px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          maxWidth: '300px',
        }}
      >
        {isOnline
          ? 'Interactive Mirror: Click or swipe screen to control emulator directly. Native emulator window also active.'
          : 'Launch emulator to view live application screen with interactive touch and gestures.'}
      </div>

      <style>{`
        @keyframes rippleAnim {
          from { transform: scale(0.4); opacity: 0.9; }
          to { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
