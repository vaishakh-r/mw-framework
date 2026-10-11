import 'dotenv/config'; // load .env into process.env before the config reads it
import { defineConfig } from 'mobilewright';

const re = (v: string | undefined, fallback: string) => new RegExp(v ?? fallback, 'i');

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // one device per worker; raise when you have a device farm
  reporter: [['list'], ['html']],
  viewTree: 'on-failure',
  use: { actionTimeout: 8_000, appLaunchTimeout: 30_000 },
  expect: { timeout: 8_000 },

  // One project per platform: same specs, different device + app id.
  projects: [
    {
      name: 'ios',
      grepInvert: /^(?!.*@ios\b).*@android\b/, // skip tests tagged @android only
      use: {
        platform: 'ios',
        bundleId: process.env.IOS_BUNDLE_ID ?? 'org.wdiodemoapp',
        deviceName: re(process.env.IOS_DEVICE_NAME, 'iPhone'),
        // installApps: process.env.IOS_APP_PATH,
      },
    },
    {
      name: 'android',
      grepInvert: /^(?!.*@android\b).*@ios\b/, // skip tests tagged @ios only
      use: {
        platform: 'android',
        bundleId: process.env.ANDROID_PACKAGE ?? 'com.example.myapp',
        deviceName: re(process.env.ANDROID_DEVICE_NAME, 'Pixel|emulator'),
        // installApps: process.env.ANDROID_APP_PATH,
      },
    },
  ],
});
