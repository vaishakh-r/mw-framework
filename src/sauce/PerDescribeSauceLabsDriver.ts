import { test } from '@mobilewright/test';
import { SauceLabsDriver } from '@saucelabs/mobilewright-driver';
import type { AllocatedDevice, AllocationCriteria, ConnectionConfig, Session } from '@mobilewright/protocol';

const PREFIX = 'per-describe:';

/**
 * Sauce Labs driver that gives every test.describe block its own device session.
 *
 * Tests in the same describe (or the same file, outside any describe) share one session; the first test of the
 * next group deletes it and starts a new one. allocate() only hands the pool a placeholder that carries the
 * project's deviceName / osVersion / installApps; the real sessions are created in the worker, in connect().
 * Call PerDescribeSauceLabsDriver.closeAll() at worker teardown to delete the last session.
 */
export class PerDescribeSauceLabsDriver extends SauceLabsDriver {
  private static readonly instances = new Set<PerDescribeSauceLabsDriver>();
  private counter = 0;
  private group?: { key: string; sessionId: string };

  constructor(...args: ConstructorParameters<typeof SauceLabsDriver>) {
    super(...args);
    PerDescribeSauceLabsDriver.instances.add(this);
  }

  /** Deletes the open session of every instance in this process. */
  static async closeAll(): Promise<void> {
    await Promise.all([...PerDescribeSauceLabsDriver.instances].map((d) => d.closeGroup()));
  }

  override async allocate(criteria: AllocationCriteria): Promise<AllocatedDevice> {
    if (!criteria.platform) throw new Error('PerDescribeSauceLabsDriver needs a platform ("ios" or "android")');
    return {
      deviceId: `${PREFIX}${++this.counter}:${encodeURIComponent(JSON.stringify(criteria))}`,
      platform: criteria.platform,
      driver: 'saucelabs-per-describe',
      type: 'real',
      // Each new session installs these in connect() (via super.allocate), so the fixture must not install them:
      // the pool remembers an install per worker slot, not per device, and would skip it on the next session.
      ...(criteria.installApps?.length ? { installedApps: [...criteria.installApps] } : {}),
    };
  }

  override async release(deviceId: string): Promise<void> {
    if (!deviceId.startsWith(PREFIX)) await super.release(deviceId);
  }

  override async connect(config: ConnectionConfig): Promise<Session> {
    if (!config.deviceId?.startsWith(PREFIX)) return super.connect(config);
    const encoded = config.deviceId.slice(config.deviceId.indexOf(':', PREFIX.length) + 1);
    const criteria = JSON.parse(decodeURIComponent(encoded)) as AllocationCriteria;

    // file › describe › ... (the test title dropped): one key per describe block, or per file outside one.
    const key = test.info().titlePath.slice(0, -1).join(' › ');
    if (this.group?.key !== key) {
      await this.closeGroup();
      const { deviceId: sessionId } = await super.allocate(criteria, new Set());
      this.group = { key, sessionId };
    }
    return super.connect({ ...config, deviceId: this.group.sessionId });
  }

  private async closeGroup(): Promise<void> {
    const group = this.group;
    this.group = undefined;
    if (group) await super.release(group.sessionId).catch(() => {});
  }
}
