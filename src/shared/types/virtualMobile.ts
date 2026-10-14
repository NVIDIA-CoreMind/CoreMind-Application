/**
 * Virtual Mobile Device — Shared Type Definitions
 *
 * Covers Android device/emulator management, Flutter run lifecycle,
 * and typed IPC channels for secure main↔renderer communication.
 */

// ─── Android Device Types ────────────────────────────────────────────────────

export type DeviceConnectionType = 'emulator' | 'usb' | 'wireless';
export type DeviceState = 'offline' | 'device' | 'unauthorized' | 'no-permissions' | 'recovery' | 'sideload' | 'unknown';

export interface AndroidDevice {
  /** Serial number from `adb devices` (e.g. emulator-5554, RZCTA...) */
  serial: string;
  /** Human-readable name (from AVD or device model) */
  name: string;
  /** Connection type */
  type: DeviceConnectionType;
  /** ADB device state */
  state: DeviceState;
  /** Android API level if available */
  apiLevel?: number;
  /** AVD name if this is an emulator */
  avdName?: string;
  /** Whether the device is currently booted and ready */
  isOnline: boolean;
}

export interface AvdDefinition {
  /** AVD name as shown by `emulator -list-avds` */
  name: string;
  /** Device definition (e.g. "Pixel 7") */
  device?: string;
  /** Target API level */
  apiLevel?: number;
  /** System image ABI (e.g. x86_64, arm64-v8a) */
  abi?: string;
}

// ─── SDK Discovery Types ─────────────────────────────────────────────────────

export interface SdkPaths {
  /** Root Android SDK path */
  sdkRoot: string;
  /** Path to `adb` executable */
  adb: string;
  /** Path to `emulator` executable */
  emulator: string;
  /** Path to `avdmanager` if available */
  avdmanager?: string;
}

export interface SdkStatus {
  /** Whether a valid SDK was discovered */
  found: boolean;
  /** Resolved SDK paths (only if found) */
  paths?: SdkPaths;
  /** Human-readable error if not found */
  error?: string;
  /** Where the SDK was discovered from */
  source?: 'ANDROID_HOME' | 'ANDROID_SDK_ROOT' | 'default_path' | 'settings';
  /** Whether Android Studio application was found on the system */
  androidStudioInstalled?: boolean;
  /** Path to Android Studio installation */
  androidStudioPath?: string;
}

// ─── Emulator State ──────────────────────────────────────────────────────────

export type EmulatorStatus =
  | 'idle'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'error'
  | 'unavailable';

export interface EmulatorState {
  status: EmulatorStatus;
  /** The AVD being run */
  avdName: string | null;
  /** ADB serial of running emulator */
  serial: string | null;
  /** Startup error message */
  error: string | null;
  /** PID of the emulator process */
  pid: number | null;
}

// ─── Flutter Types ───────────────────────────────────────────────────────────

export type FlutterRunStatus =
  | 'idle'
  | 'starting'
  | 'running'
  | 'hot-reloading'
  | 'hot-restarting'
  | 'stopping'
  | 'error'
  | 'stopped';

export interface FlutterDevice {
  /** Device ID from `flutter devices` */
  id: string;
  /** Human-readable device name */
  name: string;
  /** Target platform (android, ios, web, etc.) */
  platform: string;
  /** Whether this device is an emulator */
  isEmulator: boolean;
}

export interface FlutterSdkStatus {
  found: boolean;
  path?: string;
  version?: string;
  error?: string;
}

export interface FlutterRunState {
  status: FlutterRunStatus;
  /** Target device ID */
  deviceId: string | null;
  /** PID of the `flutter run` process */
  pid: number | null;
  /** Whether the current workspace is a Flutter project */
  isFlutterProject: boolean;
  /** Last error message */
  error: string | null;
}

// ─── Log Types ───────────────────────────────────────────────────────────────

export type LogLevel = 'verbose' | 'debug' | 'info' | 'warning' | 'error' | 'fatal' | 'silent';

export interface DeviceLogEntry {
  timestamp: number;
  level: LogLevel;
  tag: string;
  message: string;
  pid?: number;
}

