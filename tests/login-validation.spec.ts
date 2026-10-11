import { test, expect } from '../src/fixtures';
import { testData } from '../src/utils/DataUtility';
import type { Credentials } from '../src/utils/dataTypes';

const valid = testData.get<Credentials>('users.valid');
const badEmails = testData.get<string[]>('loginValidation.badEmails');
const shortPassword = testData.get<string>('loginValidation.shortPassword');

test.describe('Login form validation', () => {
  test.beforeEach(async ({ tabBarPage, loginPage }) => {
    await tabBarPage.waitUntilLoaded();
    await tabBarPage.openLogin();
    await loginPage.waitUntilLoaded();
  });

  test('login form shows email, password and login button @smoke @ios', async ({ loginPage }) => {
    await expect(loginPage.el.email).toBeVisible();
    await expect(loginPage.el.password).toBeVisible();
    await expect(loginPage.el.submit).toBeVisible();
  });

  test('well-formed email is accepted @ios', async ({ loginPage }) => {
    await loginPage.login(valid.username, shortPassword);
    await expect(loginPage.el.passwordError).toBeVisible();
    await expect(loginPage.el.emailError).toBeHidden();
  });

  for (const email of badEmails) {
    test(`malformed email "${email}" is rejected @ios`, async ({ loginPage }) => {
      await loginPage.login(email, valid.password);
      await expect(loginPage.el.emailError).toBeVisible();
    });
  }

  test('empty email is rejected @ios', async ({ loginPage }) => {
    await loginPage.enterPassword(valid.password);
    await loginPage.submit();
    await expect(loginPage.el.emailError).toBeVisible();
  });

  test('short password is rejected @ios', async ({ loginPage }) => {
    await loginPage.login(valid.username, shortPassword);
    await expect(loginPage.el.passwordError).toBeVisible();
  });
});
