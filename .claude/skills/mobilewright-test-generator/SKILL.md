---
name: mobilewright-test-generator
description: Generate Mobilewright tests for this framework from manually supplied steps and acceptance criteria. Inspects the live app's accessibility tree through mobile-mcp to build locators, then writes locators, page objects, fixtures, test data and specs following the project's coding standards. Use when asked to "create/generate a test, locators or page for <feature>", or given steps/AC to automate.
---

# Mobilewright test generator

Turn **steps + acceptance criteria** into working tests for this repo. Locators come from the
real accessibility tree, never from guesses.

## Inputs (ask for anything missing, in one message)

- Feature / flow name
- Steps and acceptance criteria (pasted by the user)
- Platforms: ios, android, or both (default both)
- App installed and a simulator/emulator booted? (needed for step 2)

## Workflow

### 1. Learn the repo first
Read before writing, so nothing is duplicated:
`src/locators/*.ts`, `src/pages/*.ts`, `src/fixtures/index.ts`, `testdata/common/*.json`, `tests/*.spec.ts`.
Reuse an existing screen/page/data key whenever one fits.

### 2. Inspect the real screens
For **each screen** touched by the steps, on **each target platform**:
1. Use mobile-mcp to list elements on screen (e.g. `mobile_list_elements_on_screen`), after navigating there with tap/type tools.
2. Record only interactive and asserted elements: id, label, role/type, text.
3. Do not dump or paste whole trees. Keep what the flow needs.

Fallbacks if mobile-mcp is unavailable: `npx mobilewright inspect`, or ask the user to paste `screen.viewTree()` output. If no tree is available at all, say so and stop. Never invent selectors.

### 3. Decide locators
Priority per element (stop at the first stable one):
1. `testId` (accessibility id) — same on both platforms
2. `label`
3. `role` + `name`
4. `text` (exact)
5. `type`, `placeholder` — last resort

Rules:
- One shared selector by default. Add `ios:` / `android:` **only** where the tree really differs.
- Prefer ids/labels that do not change with copy or locale. Avoid index-based or coordinate selectors.
- Element with no stable identifier -> still pick the best available selector, mark it `// TODO(gap): needs testID`, and list it in the **Gaps** section of the final report with a proposed id (`<screen>-<element>`, kebab-case).

### 4. Test case table — STOP for approval
Present, then wait for the user's OK before writing code:

| ID | Scenario | Steps | Expected | Data keys | Tags | Platforms |
|----|----------|-------|----------|-----------|------|-----------|

Include positive, negative and obvious boundary cases from the AC, but do not pad. Mark which cases are `@smoke`.

### 5. Generate files

Follow the templates exactly. File naming is fixed:

| Artifact | Path | Export |
|---|---|---|
| Locators | `src/locators/<screen>.ts` | `<screen>Locators` |
| Page | `src/pages/<Screen>Page.ts` (+ export in `src/pages/index.ts`) | `<Screen>Page` |
| Fixture | `src/fixtures/index.ts` | `<screen>Page` |
| Data | `testdata/common/<feature>.json` (+ `dev/`, `uat/`, `prod/` only for keys that differ) | — |
| Spec | `tests/<feature>.spec.ts` | — |

**Locators**
```ts
import { screenLocators } from './define';

export const cartLocators = screenLocators({
  anchor:   { testId: 'cart-screen' },                       // required: proves the screen loaded
  checkout: { testId: 'cart-checkout' },
  backTab:  { label: 'Back', ios: { role: 'button', name: 'Back' } }, // override only if it differs
});
```

**Page** — actions only, no assertions, no `expect`
```ts
import { pageOf } from '../core/BasePage';
import { cartLocators } from '../locators/cart';

export class CartPage extends pageOf(cartLocators) {
  async checkout() {
    await this.loc.checkout.tap();
  }
}
```

**Spec** — assertions live here; data via `testData`, never hard-coded; steps via `test.step`
```ts
import { test, expect } from '../src/fixtures';
import { testData } from '../src/utils/DataUtility';
import type { Credentials } from '../src/utils/dataTypes';

const valid = testData.get<Credentials>('users.valid');

test.describe('Cart', () => {
  test('user can check out @smoke', async ({ loginPage, homePage, cartPage }) => {
    await test.step('sign in', async () => {
      await loginPage.waitUntilLoaded();
      await loginPage.login(valid.username, valid.password);
      await homePage.waitUntilLoaded();
    });
    await test.step('open cart and check out', async () => {
      await cartPage.waitUntilLoaded();
      await cartPage.checkout();
      await expect(cartPage.el.anchor).toBeHidden();
    });
  });
});
```

### 6. Verify
Run and report real output, do not claim success without it:
```bash
npx tsc --noEmit
npx mobilewright test --list          # new tests appear on the intended projects only
npm run test:ios                      # and test:android, if a device is available
```
If a device is not available, say the tests were typechecked and listed but **not executed**.

## Coding standards (non-negotiable)

- Pages hold actions; **assertions only in specs** (`expect(page.el.x)...`).
- Always `await page.waitUntilLoaded()` when entering a screen; **no hard sleeps** or fixed timeouts.
- Locators: only in `src/locators/`; no raw selectors in pages or specs.
- Test data: only via `testData.get()`; secrets via `${ENV_VAR}` in JSON, never literal. Tests must not mention environments.
- Platform filtering through tags: `@ios`, `@android`, both, or none. Test titles describe behaviour, not implementation.
- Tests are independent: each one sets up its own state; no reliance on order.
- No `any`, no commented-out code, no dead helpers. Match surrounding style.
- Never edit `mobilewright.config.ts`, `define.ts`, `BasePage.ts` or `DataUtility.ts` as part of generating a test; propose changes instead.

## Final report format

1. **Files** created/changed (paths)
2. **Test cases** (the approved table)
3. **Locator decisions**: element -> selector, and which platform overrides were needed
4. **Gaps**: elements lacking stable ids + proposed ids for developers
5. **Verification**: commands run and their real results; what was *not* run
