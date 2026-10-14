import { create } from 'zustand';
import type {
  AndroidDevice,
  AvdDefinition,
  SdkStatus,
  FlutterSdkStatus,
  EmulatorState,
  FlutterDevice,
  FlutterRunState,
  DeviceLogEntry,
  ScreenshotResult,
  VirtualMobileEvent,
} from '../../shared/types/virtualMobile';

interface VirtualMobileState {
  // SDK
  sdkStatus: SdkStatus | null;
  flutterSdkStatus: FlutterSdkStatus | null;
  isFlutterProject: boolean;

  // Devices & Emulators
  devices: AndroidDevice[];
  avds: AvdDefinition[];
  selectedSerial: string | null;
  selectedAvd: string | null;

  // Lifecycle
  emulatorState: EmulatorState;
  flutterState: FlutterRunState;
  flutterDevices: FlutterDevice[];

  // Logs & Output
  deviceLogs: DeviceLogEntry[];
  flutterOutput: Array<{ id: string; text: string; stream: 'stdout' | 'stderr'; timestamp: number }>;

  // Screen preview & Interaction
  currentScreenshot: ScreenshotResult | null;
  isCapturingScreenshot: boolean;
  isAutoRefreshScreenshot: boolean;
  screenshotIntervalId: ReturnType<typeof setInterval> | null;
  orientation: 'portrait' | 'landscape';

  // UI state
  activeTab: 'preview' | 'flutter' | 'logs' | 'setup';
  isLoading: boolean;
  error: string | null;

  // Actions
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  selectDevice: (serial: string | null) => void;
  selectAvd: (avdName: string | null) => void;
  setActiveTab: (tab: 'preview' | 'flutter' | 'logs' | 'setup') => void;

  startEmulator: (avdName?: string) => Promise<void>;
  stopEmulator: () => Promise<void>;

  takeScreenshot: () => Promise<void>;
  toggleAutoRefreshScreenshot: (enabled?: boolean) => void;
  toggleOrientation: () => Promise<void>;
  sendTouch: (xPercent: number, yPercent: number) => Promise<void>;
  sendSwipe: (
    x1Percent: number,
    y1Percent: number,
    x2Percent: number,
    y2Percent: number,
    durationMs?: number
  ) => Promise<void>;
  sendKey: (key: number | string) => Promise<void>;
  sendText: (text: string) => Promise<void>;
  openAndroidStudio: () => Promise<void>;

  startLogStream: () => Promise<void>;
  stopLogStream: () => Promise<void>;
  clearLogs: () => void;

  flutterRun: (deviceId?: string, mode?: 'debug' | 'release' | 'profile') => Promise<void>;
  flutterHotReload: () => Promise<void>;
  flutterHotRestart: () => Promise<void>;
  flutterStop: () => Promise<void>;
  flutterPubGet: () => Promise<void>;
  clearFlutterOutput: () => void;
}

let eventUnsubscribe: (() => void) | null = null;

