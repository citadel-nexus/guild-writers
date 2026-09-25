// ─── CGRF Header ──────────────────────────────
// File:        src/telemetry/mobile-rum.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     service.datadog.yaml
// EnumType:    Adapter
// EnumEdges:   DEPENDS_ON service.datadog.yaml; PRODUCES guild-mcp-quill
// DAG Node:    writers.telemetry.mobile_rum
// Intent:      Configure mobile app vitals from runtime values while disabling RUM when identifiers are absent.
// ──────────────────────────────────────────────

export interface MobileRumConfiguration {
  applicationId: string;
  clientToken: string;
  env: string;
  service: 'guild-mcp-quill-mobile';
  version: string;
  trackErrors: true;
  trackInteractions: true;
  trackResources: true;
  trackLongTasks: true;
  trackBackgroundEvents: true;
  nativeCrashReportEnabled: true;
  sessionSamplingRate: number;
}

export interface MobileRumSdk {
  initialize(configuration: MobileRumConfiguration): Promise<void>;
}

function samplingRate(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 100;
}

/** Build the official mobile SDK configuration from runtime values. */
export function createMobileRumConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): MobileRumConfiguration | null {
  const applicationId = environment.DD_RUM_APPLICATION_ID?.trim();
  const clientToken = environment.DD_RUM_CLIENT_TOKEN?.trim();
  if (
    applicationId === undefined ||
    applicationId.length === 0 ||
    clientToken === undefined ||
    clientToken.length === 0
  ) {
    return null;
  }

  return {
    applicationId,
    clientToken,
    env: environment.DD_ENV?.trim() || 'development',
    service: 'guild-mcp-quill-mobile',
    version: environment.APP_VERSION?.trim() || '0.1.0',
    trackErrors: true,
    trackInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    trackBackgroundEvents: true,
    nativeCrashReportEnabled: true,
    sessionSamplingRate: samplingRate(environment.DD_RUM_SESSION_SAMPLE_RATE),
  };
}

/** Initialize the mobile RUM SDK, returning false when disabled or unavailable. */
export async function initializeMobileRum(
  sdk: MobileRumSdk,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  const configuration = createMobileRumConfiguration(environment);
  if (configuration === null) {
    return false;
  }

  try {
    await sdk.initialize(configuration);
    return true;
  } catch (error: unknown) {
    console.warn('writers_mobile_rum_unavailable', {
      error_name: error instanceof Error ? error.name : 'UnknownError',
    });
    return false;
  }
}
