import { describe, it, expect, beforeEach } from 'vitest';
import { AndroidDeviceService } from '../src/main/services/androidDeviceService';
import { FlutterRunService } from '../src/main/services/flutterRunService';
import { VIRTUAL_MOBILE_IPC } from '../src/shared/types/virtualMobile';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('Virtual Mobile Device — Architecture & Services', () => {
  let androidService: AndroidDeviceService;
  let flutterService: FlutterRunService;

  beforeEach(() => {
    androidService = new AndroidDeviceService();
    flutterService = new FlutterRunService();
  });

  describe('IPC Channel Definitions', () => {
    it('defines all required virtual mobile IPC channels', () => {
      expect(VIRTUAL_MOBILE_IPC.GET_SDK_STATUS).toBe('virtual-mobile:get-sdk-status');
      expect(VIRTUAL_MOBILE_IPC.GET_FLUTTER_SDK_STATUS).toBe('virtual-mobile:get-flutter-sdk-status');
      expect(VIRTUAL_MOBILE_IPC.LIST_DEVICES).toBe('virtual-mobile:list-devices');
      expect(VIRTUAL_MOBILE_IPC.LIST_AVDS).toBe('virtual-mobile:list-avds');
      expect(VIRTUAL_MOBILE_IPC.START_EMULATOR).toBe('virtual-mobile:start-emulator');
      expect(VIRTUAL_MOBILE_IPC.STOP_EMULATOR).toBe('virtual-mobile:stop-emulator');
      expect(VIRTUAL_MOBILE_IPC.TAKE_SCREENSHOT).toBe('virtual-mobile:take-screenshot');
      expect(VIRTUAL_MOBILE_IPC.FLUTTER_RUN).toBe('virtual-mobile:flutter-run');
      expect(VIRTUAL_MOBILE_IPC.FLUTTER_HOT_RELOAD).toBe('virtual-mobile:flutter-hot-reload');
      expect(VIRTUAL_MOBILE_IPC.FLUTTER_HOT_RESTART).toBe('virtual-mobile:flutter-hot-restart');
      expect(VIRTUAL_MOBILE_IPC.FLUTTER_STOP).toBe('virtual-mobile:flutter-stop');
      expect(VIRTUAL_MOBILE_IPC.FLUTTER_PUB_GET).toBe('virtual-mobile:flutter-pub-get');
      expect(VIRTUAL_MOBILE_IPC.SEND_TOUCH).toBe('virtual-mobile:send-touch');
      expect(VIRTUAL_MOBILE_IPC.SEND_SWIPE).toBe('virtual-mobile:send-swipe');
      expect(VIRTUAL_MOBILE_IPC.SEND_KEY).toBe('virtual-mobile:send-key');
      expect(VIRTUAL_MOBILE_IPC.SEND_TEXT).toBe('virtual-mobile:send-text');
      expect(VIRTUAL_MOBILE_IPC.SET_ORIENTATION).toBe('virtual-mobile:set-orientation');
      expect(VIRTUAL_MOBILE_IPC.OPEN_ANDROID_STUDIO).toBe('virtual-mobile:open-android-studio');
      expect(VIRTUAL_MOBILE_IPC.START_SCREEN_STREAM).toBe('virtual-mobile:start-screen-stream');
      expect(VIRTUAL_MOBILE_IPC.STOP_SCREEN_STREAM).toBe('virtual-mobile:stop-screen-stream');
      expect(VIRTUAL_MOBILE_IPC.EVENT).toBe('virtual-mobile:event');
    });
  });

  describe('AndroidDeviceService', () => {
    it('initializes with idle emulator state', () => {
      const state = androidService.getEmulatorState();
      expect(state.status).toBe('idle');
      expect(state.avdName).toBeNull();
      expect(state.serial).toBeNull();
      expect(state.error).toBeNull();
      expect(state.pid).toBeNull();
    });

    it('handles discoverSdk without throwing even when SDK is missing', async () => {
      const status = await androidService.discoverSdk();
      expect(typeof status.found).toBe('boolean');
      if (status.found) {
        expect(status.paths).toBeDefined();
        expect(status.paths?.adb).toContain('adb');
      } else {
        expect(status.error).toBeDefined();
      }
    });

    it('rejects startEmulator if AVD does not exist', async () => {
      const result = await androidService.startEmulator('non_existent_fake_device_9999');
      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('handles stopEmulator gracefully when no emulator is running', async () => {
      const result = await androidService.stopEmulator();
      expect(result.status).toBe('idle');
    });

    it('rejects screenshot when adb is not found or serial is invalid', async () => {
      const screenshot = await androidService.takeScreenshot('invalid-serial-1234');
      expect(screenshot).toBeNull();
    });

    it('handles interactive touch, swipe, keys and text without crashing', async () => {
      const tapResult = await androidService.sendTap('invalid-serial', 100, 100);
      expect(typeof tapResult).toBe('boolean');

      const swipeResult = await androidService.sendSwipe('invalid-serial', 100, 100, 200, 200, 200);
      expect(typeof swipeResult).toBe('boolean');

      const keyResult = await androidService.sendKeyEvent('invalid-serial', 4); // KEYCODE_BACK
      expect(typeof keyResult).toBe('boolean');

      const textResult = await androidService.sendText('invalid-serial', 'test');
      expect(typeof textResult).toBe('boolean');

      const orientationResult = await androidService.setOrientation('invalid-serial', 'portrait');
      expect(typeof orientationResult).toBe('boolean');
    });

    it('starts and stops screen stream cleanly', () => {
      androidService.startScreenStream('invalid-serial', 500);
      androidService.stopScreenStream();
    });
  });

  describe('FlutterRunService', () => {
    it('initializes with idle run state', () => {
      const state = flutterService.getRunState();
      expect(state.status).toBe('idle');
      expect(state.deviceId).toBeNull();
      expect(state.pid).toBeNull();
      expect(state.isFlutterProject).toBe(false);
      expect(state.error).toBeNull();
    });

    it('accurately identifies Flutter projects by detecting pubspec.yaml', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coremind-flutter-test-'));

      try {
        // Initially empty directory -> not a flutter project
        expect(flutterService.checkFlutterProject(tempDir)).toBe(false);

        // Add a standard package pubspec without flutter
        fs.writeFileSync(path.join(tempDir, 'pubspec.yaml'), 'name: my_cli_package\nversion: 1.0.0\n');
        expect(flutterService.checkFlutterProject(tempDir)).toBe(false);

        // Add flutter sdk dependency -> recognized as flutter project
        fs.writeFileSync(
          path.join(tempDir, 'pubspec.yaml'),
          'name: my_flutter_app\ndependencies:\n  flutter:\n    sdk: flutter\n'
        );
        expect(flutterService.checkFlutterProject(tempDir)).toBe(true);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('fails to run Flutter if the workspace is not a Flutter project', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coremind-non-flutter-'));
      try {
        const result = await flutterService.startRun(tempDir, 'emulator-5554');
        expect(result.status).toBe('error');
        expect(result.error).toBeDefined();
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('handles hot reload and restart safely when not running', async () => {
      const reloaded = await flutterService.hotReload();
      expect(reloaded).toBe(false);

      const restarted = await flutterService.hotRestart();
      expect(restarted).toBe(false);
    });

    it('handles stopRun safely when not running', async () => {
      const state = await flutterService.stopRun();
      expect(state.status).toBe('idle');
    });

    it('rejects pubGet safely on non-flutter directory', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coremind-non-flutter-pubget-'));
      try {
        const result = await flutterService.pubGet(tempDir);
        expect(result).toBe(false);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
