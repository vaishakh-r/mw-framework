import { test, expect } from '../src/fixtures';
import { testData } from '../src/utils/DataUtility';
import type { Credentials } from '../src/utils/dataTypes';

/**
 * Platform tags (filtered per project in mobilewright.config.ts):
 *   no tag             -> runs on iOS and Android
 *   @ios / @android    -> runs only on that platform
 *   @ios + @android    -> runs on both, stated explicitly
 */
const valid = testData.get<Credentials>('users.valid');

test.describe('Platform tags', () => {
  test.beforeEach(async ({ loginPage, homePage }) => {
    await loginPage.waitUntilLoaded();
    await loginPage.login(valid.username, valid.password);
    await homePage.waitUntilLoaded();
  });

  test('home shows welcome (both platforms)', { tag: ['@ios', '@android'] }, async ({ homePage }) => {
    await expect(homePage.el.welcome).toBeVisible();
  });

  test('profile opens from the tab bar', { tag: '@ios' }, async ({ homePage, profilePage }) => {
    await homePage.openProfile();
    await profilePage.waitUntilLoaded();
  });

  test('hardware back from profile returns home', { tag: '@android' }, async ({ screen, homePage, profilePage }) => {
    await homePage.openProfile();
    await profilePage.waitUntilLoaded();
    await screen.pressButton('BACK');
    await homePage.waitUntilLoaded();
  });
});
