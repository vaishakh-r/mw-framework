import { test, expect } from '../src/fixtures';
import { testData } from '../src/utils/DataUtility';
import type { Credentials } from '../src/utils/dataTypes';

const valid = testData.get<Credentials>('users.valid');
const invalid = testData.get<Credentials>('users.invalid');

test.describe('Login', () => {
  test('valid user lands on home @smoke', async ({ loginPage, homePage }) => {
    await loginPage.waitUntilLoaded();
    await loginPage.login(valid.username, valid.password);
    await homePage.waitUntilLoaded();
    await expect(homePage.el.welcome).toBeVisible();
  });

  test('invalid user sees error', async ({ loginPage }) => {
    await loginPage.waitUntilLoaded();
    await loginPage.login(invalid.username, invalid.password);
    await expect(loginPage.el.error).toBeVisible();
  });
});
