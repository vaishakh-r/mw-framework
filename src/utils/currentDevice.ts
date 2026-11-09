import type { Device } from 'mobilewright';

let current: Device | undefined;

/** Set by the auto fixture in src/fixtures for the running test. */
export function setCurrentDevice(device: Device | undefined) { current = device; }

export function currentDevice(): Device {
  if (!current) throw new Error('No device for this test: currentDevice() is only available inside a test');
  return current;
}
