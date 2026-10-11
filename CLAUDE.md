# Mobilewright POM framework (iOS + Android)

Mobile E2E tests on Mobilewright (Playwright-style runner). One set of specs runs on both
platforms through two projects, `ios` and `android`. See `README.md` for layout and setup.

## Commands
- `npx tsc --noEmit` – typecheck (keep green)
- `npx mobilewright test --list` – list tests per project without a device
- `npm run test:ios` / `test:android` / `test:smoke` – run (needs a booted simulator/emulator + app installed)
- `TEST_ENV=dev npm run test:ios` – pick the data environment
- `npx mobilewright inspect` – browser element inspector; `doctor` – check environment

## Architecture (top to bottom)
- `tests/*.spec.ts` – flow and **assertions only**
- `src/fixtures/index.ts` – injects `loginPage`, `homePage`, `profilePage`
- `src/pages/*Page.ts` – actions only, `class XPage extends pageOf(xLocators)`; no `expect`, no constructor
- `src/locators/<screen>.ts` – one file per screen via `screenLocators({...})`, must have `anchor`;
  shared selector by default, `ios:` / `android:` inline only where the UI differs
- `src/core/EnvironmentManager.ts` – `TEST_ENV` = `dev | uat | prod`, default `uat`
- `src/utils/DataUtility.ts` – `testData.get<T>('file.path')`

## Conventions
- Locator priority: `testId` > `label` > `role+name` > `text` > `type`/`placeholder`.
- Await `page.waitUntilLoaded()` on entering a screen; no hard sleeps.
- Test data only via `testData.get()`. Lookup: `testdata/<env>/<file>.json`, then `testdata/common/`,
  **per key**, objects deep-merged (env wins). Env files list only what differs.
  `${VAR}` / `${VAR:-default}` in strings reads an env var; keep secrets out of JSON.
- Tests never mention the environment.
- Platform tags: `@ios`, `@android`, both, or none (runs everywhere). Filtered per project by
  `grepInvert` in `mobilewright.config.ts`; the regexes use a lookahead so a test tagged with both runs on both.
- Adding a screen: locator file -> page (export in `pages/index.ts`) -> fixture. Use the
  `mobilewright-test-generator` skill (`.claude/skills/`) to generate tests from steps/AC.

## Tooling
- `playwright.config.ts` only re-exports `mobilewright.config.ts` so the VS Code Playwright
  extension can discover tests. Real config stays in `mobilewright.config.ts`.
- `.mcp.json` registers `mobile-mcp` (accessibility tree via a live device).
- `.env` is loaded by `dotenv` from the config; copy `.env.example` to `.env`.

## Status / known gaps
- **Nothing has been executed on a device.** Typecheck and `--list` pass; app ids and `testId`s
  (`login-screen`, `home-welcome`, ...) are placeholders until matched to the real app.
- mobile-mcp package name (`@mobilenext/mobile-mcp`) and the tool names mentioned in the skill
  are from memory and unverified; confirm once the server is connected.
- `installApps` is commented out in the config; the app must already be on the device.
- No prod guard (e.g. skip `@destructive` when `TEST_ENV=prod`).
- `DataUtility` has no committed unit test (was checked with a throwaway script).
- No CI pipeline; `workers: 1`.
- Test data in `testdata/` uses placeholder users (`qa.uat@example.com`, ...).

## Do not
- Edit `mobilewright.config.ts`, `src/locators/define.ts`, `src/core/BasePage.ts` or
  `src/utils/DataUtility.ts` as a side effect of writing a test; propose the change instead.
- Claim a test passes without running it; say "typechecked and listed, not executed".
