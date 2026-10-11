export type Platform = 'ios' | 'android';

/** Pick a value per platform. Use for locators that genuinely differ. */
export function byPlatform<T>(platform: Platform, values: Record<Platform, T>): T {
  return values[platform];
}