export const useVirtualMobileStore = create<VirtualMobileState>((set, get) => ({
  sdkStatus: null,
  flutterSdkStatus: null,
  isFlutterProject: false,

  devices: [],
  avds: [],
  selectedSerial: null,
  selectedAvd: null,

  emulatorState: {
    status: 'idle',
    avdName: null,
    serial: null,
    error: null,
    pid: null,
  },

  flutterState: {
    status: 'idle',
    deviceId: null,
    pid: null,
    isFlutterProject: false,
    error: null,
  },

  flutterDevices: [],
  deviceLogs: [],
  flutterOutput: [],

  currentScreenshot: null,
  isCapturingScreenshot: false,
  isAutoRefreshScreenshot: false,
  screenshotIntervalId: null,
  orientation: 'portrait',

  activeTab: 'preview',
  isLoading: false,
  error: null,

  init: async () => {
    const api = window.coreMindAPI?.virtualMobile;
    if (!api) return;

    // Avoid duplicate event listener
    if (!eventUnsubscribe && api.onEvent) {
      eventUnsubscribe = api.onEvent((event: VirtualMobileEvent) => {
        switch (event.type) {
          case 'devices-changed': {
            set((state) => {
              const currentSerialStillValid = event.devices.some((d) => d.serial === state.selectedSerial);
              const fallbackSerial = event.devices.find((d) => d.isOnline)?.serial ?? event.devices[0]?.serial ?? null;
              return {
                devices: event.devices,
                selectedSerial: currentSerialStillValid ? state.selectedSerial : fallbackSerial,
              };
            });
            break;
          }
          case 'emulator-state-changed': {
            set((state) => ({
              emulatorState: event.state,
              selectedSerial: event.state.serial ?? state.selectedSerial,
              selectedAvd: event.state.avdName ?? state.selectedAvd,
            }));
            break;
          }
          case 'flutter-state-changed': {
            set({ flutterState: event.state });
            break;
          }
          case 'flutter-output': {
            const entry = {
              id: `${Date.now()}-${Math.random()}`,
              text: event.data,
              stream: event.stream,
              timestamp: Date.now(),
            };
            set((state) => ({
              flutterOutput: [...state.flutterOutput.slice(-500), entry],
            }));
            break;
          }
          case 'device-log': {
            set((state) => ({
              deviceLogs: [...state.deviceLogs.slice(-1000), event.entry],
            }));
            break;
          }
          case 'screenshot-ready': {
            set({ currentScreenshot: event.screenshot, isCapturingScreenshot: false });
            break;
          }
          case 'sdk-status-changed': {
            set({ sdkStatus: event.sdk, flutterSdkStatus: event.flutter });
            break;
          }
        }
      });
    }

    await get().refresh();
  },

  refresh: async () => {
    const api = window.coreMindAPI?.virtualMobile;
    if (!api) return;

    set({ isLoading: true, error: null });

    try {
      const [
        sdkRes,
        flutterSdkRes,
        devicesRes,
        avdsRes,
        flutterProjRes,
        flutterDevRes,
        emuStateRes,
        flutterStateRes,
      ] = await Promise.all([
        api.getSdkStatus(),
        api.getFlutterSdkStatus(),
        api.listDevices(),
        api.listAvds(),
        api.checkFlutterProject(),
        api.getFlutterDevices(),
        api.getEmulatorState(),
        api.getFlutterRunState(),
      ]);

      const devices = devicesRes.success && devicesRes.data ? devicesRes.data : [];
      const avds = avdsRes.success && avdsRes.data ? avdsRes.data : [];
      const sdkStatus = sdkRes.success && sdkRes.data ? sdkRes.data : null;
      const flutterSdk = flutterSdkRes.success && flutterSdkRes.data ? flutterSdkRes.data : null;
      const isFlutter = flutterProjRes.success ? !!flutterProjRes.data : false;
      const flutterDevices = flutterDevRes.success && flutterDevRes.data ? flutterDevRes.data : [];
      const emuState = emuStateRes.success && emuStateRes.data ? emuStateRes.data : get().emulatorState;
      const flutterState = flutterStateRes.success && flutterStateRes.data ? flutterStateRes.data : get().flutterState;

      set((state) => {
        const selectedSerial =
          state.selectedSerial && devices.some((d) => d.serial === state.selectedSerial)
            ? state.selectedSerial
            : devices.find((d) => d.isOnline)?.serial ?? devices[0]?.serial ?? null;

        const selectedAvd =
          state.selectedAvd && avds.some((a) => a.name === state.selectedAvd)
            ? state.selectedAvd
            : avds[0]?.name ?? null;

        return {
          sdkStatus,
          flutterSdkStatus: flutterSdk,
          devices,
          avds,
          selectedSerial,
          selectedAvd,
          isFlutterProject: isFlutter,
          flutterDevices,
          emulatorState: emuState,
          flutterState,
          isLoading: false,
        };
      });

      // Auto start log stream if device is active and online
      const currentSelected = get().selectedSerial;
      if (currentSelected) {
        void api.startLogStream(currentSelected);
      }
    } catch (err: unknown) {
      set({ isLoading: false, error: (err as Error).message });
    }
  },

  selectDevice: (serial) => {
    const api = window.coreMindAPI?.virtualMobile;
    set({ selectedSerial: serial });
    if (serial && api) {
      void api.startLogStream(serial);
      void get().takeScreenshot();
    }
  },

  selectAvd: (avdName) => {
    set({ selectedAvd: avdName });
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  startEmulator: async (targetAvd) => {
    const api = window.coreMindAPI?.virtualMobile;
    if (!api) return;

    const avdName = targetAvd ?? get().selectedAvd;
    if (!avdName) {
      set({ error: 'No AVD selected to launch.' });
      return;
    }

    set({
      isLoading: true,
      error: null,
      emulatorState: {
        status: 'starting',
        avdName,
        serial: null,
        error: null,
        pid: null,
      },
    });

    try {
      const res = await api.startEmulator(avdName);
      if (res.success) {
        set({ emulatorState: res.data, isLoading: false });
        if (res.data.serial) {
          set({ selectedSerial: res.data.serial });
          get().toggleAutoRefreshScreenshot(true);
        }
      } else {
        set({
          isLoading: false,
          error: res.error.message ?? 'Failed to start emulator',
          emulatorState: {
            status: 'error',
            avdName,
            serial: null,
            error: res.error.message ?? 'Failed to start emulator',
            pid: null,
          },
        });
      }
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: (err as Error).message,
        emulatorState: {
          status: 'error',
          avdName,
          serial: null,
          error: (err as Error).message,
          pid: null,
        },
      });
    }
  },

  stopEmulator: async () => {
    const api = window.coreMindAPI?.virtualMobile;
    if (!api) return;

    set({ isLoading: true });
    get().toggleAutoRefreshScreenshot(false);

    try {
      const res = await api.stopEmulator();
      if (res.success) {
        set({ emulatorState: res.data, isLoading: false, currentScreenshot: null });
      } else {
        set({ isLoading: false, error: res.error.message ?? 'Failed to stop emulator' });
      }
    } catch (err: unknown) {
      set({ isLoading: false, error: (err as Error).message });
    }
  },

  takeScreenshot: async () => {
    const api = window.coreMindAPI?.virtualMobile;
    const serial = get().selectedSerial;
    if (!api || !serial || get().isCapturingScreenshot) return;

    set({ isCapturingScreenshot: true });
    try {
      const res = await api.takeScreenshot(serial);
      if (res.success && res.data) {
        set({ currentScreenshot: res.data, isCapturingScreenshot: false });
      } else {
        set({ isCapturingScreenshot: false });
      }
    } catch {
      set({ isCapturingScreenshot: false });
    }
  },

  toggleAutoRefreshScreenshot: (enabled) => {
    const current = get().isAutoRefreshScreenshot;
    const next = enabled !== undefined ? enabled : !current;

    const currentInterval = get().screenshotIntervalId;
    if (currentInterval) {
      clearInterval(currentInterval);
      set({ screenshotIntervalId: null });
    }

    if (next) {
      void get().takeScreenshot();
      const intervalId = setInterval(() => {
        void get().takeScreenshot();
      }, 3000);
      set({ isAutoRefreshScreenshot: true, screenshotIntervalId: intervalId });
    } else {
      set({ isAutoRefreshScreenshot: false, screenshotIntervalId: null });
    }
  },

  startLogStream: async () => {
    const api = window.coreMindAPI?.virtualMobile;
    const serial = get().selectedSerial;
    if (!api || !serial) return;
    await api.startLogStream(serial);
  },

  stopLogStream: async () => {
    const api = window.coreMindAPI?.virtualMobile;
    if (!api) return;
    await api.stopLogStream();
  },

  clearLogs: () => {
    set({ deviceLogs: [] });
  },

  flutterRun: async (targetDevice, mode = 'debug') => {
    const api = window.coreMindAPI?.virtualMobile;
    if (!api) return;

    const deviceId = targetDevice ?? get().selectedSerial ?? get().devices[0]?.serial;
    if (!deviceId) {
      set({ error: 'No target device available for Flutter run.' });
      return;
    }

    set({
      error: null,
      flutterState: {
        status: 'starting',
        deviceId,
        pid: null,
        isFlutterProject: true,
        error: null,
      },
    });

    try {
      const res = await api.flutterRun(deviceId, mode);
      if (res.success) {
        set({ flutterState: res.data });
      } else {
        set({
          error: res.error.message ?? 'Flutter run failed',
          flutterState: {
            status: 'error',
            deviceId,
            pid: null,
            isFlutterProject: true,
            error: res.error.message ?? 'Flutter run failed',
          },
        });
      }
    } catch (err: unknown) {
      set({
        error: (err as Error).message,
        flutterState: {
          status: 'error',
          deviceId,
          pid: null,
          isFlutterProject: true,
          error: (err as Error).message,
        },
      });
    }
  },

  flutterHotReload: async () => {
    const api = window.coreMindAPI?.virtualMobile;
    if (!api) return;
    try {
      await api.flutterHotReload();
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  flutterHotRestart: async () => {
    const api = window.coreMindAPI?.virtualMobile;
    if (!api) return;
    try {
      await api.flutterHotRestart();
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  flutterStop: async () => {
    const api = window.coreMindAPI?.virtualMobile;
    if (!api) return;
    try {
      const res = await api.flutterStop();
      if (res.success && res.data) {
        set({ flutterState: res.data });
      }
    } catch (err: unknown) {
      set({ error: (err as Error).message });
    }
  },

  clearFlutterOutput: () => {
    set({ flutterOutput: [] });
  },

  toggleOrientation: async () => {
    const api = window.coreMindAPI?.virtualMobile;
    const serial = get().selectedSerial;
    const next = get().orientation === 'portrait' ? 'landscape' : 'portrait';
    set({ orientation: next });
    if (api && serial) {
      await api.setOrientation(serial, next);
    }
  },

  sendTouch: async (xPercent: number, yPercent: number) => {
    const api = window.coreMindAPI?.virtualMobile;
    const serial = get().selectedSerial;
    if (!api || !serial) return;
    await api.sendTouch(serial, xPercent, yPercent);
  },

  sendSwipe: async (
    x1Percent: number,
    y1Percent: number,
    x2Percent: number,
    y2Percent: number,
    durationMs?: number
  ) => {
    const api = window.coreMindAPI?.virtualMobile;
    const serial = get().selectedSerial;
    if (!api || !serial) return;
    await api.sendSwipe(serial, x1Percent, y1Percent, x2Percent, y2Percent, durationMs);
  },

  sendKey: async (key: number | string) => {
    const api = window.coreMindAPI?.virtualMobile;
    const serial = get().selectedSerial;
    if (!api || !serial) return;
    await api.sendKey(serial, key);
  },

  sendText: async (text: string) => {
    const api = window.coreMindAPI?.virtualMobile;
    const serial = get().selectedSerial;
    if (!api || !serial) return;
    await api.sendText(serial, text);
  },

  openAndroidStudio: async () => {
    const api = window.coreMindAPI?.virtualMobile;
    if (!api) return;
    await api.openAndroidStudio();
  },

  flutterPubGet: async () => {
    const api = window.coreMindAPI?.virtualMobile;
    if (!api) return;
    set({ isLoading: true });
    try {
      const res = await api.flutterPubGet();
      set({ isLoading: false });
      if (!res.success) {
        set({ error: res.error.message });
      }
    } catch (err: unknown) {
      set({ isLoading: false, error: (err as Error).message });
    }
  },
}));
