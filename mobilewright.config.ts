import 'dotenv/config'; // load .env into process.env before the config reads it
import { defineConfig } from 'mobilewright';
import type { Region } from '@saucelabs/mobilewright-driver';
import { PerDescribeSauceLabsDriver } from './src/sauce/PerDescribeSauceLabsDriver';

const re = (v: string | undefined, fallback: string) => new RegExp(v ?? fallback, 'i');

// RUN_ON_SAUCE=true -> Sauce Labs real devices (one session per test.describe, see src/sauce/).
// Anything else (or unset) -> local simulator / emulator / device through mobilecli.
// Sauce credentials come from SAUCE_USERNAME / SAUCE_ACCESS_KEY, read by the driver itself.
const runOnSauce = /^(true|1)$/i.test(process.env.RUN_ON_SAUCE ?? '');
const env = process.env;

export default defineConfig({
  testDir: './tests',
  // Remote devices: every action is a network round-trip.
  timeout: runOnSauce ? 300_000 : 60_000,
  retries: env.CI ? 1 : 0,
  workers: runOnSauce ? Number(env.SAUCE_WORKERS ?? 1) : 1, // one device per worker
  reporter: [['list'], ['html']],
  viewTree: 'on-failure',
  use: runOnSauce
    ? { actionTimeout: 30_000, appLaunchTimeout: 60_000 }
    : { actionTimeout: 8_000, appLaunchTimeout: 30_000 },
  expect: { timeout: runOnSauce ? 30_000 : 8_000 },
  // No driver -> mobilewright's default local driver (mobilecli).
  ...(runOnSauce && {
    driver: new PerDescribeSauceLabsDriver({
      region: (env.SAUCE_REGION ?? 'eu-central-1') as Region,
      build: env.SAUCE_BUILD ?? `mw-framework ${new Date().toISOString()}`,
      sessionDuration: env.SAUCE_SESSION_DURATION ?? 'PT1H',
    }),
  }),

  // One project per platform: same specs, different device + app id.
  projects: [
    {
      name: 'ios',
      grepInvert: /^(?!.*@ios\b).*@android\b/, // skip tests tagged @android only
      use: {
        platform: 'ios',
        bundleId: env.IOS_BUNDLE_ID ?? 'org.wdiodemoapp',
        ...(runOnSauce
          ? {
              deviceName: re(env.SAUCE_IOS_DEVICE_NAME, 'iPhone'),
              osVersion: env.SAUCE_IOS_OS_VERSION,
              installApps: env.SAUCE_IOS_APP, // storage:<id>, storage:filename=<name>, https:// URL or local path
            }
          : {
              deviceName: re(env.IOS_DEVICE_NAME, 'iPhone'),
              // installApps: env.IOS_APP_PATH,
            }),
      },
    },
    {
      name: 'android',
      grepInvert: /^(?!.*@android\b).*@ios\b/, // skip tests tagged @ios only
      use: {
        platform: 'android',
        bundleId: env.ANDROID_PACKAGE ?? 'com.example.myapp',
        ...(runOnSauce
          ? {
              deviceName: re(env.SAUCE_ANDROID_DEVICE_NAME, 'Google_Pixel(?!.*Fold)'),
              osVersion: env.SAUCE_ANDROID_OS_VERSION,
              installApps: env.SAUCE_ANDROID_APP,
            }
          : {
              deviceName: re(env.ANDROID_DEVICE_NAME, 'Pixel|emulator'),
              // installApps: env.ANDROID_APP_PATH,
            }),
      },
    },
  ],
});
