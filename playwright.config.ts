// Lets the "Playwright Test for VS Code" extension (Run / Debug buttons, Testing sidebar)
// discover this project. It only looks for playwright.config.*; the real config stays in
// mobilewright.config.ts, and `npm test` still uses `mobilewright test`.
export { default } from './mobilewright.config';
