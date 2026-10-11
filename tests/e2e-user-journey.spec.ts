import { test, expect } from '../src/fixtures';
import { testData } from '../src/utils/DataUtility';
import type { Credentials } from '../src/utils/dataTypes';

const valid = testData.get<Credentials>('users.valid');
const invalid = testData.get<Credentials>('users.invalid');

/**
 * End-to-end journey: cold start -> failed login -> successful login
 * -> home -> profile -> logout -> back at login.
 *
 * Same spec runs on both platforms:
 *   npx mobilewright test tests/e2e-user-journey.spec.ts --project=ios
 *   npx mobilewright test tests/e2e-user-journey.spec.ts --project=android
 */
test.describe('User journey @e2e', () => {
  test('login, view profile, logout', async ({ loginPage, homePage, profilePage }) => {
    await test.step('app launches on the login screen', async () => {
      await loginPage.waitUntilLoaded();
    });

    await test.step('wrong credentials show an error and stay on login', async () => {
      await loginPage.login(invalid.username, invalid.password);
      await expect(loginPage.el.error).toBeVisible();
      expect(await homePage.isDisplayed()).toBe(false);
    });

    await test.step('valid credentials land on home', async () => {
      await loginPage.login(valid.username, valid.password);
      await homePage.waitUntilLoaded();
      await expect(homePage.el.welcome).toBeVisible();
    });

    await test.step('profile tab shows the signed-in user', async () => {
      await homePage.openProfile();
      await profilePage.waitUntilLoaded();
      await expect(profilePage.el.email).toHaveText(valid.username);
    });

    await test.step('logout returns to login', async () => {
      await profilePage.logout();
      await loginPage.waitUntilLoaded();
      await expect(loginPage.el.submit).toBeVisible();
    });
  });
});
