// ─── CGRF Header ──────────────────────────────
// File:        test/telemetry.test.ts
// Stage:       08_TEST
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/telemetry/datadog.ts, src/telemetry/mobile-rum.ts
// EnumType:    Test
// EnumEdges:   VALIDATES src/telemetry/datadog.ts; VALIDATES src/telemetry/mobile-rum.ts
// DAG Node:    writers.test.telemetry
// Intent:      Verify telemetry is environment-gated and never blocks living-world behavior.
// ──────────────────────────────────────────────

import { describe, expect, it, vi } from 'vitest';
import type { StatsD } from 'hot-shots';

import { createFloorTelemetry, NoopFloorTelemetry } from '../src/telemetry/datadog.js';
import {
  createMobileRumConfiguration,
  initializeMobileRum,
  type MobileRumSdk,
} from '../src/telemetry/mobile-rum.js';

describe('Datadog floor telemetry', () => {
  it('uses no-op telemetry when no agent is configured', async () => {
    const telemetry = createFloorTelemetry({});
    const whitespaceTelemetry = createFloorTelemetry({ DD_AGENT_HOST: '   ' });

    expect(telemetry).toBeInstanceOf(NoopFloorTelemetry);
    expect(whitespaceTelemetry).toBeInstanceOf(NoopFloorTelemetry);
    await expect(telemetry.trace('test', {}, async () => 'ok')).resolves.toBe('ok');
    telemetry.activityHeartbeat(0);
    telemetry.questThroughput('open');
    telemetry.championTransition('idle', 'working');
    telemetry.loreCompilation('success');
    telemetry.eventPublishFailure('citadel.writers.activity');
    await expect(telemetry.close()).resolves.toBeUndefined();
  });

  it('records all custom metric types when DogStatsD is configured', async () => {
    const metrics = {
      gauge: vi.fn(),
      increment: vi.fn(),
      close: vi.fn((callback: () => void) => callback()),
    } as unknown as StatsD;
    const telemetry = createFloorTelemetry({
      DD_AGENT_HOST: '127.0.0.1',
      DD_DOGSTATSD_PORT: '8125',
    }, metrics);

    telemetry.activityHeartbeat(0.5);
    telemetry.questThroughput('closed');
    telemetry.championTransition('working', 'blocked');
    telemetry.loreCompilation('failure');
    telemetry.eventPublishFailure('citadel.writers.quest');
    await expect(telemetry.trace('metric_test', { test: 1 }, async () => 7)).resolves.toBe(7);
    await expect(telemetry.close()).resolves.toBeUndefined();
    expect(metrics.gauge).toHaveBeenCalledWith('writers.floor.activity_level', 0.5);
    expect(metrics.increment).toHaveBeenCalledTimes(4);
  });

  it('swallows metric client exceptions', () => {
    const metrics = {
      gauge: vi.fn(() => {
        throw new Error('offline');
      }),
      increment: vi.fn(),
      close: vi.fn((callback: () => void) => callback()),
    } as unknown as StatsD;
    const telemetry = createFloorTelemetry(
      { DD_AGENT_HOST: '127.0.0.1', DD_DOGSTATSD_PORT: 'invalid' },
      metrics,
    );

    expect(() => telemetry.activityHeartbeat(0.2)).not.toThrow();
  });
});

describe('mobile RUM configuration', () => {
  it('stays disabled when public SDK identifiers are unavailable', async () => {
    const sdk: MobileRumSdk = { initialize: vi.fn() };

    expect(createMobileRumConfiguration({})).toBeNull();
    await expect(initializeMobileRum(sdk, {})).resolves.toBe(false);
    expect(sdk.initialize).not.toHaveBeenCalled();
  });

  it('enables app vitals from runtime configuration', async () => {
    const initialize = vi.fn<MobileRumSdk['initialize']>().mockResolvedValue();
    const sdk: MobileRumSdk = { initialize };
    const environment = {
      DD_RUM_APPLICATION_ID: 'public-app-id',
      DD_RUM_CLIENT_TOKEN: 'public-client-token',
      DD_ENV: 'test',
      APP_VERSION: '2.0.0',
      DD_RUM_SESSION_SAMPLE_RATE: '25',
    };

    await expect(initializeMobileRum(sdk, environment)).resolves.toBe(true);
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'guild-mcp-quill-mobile',
        trackErrors: true,
        trackInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        trackBackgroundEvents: true,
        nativeCrashReportEnabled: true,
        sessionSamplingRate: 25,
      }),
    );
  });

  it('fails soft when the mobile SDK cannot initialize', async () => {
    const sdk: MobileRumSdk = {
      initialize: vi.fn().mockRejectedValue(new Error('offline')),
    };

    await expect(
      initializeMobileRum(sdk, {
        DD_RUM_APPLICATION_ID: 'public-app-id',
        DD_RUM_CLIENT_TOKEN: 'public-client-token',
      }),
    ).resolves.toBe(false);
  });

  it('clamps sampling rates to the SDK range', () => {
    const base = {
      DD_RUM_APPLICATION_ID: 'public-app-id',
      DD_RUM_CLIENT_TOKEN: 'public-client-token',
    };

    expect(
      createMobileRumConfiguration({ ...base, DD_RUM_SESSION_SAMPLE_RATE: '200' })
        ?.sessionSamplingRate,
    ).toBe(100);
    expect(
      createMobileRumConfiguration({ ...base, DD_RUM_SESSION_SAMPLE_RATE: '-2' })
        ?.sessionSamplingRate,
    ).toBe(0);
    expect(
      createMobileRumConfiguration({ ...base, DD_RUM_SESSION_SAMPLE_RATE: 'not-a-number' })
        ?.sessionSamplingRate,
    ).toBe(100);
  });
});
