import { test as base, expect } from '@mobilewright/test';
import type { Platform } from '../core/platform';
import { LoginPage, HomePage, ProfilePage, TabBarPage } from '../pages';
import { setCurrentDevice } from '../utils/currentDevice';
import { PerDescribeSauceLabsDriver } from '../sauce/PerDescribeSauceLabsDriver';

type Pages = {
  loginPage: LoginPage;
  homePage: HomePage;
  profilePage: ProfilePage;
  tabBarPage: TabBarPage;
};

export const test = base.extend<Pages & { _currentDevice: void }, { _sauceSessions: void }>({
  // Worker teardown: deletes the last describe's Sauce session (no-op without the Sauce config).
  _sauceSessions: [async ({}, use) => {
    await use();
    await PerDescribeSauceLabsDriver.closeAll();
  }, { scope: 'worker', auto: true }],

  // Runs for every test: exposes the test's device to utils (e.g. scrollToCenter) via currentDevice().
  _currentDevice: [async ({ device }, use) => {
    setCurrentDevice(device);
    await use();
    setCurrentDevice(undefined);
  }, { auto: true }],
  loginPage: async ({ screen, platform }, use) => {
    await use(new LoginPage(screen, platform as Platform));
  },
  homePage: async ({ screen, platform }, use) => {
    await use(new HomePage(screen, platform as Platform));
  },
  profilePage: async ({ screen, platform }, use) => {
    await use(new ProfilePage(screen, platform as Platform));
  },
  tabBarPage: async ({ screen, platform }, use) => {
    await use(new TabBarPage(screen, platform as Platform));
  },
});

export { expect };
