import type { Screen } from 'mobilewright';
import { expect } from '@mobilewright/test';
import type { Platform } from './platform';
import type { Loc } from '../locators/selector';

/**
 * Base class for every page object.
 * Locators come from src/locators/*; the page only holds actions.
 * Each page passes its locator map to super().
 *
 * `anchor` is optional: it is the element that proves the screen is on display, and it is only
 * needed by waitUntilLoaded() / isDisplayed(). Define it on every real screen. Omit it only for
 * shared components (e.g. a tab bar) that have no single element identifying them; calling
 * waitUntilLoaded() / isDisplayed() on such a page throws.
 */
export abstract class BasePage<L extends { anchor?: Loc }> {
  protected readonly loc: L;

  constructor(
    protected readonly screen: Screen,
    protected readonly platform: Platform,
    locators: (screen: Screen, platform: Platform) => L,
  ) {
    this.loc = locators(screen, platform);
  }

  /** Exposed so specs can assert on elements: expect(page.el.error).toBeVisible() */
  get el(): L { return this.loc; }

  async waitUntilLoaded(timeout = 15_000): Promise<this> {
    await expect(this.requireAnchor()).toBeVisible({ timeout });
    return this;
  }

  async isDisplayed(): Promise<boolean> {
    return this.requireAnchor().isVisible();
  }

  private requireAnchor(): Loc {
    const { anchor } = this.loc;
    if (!anchor) throw new Error(`${this.constructor.name} defines no anchor locator`);
    return anchor;
  }

  async scrollDown(times = 1) {
    for (let i = 0; i < times; i++) await this.screen.swipe('up');
  }

  async screenshot() {
    return this.screen.screenshot();
  }
}

/**
 * Bind a screen's locators to a page class, so pages need no generic or constructor:
 *   export class FooPage extends pageOf(fooLocators) { ...actions... }
 */
export function pageOf<L extends { anchor?: Loc }>(locators: (screen: Screen, platform: Platform) => L) {
  return class extends BasePage<L> {
    constructor(screen: Screen, platform: Platform) {
      super(screen, platform, locators);
    }
  };
}
