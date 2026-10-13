# mw-framework

**A Mobilewright POM framework for iOS + Android.**

End-to-end mobile tests written once and run on both iOS and Android with
[Mobilewright](https://github.com/mobile-next/mobilewright), a Playwright-style runner for mobile.
The framework uses the Page Object Model (POM), keeps every selector in one place, and loads
test data per environment.

> **Status:** typechecked and listed, **not yet executed end to end**. The login screen was
> inspected on an iPhone 17 Pro simulator (`org.wdiodemoapp`); home and profile locators are
> still placeholders. See [Known gaps](#known-gaps).

---

## Contents
1. [Features](#features)
2. [How it fits together](#how-it-fits-together)
3. [Project layout](#project-layout)
4. [Setup](#setup)
5. [Running tests](#running-tests)
6. [Configuration](#configuration)
7. [Writing tests](#writing-tests)
8. [Locators in depth](#locators-in-depth)
9. [Page objects](#page-objects)
10. [Fixtures](#fixtures)
11. [Test data and environments](#test-data-and-environments)
12. [Platform tags](#platform-tags)
13. [Generating tests with the MCP skill](#generating-tests-with-the-mcp-skill)
14. [Cloud devices](#cloud-devices)
15. [Conventions](#conventions)
16. [Known gaps](#known-gaps)
17. [Troubleshooting](#troubleshooting)

---

## Features
- **One suite, two platforms.** Two Mobilewright projects (`ios`, `android`) run the same specs.
- **Strict layering.** Specs hold assertions, pages hold actions, locator files hold selectors.
- **Locators as data.** A shared selector by default, with `ios:` / `android:` overrides only where
  the UI really differs.
- **Environment-aware test data.** `dev | uat | prod` folders layered over `common`, with `${ENV_VAR}`
  expansion so secrets stay out of JSON.
- **Tag-based platform filtering.** `@ios`, `@android`, both, or none.
- **Live-device test generation.** A Claude skill reads the real accessibility tree through
  `mobile-mcp` and drafts locators, pages and specs.
- **Typed end to end.** TypeScript in strict mode; unknown locator keys are compile errors.

## How it fits together

```
tests/*.spec.ts            flow + assertions only
        │  uses
        ▼
src/fixtures/index.ts      injects loginPage, homePage, profilePage, tabBarPage
        │  builds
        ▼
src/pages/*Page.ts         actions only (tap, fill, navigate) – no expect
        │  extends pageOf(...)
        ▼
src/core/BasePage.ts       waitUntilLoaded(), isDisplayed(), el, platform handling
        │  receives
        ▼
src/locators/<screen>.ts   selectors per screen, resolved for the current platform
        │  resolves through
        ▼
src/locators/selector.ts   Selector data -> Mobilewright locator (getByTestId, getByRole, ...)
```

A test run, step by step:
1. `mobilewright test --project=ios` reads `mobilewright.config.ts`, picks the iOS device and bundle id,
   and filters tests by tag.
2. Each test receives a `screen` and `platform` from Mobilewright. The fixtures wrap them in page objects.
3. A page object calls `screenLocators(...)`, which resolves each entry to the `ios` override if there is
   one for the current platform, otherwise the shared selector.
4. The spec drives the page (`loginPage.login(...)`) and asserts on exposed locators
   (`expect(loginPage.el.emailError).toBeVisible()`).

## Project layout

```
mobilewright.config.ts      projects, timeouts, device and app ids (the real config)
playwright.config.ts        re-exports the config so the VS Code Playwright extension can find tests
.env.example                environment variables to copy into .env
.mcp.json                   registers the mobile-mcp server for Claude Code
.claude/skills/             mobilewright-test-generator skill
src/
  core/
    BasePage.ts             base page class and pageOf() helper
    EnvironmentManager.ts   reads TEST_ENV (dev | uat | prod, default uat)
    platform.ts             Platform type and byPlatform() helper
  fixtures/index.ts         extends @mobilewright/test with page fixtures
  locators/
    define.ts               screenLocators() – locator map -> per-platform locators
    selector.ts             Selector type and toLocator()
    login.ts home.ts profile.ts tabBar.ts      one file per screen / component
  pages/                    LoginPage, HomePage, ProfilePage, TabBarPage (+ index.ts)
  utils/
    DataUtility.ts          testData.get('file.path')
    dataTypes.ts            shared data types (Credentials)
testdata/
  common/                   defaults used by every environment
  dev/ uat/ prod/           only the keys that differ per environment
tests/                      specs
```

## Setup

Prerequisites: Node.js 22.12+ (required by Mobilewright), Xcode with an iOS simulator (iOS) and/or Android Studio with an emulator
(Android), and the app under test installed on the device.

```bash
cp .env.example .env     # then edit values
npm install
npx mobilewright doctor  # checks the environment
```

`.env` is loaded by `dotenv` from `mobilewright.config.ts`. It is git-ignored.

| Variable | Purpose | Default |
|---|---|---|
| `TEST_ENV` | Data environment: `dev`, `uat`, `prod` | `uat` |
| `TEST_PASSWORD` | Password used by `users.valid` | `changeme` |
| `IOS_BUNDLE_ID` | iOS bundle id | `org.wdiodemoapp` |
| `ANDROID_PACKAGE` | Android package | `com.example.myapp` |
| `IOS_DEVICE_NAME` | Regex matched against simulator names | `iPhone` |
| `ANDROID_DEVICE_NAME` | Regex matched against emulator names | `Pixel\|emulator` |
| `IOS_APP_PATH` / `ANDROID_APP_PATH` | App binaries (only used if `installApps` is enabled) | – |

## Running tests

```bash
npm run typecheck                 # tsc --noEmit
npx mobilewright test --list      # list tests per project, no device needed
npm run test:ios                  # needs a booted simulator + app installed
npm run test:android              # needs a running emulator + app installed
npm run test:smoke                # only tests tagged @smoke
npm run report                    # open the HTML report
TEST_ENV=dev npm run test:ios     # pick the data environment
npx mobilewright inspect          # browser-based element inspector
```

Run a single spec or test:

```bash
npx mobilewright test tests/login-validation.spec.ts --project=ios
npx mobilewright test --grep "short password" --project=ios
```

## Configuration

`mobilewright.config.ts` defines:
- `projects` – `ios` and `android`, each with `platform`, `bundleId`, `deviceName`, and a `grepInvert`
  that applies the platform tags.
- `timeout` 60 s per test, `actionTimeout` 8 s, `expect.timeout` 8 s, `appLaunchTimeout` 30 s.
- `retries` – 1 on CI (`process.env.CI`), otherwise 0.
- `workers: 1` – one device per worker. Raise it only with a device farm.
- `viewTree: 'on-failure'` – captures the accessibility tree when a test fails.
- Reporters: `list` and `html`.

## Writing tests

A spec contains the flow and the assertions, nothing else:

```ts
import { test, expect } from '../src/fixtures';
import { testData } from '../src/utils/DataUtility';
import type { Credentials } from '../src/utils/dataTypes';

const valid = testData.get<Credentials>('users.valid');

test.describe('Login form validation', () => {
  test.beforeEach(async ({ tabBarPage, loginPage }) => {
    await tabBarPage.waitUntilLoaded();
    await tabBarPage.openLogin();
    await loginPage.waitUntilLoaded();
  });

  test('short password is rejected @ios', async ({ loginPage }) => {
    await loginPage.login(valid.username, '123');
    await expect(loginPage.el.passwordError).toBeVisible();
  });
});
```

Rules of thumb:
- `await page.waitUntilLoaded()` when you enter a screen. No fixed sleeps.
- Tests are independent: each one sets up the state it needs.
- Titles describe behaviour, not implementation.
- Never mention the environment in a test.

### Adding a new screen
1. **Locators** – `src/locators/<screen>.ts`:
   ```ts
   import { screenLocators } from './define';

   export const cartLocators = screenLocators({
     anchor:   { testId: 'cart-screen' },
     checkout: { testId: 'cart-checkout' },
   });
   ```
2. **Page** – `src/pages/CartPage.ts`, exported from `src/pages/index.ts`:
   ```ts
   import { pageOf } from '../core/BasePage';
   import { cartLocators } from '../locators/cart';

   export class CartPage extends pageOf(cartLocators) {
     async checkout() {
       await this.loc.checkout.tap();
     }
   }
   ```
3. **Fixture** – add `cartPage` to the `Pages` type and `base.extend` in `src/fixtures/index.ts`.
4. **Spec** – `tests/cart.spec.ts`.

## Locators in depth

A locator entry is plain data. Pick the first stable option from this list:

| Priority | Selector | Example |
|---|---|---|
| 1 | `testId` (accessibility id) | `{ testId: 'input-email' }` |
| 2 | `label` | `{ label: 'Home' }` |
| 3 | `role` + `name` | `{ role: 'button', name: 'Login' }` |
| 4 | `text` (exact) | `{ text: 'Please enter at least 8 characters', exact: true }` |
| 5 | `type` / `placeholder` | `{ placeholder: 'Email' }` |

Per-platform overrides sit next to the shared selector and replace it on that platform only:

```ts
backTab: { label: 'Back', ios: { role: 'button', name: 'Back' } },
```

Notes:
- `screenLocators` rejects unknown keys (a typo such as `iso:` is a compile error).
- `anchor` is optional but strongly recommended. It is the element that proves a screen is
  loaded; `waitUntilLoaded()` and `isDisplayed()` need it and throw a clear error if a page has none.
  Shared components such as a tab bar may omit it, but `tabBarLocators` keeps one.
- When an element has no stable id, use the best selector available, mark it
  `// TODO(gap): needs testID` and ask developers for an id named `<screen>-<element>`.

## Page objects

- Extend `pageOf(<screen>Locators)`; no constructor and no generics needed.
- Expose **actions** (`login`, `openProfile`, `submit`). Never call `expect` inside a page.
- Specs reach locators through `page.el.<name>` when they need to assert on them.
- `BasePage` provides `waitUntilLoaded(timeout = 15 s)`, `isDisplayed()`, `scrollDown(times)`,
  `screenshot()`, and `el`.

## Fixtures

`src/fixtures/index.ts` extends `@mobilewright/test` and exposes each page object as a fixture
(`loginPage`, `homePage`, `profilePage`, `tabBarPage`). Each is created from the `screen` and
`platform` that Mobilewright supplies, so specs never construct pages themselves.

## Test data and environments

```ts
const valid = testData.get<Credentials>('users.valid');
const emails = testData.get<string[]>('loginValidation.badEmails');
```

The first segment is the file name, the rest is a path inside it.

Lookup order, **per key**:
1. `testdata/<TEST_ENV>/<file>.json`
2. `testdata/common/<file>.json`

If both define the same object they are deep-merged and the environment value wins, so an
environment file lists only what differs. For example:

```jsonc
// testdata/common/users.json
{ "valid": { "username": "qa@example.com", "password": "${TEST_PASSWORD:-changeme}" } }

// testdata/uat/users.json
{ "valid": { "username": "qa.uat@example.com" } }   // password still comes from common
```

`${VAR}` and `${VAR:-default}` inside strings read environment variables; an unset variable with no
default throws. Keep secrets in `.env` or CI secrets, never in JSON.

## Platform tags

| Tag on the test | Runs on |
|---|---|
| none | iOS and Android |
| `@ios` | iOS only |
| `@android` | Android only |
| `@ios` + `@android` | both, stated explicitly |
| `@smoke` | selected by `npm run test:smoke`, combine with a platform tag as needed |

The filtering is done per project with `grepInvert` in `mobilewright.config.ts`. The regexes use a
lookahead so a test tagged with both platforms runs on both.

## Generating tests with the MCP skill

`.mcp.json` registers `mobile-mcp`, which exposes a live device's accessibility tree. The skill in
`.claude/skills/mobilewright-test-generator` uses it to turn **steps + acceptance criteria** into code:

1. Read the existing locators, pages, fixtures, data and specs, so nothing is duplicated.
2. Inspect each screen on each target platform and record only interactive or asserted elements.
3. Choose locators by the priority list above; note gaps.
4. Present a test case table and **wait for approval**.
5. Generate locators, pages, fixtures, data and specs.
6. Run `npx tsc --noEmit` and `npx mobilewright test --list`, then execute if a device is available.

Prompt Claude Code with the flow name, the steps/AC, the platforms, and confirm the app is installed
and a device is booted.

## Cloud devices

Mobilewright selects a device through its `driver`. By default it uses a local device
(`MobilecliDriver`). Supported cloud providers, per the Mobilewright documentation:

| Provider | Driver |
|---|---|
| Mobile Next Cloud | `@mobilewright/driver-mobilenext` |
| BrowserStack | `@browserstack/mobilewright` |
| TestingBot | `@testingbot/mobilewright-driver` |

Scaling means raising `workers`; the provider allocates one device per worker, so tests must be
independent. Sauce Labs has no Mobilewright driver.

## Conventions

- Locators live only in `src/locators/`; no raw selectors in pages or specs.
- Pages hold actions; assertions live only in specs.
- Test data only through `testData.get()`. Secrets via `${ENV_VAR}`.
- No `any`, no commented-out code, no dead helpers.
- Do not edit `mobilewright.config.ts`, `src/locators/define.ts`, `src/core/BasePage.ts` or
  `src/utils/DataUtility.ts` as a side effect of writing a test; propose the change instead.
- Do not claim a test passes without running it; say "typechecked and listed, not executed".

## Known gaps

- **Nothing has been executed on a device.** Typecheck and `--list` pass.
- `home.ts` and `profile.ts` use placeholder ids (`home-screen`, `profile-email`, ...) that do not
  exist in the demo app. `login.ts` and `tabBar.ts` match the real accessibility tree.
- The validation messages on the login screen are matched by text; they have no ids
  (proposed `login-email-error`, `login-password-error`).
- `login.spec.ts` and `e2e-user-journey.spec.ts` assert `loginPage.el.error`, which is currently mapped
  to the email-error text, and the app has no generic login-failure element, so these are expected to
  fail until that is resolved.
- The successful-login path has not been inspected or tested.
- `installApps` is commented out in the config; the app must already be on the device.
- No prod guard (for example skipping destructive tests when `TEST_ENV=prod`).
- `DataUtility` has no committed unit test.
- No CI pipeline; `workers: 1`.
- Unconfirmed whether the app is relaunched between tests, so state can leak between specs.

## Troubleshooting

| Symptom | Check |
|---|---|
| No device found | Boot a simulator or emulator, then run `npx mobilewright doctor`. |
| Test cannot find an element | Run `npx mobilewright inspect`, or read the `viewTree` captured on failure, and compare the id with the locator file. |
| `Test data "x" not found` | Check the file name and key path, and that the file exists in `testdata/<env>/` or `testdata/common/`. |
| `Invalid TEST_ENV` | Use `dev`, `uat` or `prod`. |
| `Test data refers to env var X, which is not set` | Set the variable in `.env`, or add a `:-default` in the JSON. |
| A `@ios` test is missing on Android | That is expected; see [Platform tags](#platform-tags). |
