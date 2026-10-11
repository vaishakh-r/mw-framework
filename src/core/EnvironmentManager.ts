export const ENVIRONMENTS = ['dev', 'uat', 'prod'] as const;
export type TestEnv = (typeof ENVIRONMENTS)[number];

/**
 * Single source of truth for "which environment are we testing?".
 * Selected with the TEST_ENV variable (shell, CI or .env). Defaults to `uat`.
 * Read lazily so a value set after import is still honoured.
 */
export class EnvironmentManager {
  get current(): TestEnv {
    const raw = (process.env.TEST_ENV ?? 'uat').trim().toLowerCase();
    if (!(ENVIRONMENTS as readonly string[]).includes(raw)) {
      throw new Error(`Invalid TEST_ENV "${raw}". Use one of: ${ENVIRONMENTS.join(', ')}`);
    }
    return raw as TestEnv;
  }
}

export const environment = new EnvironmentManager();
