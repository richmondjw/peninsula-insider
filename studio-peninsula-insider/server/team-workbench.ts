import type express from 'express';
import { z } from 'zod';

export const TEAM_MODE_ENV_VAR = 'PI_FOUNDRY_TEAM_MODE';
export const TEAM_MODE_ENABLED_VALUE = 'enabled';

export type TeamWorkbenchMode = 'local' | 'team';

export interface TeamWorkbenchConfig {
  readonly mode: TeamWorkbenchMode;
  readonly teamModeEnabled: boolean;
  readonly testOnlyIdentityAllowed: boolean;
}

/**
 * Team mode is opt-in through one exact literal. Every other value, including
 * 'true', '1', 'ENABLED' and an unset variable, resolves to the local default.
 */
export function resolveTeamWorkbenchConfig(environment: NodeJS.ProcessEnv = process.env): TeamWorkbenchConfig {
  const mode: TeamWorkbenchMode = environment[TEAM_MODE_ENV_VAR] === TEAM_MODE_ENABLED_VALUE ? 'team' : 'local';
  const runtime = environment.NODE_ENV ?? 'development';
  return Object.freeze({
    mode,
    teamModeEnabled: mode === 'team',
    testOnlyIdentityAllowed: runtime === 'test' || environment.VITEST === 'true',
  });
}

/**
 * Identity-bearing request headers are trivially forgeable by any client that
 * can reach the loopback service, so team mode refuses requests carrying them
 * rather than reading them.
 */
export const UNTRUSTED_IDENTITY_HEADERS: readonly string[] = Object.freeze([
  'x-foundry-actor',
  'x-foundry-identity',
  'x-foundry-user',
  'x-actor',
  'x-user',
  'x-user-id',
  'x-user-email',
  'x-remote-user',
  'x-forwarded-user',
  'x-forwarded-email',
  'x-auth-request-user',
  'x-auth-request-email',
  'x-authenticated-user',
  'x-on-behalf-of',
]);

/** Body fields that record who acted. In team mode the server owns their value. */
const IDENTITY_BODY_FIELDS: readonly string[] = Object.freeze(['actor', 'reviewer', 'editor', 'confirmedBy']);

const IdentityClaimSchema = z.object({
  actorId: z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._:@-]*$/),
  displayName: z.string().min(1).max(200).optional(),
}).strict();

export type TeamIdentityClaim = z.infer<typeof IdentityClaimSchema>;

export type VerifiedIdentitySource = 'server_owned_verifier' | 'test_injected_identity';

export interface VerifiedTeamIdentity {
  readonly actorId: string;
  readonly displayName: string;
  readonly verifiedBy: VerifiedIdentitySource;
}

export type TeamIdentityVerifier = (
  request: express.Request,
) => TeamIdentityClaim | null | undefined | Promise<TeamIdentityClaim | null | undefined>;

export interface TeamWorkbenchIdentityOptions {
  /** Server-owned verification. The only identity source accepted outside tests. */
  readonly verifyIdentity?: TeamIdentityVerifier;
  /** Test-only injected identity. Rejected unless the runtime is a test runtime. */
  readonly testOnlyIdentity?: TeamIdentityVerifier;
}

const verifiedIdentities = new WeakMap<express.Request, VerifiedTeamIdentity>();

export function getVerifiedIdentity(request: express.Request): VerifiedTeamIdentity | undefined {
  return verifiedIdentities.get(request);
}

/** Team mode protects every method that is not a plain GET read. */
export function isProtectedTeamMethod(method: string): boolean {
  return method.toUpperCase() !== 'GET';
}

export interface TeamWorkbenchCapabilities {
  readonly mode: TeamWorkbenchMode;
  readonly enabled: boolean;
  readonly identitySource: 'server_verified_middleware' | 'test_injected_identity' | 'local_single_operator';
  readonly trustsIdentityHeaders: false;
  readonly protectedMethods: 'all_non_get' | 'none';
  readonly sharedTenancy: false;
  readonly remoteAccess: false;
}

export interface TeamWorkbench {
  readonly config: TeamWorkbenchConfig;
  readonly capabilities: TeamWorkbenchCapabilities;
  /** Undefined in local mode, where no identity gate is mounted at all. */
  readonly requireVerifiedIdentity?: express.RequestHandler;
}

function deny(response: express.Response, status: number, code: string) {
  return response.status(status).json({ error: { code } });
}

export function createTeamWorkbench(
  config: TeamWorkbenchConfig,
  options: TeamWorkbenchIdentityOptions = {},
): TeamWorkbench {
  const { verifyIdentity, testOnlyIdentity } = options;
  if (testOnlyIdentity && !config.testOnlyIdentityAllowed) {
    throw new Error('The injected Workbench identity callback is test-only');
  }
  if (verifyIdentity && testOnlyIdentity) {
    throw new Error('Configure either the server-owned identity verifier or the test-only identity callback');
  }

  if (config.mode === 'local') {
    if (verifyIdentity || testOnlyIdentity) throw new Error('Workbench identity verification requires team mode');
    return Object.freeze({
      config,
      capabilities: Object.freeze({
        mode: 'local' as const,
        enabled: false,
        identitySource: 'local_single_operator' as const,
        trustsIdentityHeaders: false as const,
        protectedMethods: 'none' as const,
        sharedTenancy: false as const,
        remoteAccess: false as const,
      }),
    });
  }

  const verifier = verifyIdentity ?? testOnlyIdentity;
  if (!verifier) throw new Error('Team mode requires a server-owned verified identity middleware');
  const verifiedBy: VerifiedIdentitySource = verifyIdentity ? 'server_owned_verifier' : 'test_injected_identity';

  const requireVerifiedIdentity: express.RequestHandler = (request, response, next) => {
    for (const header of UNTRUSTED_IDENTITY_HEADERS) {
      if (request.get(header) !== undefined) return deny(response, 403, 'untrusted_identity_header');
    }
    void (async () => {
      let claim: TeamIdentityClaim;
      try {
        const resolved = await verifier(request);
        if (resolved === null || resolved === undefined) return deny(response, 401, 'team_identity_required');
        claim = IdentityClaimSchema.parse(resolved);
      } catch {
        return deny(response, 401, 'team_identity_unverified');
      }
      const identity: VerifiedTeamIdentity = Object.freeze({
        actorId: claim.actorId,
        displayName: claim.displayName ?? claim.actorId,
        verifiedBy,
      });
      verifiedIdentities.set(request, identity);
      if (request.body && typeof request.body === 'object' && !Array.isArray(request.body)) {
        const body = request.body as Record<string, unknown>;
        body.actor = identity.actorId;
        for (const field of IDENTITY_BODY_FIELDS) {
          if (field in body) body[field] = identity.actorId;
        }
      }
      return next();
    })();
  };

  return Object.freeze({
    config,
    capabilities: Object.freeze({
      mode: 'team' as const,
      enabled: true,
      identitySource: verifyIdentity ? ('server_verified_middleware' as const) : ('test_injected_identity' as const),
      trustsIdentityHeaders: false as const,
      protectedMethods: 'all_non_get' as const,
      sharedTenancy: false as const,
      remoteAccess: false as const,
    }),
    requireVerifiedIdentity,
  });
}
