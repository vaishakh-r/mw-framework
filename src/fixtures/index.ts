import { test as base, expect } from '@mobilewright/test';
import type { Platform } from '../core/platform';
import { LoginPage, HomePage, ProfilePage, TabBarPage } from '../pages';

type Pages = {
  loginPage: LoginPage;
  homePage: HomePage;
  profilePage: ProfilePage;
  tabBarPage: TabBarPage;
};

export const test = base.extend<Pages>({
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
