import * as fs from 'fs';
import * as path from 'path';
import { environment, type EnvironmentManager } from '../core/EnvironmentManager';

const DEFAULT_ROOT = path.resolve(__dirname, '../../testdata');
const COMMON = 'common';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function deepMerge(base: Obj, over: Obj): Obj {
  const out: Obj = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = out[k];
    out[k] = isObj(b) && isObj(v) ? deepMerge(b, v) : v;
  }
  return out;
}

/** Replace ${VAR} / ${VAR:-default} in strings, so secrets can stay out of the JSON files. */
function expand(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/\$\{(\w+)(?::-([^}]*))?\}/g, (_, name: string, fallback?: string) => {
      const v = process.env[name] ?? fallback;
      if (v === undefined) throw new Error(`Test data refers to env var ${name}, which is not set`);
      return v;
    });
  }
  if (Array.isArray(value)) return value.map(expand);
  if (isObj(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, expand(v)]));
  return value;
}

/**
 * Environment-aware test data lookup.
 *
 *   testData.get('users.valid.username')   // file "users", path "valid.username"
 *
 * Looks in testdata/<env>/users.json first, then testdata/common/users.json.
 * Fallback is per key: anything the env file does not define comes from common.
 * When both define the same object, they are deep-merged (env wins).
 * Tests never mention the environment; EnvironmentManager decides it.
 */
export class DataUtility {
  private readonly cache = new Map<string, unknown>();

  constructor(
    private readonly env: Pick<EnvironmentManager, 'current'> = environment,
    private readonly root: string = DEFAULT_ROOT,
  ) {}

  get<T = unknown>(key: string): T {
    const value = this.find(key);
    if (value === undefined) {
      const file = key.split('.')[0];
      throw new Error(
        `Test data "${key}" not found in testdata/${this.env.current}/${file}.json or testdata/${COMMON}/${file}.json`,
      );
    }
    return value as T;
  }

  has(key: string): boolean {
    return this.find(key) !== undefined;
  }

  private find(key: string): unknown {
    const [file, ...segments] = key.split('.');
    if (!file) throw new Error('Test data key must look like "<file>.<path>"');

    const fromCommon = this.lookup(COMMON, file, segments);
    const fromEnv = this.lookup(this.env.current, file, segments);

    if (isObj(fromCommon) && isObj(fromEnv)) return expand(deepMerge(fromCommon, fromEnv));
    return expand(fromEnv ?? fromCommon);
  }

  private lookup(folder: string, file: string, segments: string[]): unknown {
    let cur: unknown = this.load(folder, file);
    for (const seg of segments) {
      if (typeof cur !== 'object' || cur === null) return undefined;
      cur = (cur as Obj)[seg];
    }
    return cur;
  }

  private load(folder: string, file: string): unknown {
    const full = path.join(this.root, folder, `${file}.json`);
    if (this.cache.has(full)) return this.cache.get(full);

    let parsed: unknown;
    if (fs.existsSync(full)) {
      try {
        parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
      } catch (e) {
        throw new Error(`Invalid JSON in ${full}: ${(e as Error).message}`);
      }
    }
    this.cache.set(full, parsed);
    return parsed;
  }
}

/** Shared instance for specs: import { testData } from '../src/utils/DataUtility' */
export const testData = new DataUtility();
