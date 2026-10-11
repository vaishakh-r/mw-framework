import type { Screen } from 'mobilewright';
import type { Platform } from '../core/platform';
import { toLocator, type Loc, type Selector } from './selector';

/** A selector, optionally with per-platform replacements. */
export type Entry = Selector & Partial<Record<Platform, Selector>>;

type AllowedKey = 'testId' | 'label' | 'text' | 'exact' | 'role' | 'name' | 'type' | 'placeholder' | Platform;
/** Rejects unknown keys on an entry (e.g. a typo such as `iso:`). */
type NoExtraKeys<M> = { [K in keyof M]: { [P in Exclude<keyof M[K], AllowedKey>]: never } };

/**
 * Define the locators for one screen.
 *
 *   profileTab: { label: 'Profile', ios: { role: 'tab', name: 'Profile' } }
 *
 * The plain selector is used everywhere; `ios:` / `android:` replace it on that platform only.
 * A screen should define an `anchor` (the element that proves the screen is loaded);
 * it is optional, but waitUntilLoaded() / isDisplayed() need it.
 */
export function screenLocators<M extends Record<string, Entry>>(map: M & NoExtraKeys<M>) {
  return (screen: Screen, platform: Platform): { [K in keyof M]: Loc } => {
    const out = {} as { [K in keyof M]: Loc };
    for (const key of Object.keys(map) as (keyof M)[]) {
      const { ios, android, ...base } = map[key];
      const selector = ({ ios, android } as Partial<Record<Platform, Selector>>)[platform] ?? (base as unknown as Selector);
      out[key] = toLocator(screen, selector);
    }
    return out;
  };
}
