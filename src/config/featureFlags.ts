const TRUTHY_VALUES = new Set(['1', 'true', 'on', 'yes', 'enable', 'enabled']);
const FALSY_VALUES = new Set([
  '0',
  'false',
  'off',
  'no',
  'disable',
  'disabled',
]);

export type DeploymentEnvironment = 'development' | 'preview' | 'production';
export type FeatureFlagName = 'performanceDashboard';

type FlagDefaults = Record<DeploymentEnvironment, boolean>;

type FlagResolutionSource = 'env' | 'default';

interface FeatureFlagDefinition {
  envKey: string;
  description: string;
  defaults: FlagDefaults;
}

export type FeatureFlagResolution = Readonly<{
  name: FeatureFlagName;
  value: boolean;
  source: FlagResolutionSource;
  envKey: string;
  rawValue?: string;
  defaults: FlagDefaults;
  description: string;
  environment: DeploymentEnvironment;
}>;

const FEATURE_FLAG_DEFINITIONS: Record<FeatureFlagName, FeatureFlagDefinition> =
  {
    performanceDashboard: {
      envKey: 'VITE_FLAG_PERFORMANCE_DASHBOARD',
      description:
        'Enables the performance dashboard UI and Web Vitals instrumentation.',
      defaults: {
        development: true,
        preview: true,
        production: false,
      },
    },
  };

let envOverride: Record<string, string | undefined> | null = null;

const parseBoolean = (rawValue: string | undefined): boolean | null => {
  if (typeof rawValue !== 'string') {
    return null;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (TRUTHY_VALUES.has(normalized)) {
    return true;
  }
  if (FALSY_VALUES.has(normalized)) {
    return false;
  }
  return null;
};

const getEnvironmentVariables = (): Record<string, string | undefined> => {
  if (envOverride) {
    return envOverride;
  }

  return (import.meta.env ?? {}) as Record<string, string | undefined>;
};

const resolveRuntimeEnvironment = (
  env: Record<string, string | undefined>,
): DeploymentEnvironment => {
  const vercelEnv = env.VERCEL_ENV?.toLowerCase();
  if (vercelEnv === 'production' || vercelEnv === 'preview') {
    return vercelEnv;
  }
  if (vercelEnv === 'development') {
    return 'development';
  }

  const mode = env.MODE?.toLowerCase() ?? env.NODE_ENV?.toLowerCase();
  if (mode === 'production') {
    return 'production';
  }
  if (mode === 'preview' || mode === 'staging' || mode === 'canary') {
    return 'preview';
  }

  return 'development';
};

const resolveFeatureFlags = () => {
  const env = getEnvironmentVariables();
  const environment = resolveRuntimeEnvironment(env);

  const values = {} as Record<FeatureFlagName, boolean>;
  const metadata = {} as Record<FeatureFlagName, FeatureFlagResolution>;

  (
    Object.entries(FEATURE_FLAG_DEFINITIONS) as Array<
      [FeatureFlagName, FeatureFlagDefinition]
    >
  ).forEach(([name, definition]) => {
    const rawValue = env[definition.envKey];
    const parsedValue = parseBoolean(rawValue);
    const value = parsedValue ?? definition.defaults[environment];
    const source: FlagResolutionSource =
      parsedValue === null ? 'default' : 'env';

    values[name] = value;
    metadata[name] = Object.freeze({
      name,
      value,
      source,
      envKey: definition.envKey,
      rawValue: typeof rawValue === 'string' ? rawValue : undefined,
      defaults: definition.defaults,
      description: definition.description,
      environment,
    });
  });

  return {
    values: Object.freeze(values) as Readonly<Record<FeatureFlagName, boolean>>,
    metadata: Object.freeze(metadata) as Readonly<
      Record<FeatureFlagName, FeatureFlagResolution>
    >,
    environment,
  };
};

let featureFlagState = resolveFeatureFlags();

export let featureFlags = featureFlagState.values;
export let featureFlagDetails = featureFlagState.metadata;
let runtimeEnvironment = featureFlagState.environment;

export const isFeatureEnabled = (flag: FeatureFlagName): boolean =>
  featureFlags[flag];

export const getFeatureFlagSnapshot = (): FeatureFlagResolution[] =>
  Object.values(featureFlagDetails);

export const getRuntimeEnvironment = (): DeploymentEnvironment =>
  runtimeEnvironment;

/**
 * Testing helper to override environment variables and recompute the feature flags.
 * Only intended for unit tests.
 */
export const __setFeatureFlagEnvironmentForTesting = (
  override: Record<string, string | undefined> | null,
): void => {
  envOverride = override;
  featureFlagState = resolveFeatureFlags();
  featureFlags = featureFlagState.values;
  featureFlagDetails = featureFlagState.metadata;
  runtimeEnvironment = featureFlagState.environment;
};