// ─── Screenshot ──────────────────────────────────────────────────────────────

export interface ScreenshotResult {
  /** Base64-encoded PNG data */
  data: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** When the screenshot was taken */
  timestamp: number;
}

// ─── IPC Event Types ─────────────────────────────────────────────────────────

export type VirtualMobileEvent =
  | { type: 'devices-changed'; devices: AndroidDevice[] }
  | { type: 'emulator-state-changed'; state: EmulatorState }
  | { type: 'flutter-state-changed'; state: FlutterRunState }
  | { type: 'flutter-output'; data: string; stream: 'stdout' | 'stderr' }
  | { type: 'device-log'; entry: DeviceLogEntry }
  | { type: 'screenshot-ready'; screenshot: ScreenshotResult }
  | { type: 'sdk-status-changed'; sdk: SdkStatus; flutter: FlutterSdkStatus };

// ─── Interactive Input Types ─────────────────────────────────────────────────

export interface TouchInputPayload {
  serial: string;
  xPercent: number; // 0.0 - 1.0
  yPercent: number; // 0.0 - 1.0
}

export interface SwipeInputPayload {
  serial: string;
  x1Percent: number;
  y1Percent: number;
  x2Percent: number;
  y2Percent: number;
  durationMs?: number;
}

export interface KeyInputPayload {
  serial: string;
  key: number | string; // Key code or name
}

export interface TextInputPayload {
  serial: string;
  text: string;
}

export interface OrientationPayload {
  serial: string;
  orientation: 'portrait' | 'landscape';
}

// ─── IPC Channels ────────────────────────────────────────────────────────────

export const VIRTUAL_MOBILE_IPC = {
  // SDK
  GET_SDK_STATUS: 'virtual-mobile:get-sdk-status',
  GET_FLUTTER_SDK_STATUS: 'virtual-mobile:get-flutter-sdk-status',

  // Devices
  LIST_DEVICES: 'virtual-mobile:list-devices',
  LIST_AVDS: 'virtual-mobile:list-avds',
  REFRESH_DEVICES: 'virtual-mobile:refresh-devices',

  // Emulator lifecycle
  START_EMULATOR: 'virtual-mobile:start-emulator',
  STOP_EMULATOR: 'virtual-mobile:stop-emulator',
  GET_EMULATOR_STATE: 'virtual-mobile:get-emulator-state',

  // Device interaction
  TAKE_SCREENSHOT: 'virtual-mobile:take-screenshot',
  GET_DEVICE_LOGS: 'virtual-mobile:get-device-logs',
  START_LOG_STREAM: 'virtual-mobile:start-log-stream',
  STOP_LOG_STREAM: 'virtual-mobile:stop-log-stream',

  // Interactive Live Input
  SEND_TOUCH: 'virtual-mobile:send-touch',
  SEND_SWIPE: 'virtual-mobile:send-swipe',
  SEND_KEY: 'virtual-mobile:send-key',
  SEND_TEXT: 'virtual-mobile:send-text',
  SET_ORIENTATION: 'virtual-mobile:set-orientation',
  OPEN_ANDROID_STUDIO: 'virtual-mobile:open-android-studio',
  START_SCREEN_STREAM: 'virtual-mobile:start-screen-stream',
  STOP_SCREEN_STREAM: 'virtual-mobile:stop-screen-stream',

  // Flutter
  GET_FLUTTER_DEVICES: 'virtual-mobile:get-flutter-devices',
  FLUTTER_RUN: 'virtual-mobile:flutter-run',
  FLUTTER_HOT_RELOAD: 'virtual-mobile:flutter-hot-reload',
  FLUTTER_HOT_RESTART: 'virtual-mobile:flutter-hot-restart',
  FLUTTER_STOP: 'virtual-mobile:flutter-stop',
  FLUTTER_PUB_GET: 'virtual-mobile:flutter-pub-get',
  GET_FLUTTER_RUN_STATE: 'virtual-mobile:get-flutter-run-state',
  CHECK_FLUTTER_PROJECT: 'virtual-mobile:check-flutter-project',

  // Events (main → renderer push)
  EVENT: 'virtual-mobile:event',
} as const;
