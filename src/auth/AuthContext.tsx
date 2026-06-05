import type { ReactNode } from 'react';
import { AuthProvider as SharedAuthProvider, useAuth as useSharedAuth } from '@aireon/shared';

// OIDC auth (provider, hook, userManager) and the login UI come from
// @aireon/shared. This file is a thin wrapper that re-exposes the shared
// auth state so existing useAuth() callers keep working.

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SharedAuthProvider
      appName="room"
      loginPromptOnFirstVisit
      loginDescription="Create a free account or sign in to save zone comparisons and unlock the full experience."
      loginFeatures={[
        { label: 'Zoning density distributions across every Swiss municipality' },
        { label: 'Save and revisit parcel comparisons' },
        { label: 'Export zone snapshots to Showroom', locked: true },
        { label: 'Team sharing & dashboards', locked: true },
      ]}
    >
      {children}
    </SharedAuthProvider>
  );
}

/**
 * Shared auth state. `avatarUrl` is an alias of the shared `picture` field
 * for legacy callers. `accessToken` is the synchronously-resolved bearer
 * token (or null) — used wherever room hits authed RES endpoints.
 */
export function useAuth() {
  const auth = useSharedAuth();
  return {
    ...auth,
    avatarUrl: auth.picture ?? '',
    accessToken: auth.getAccessToken() ?? null,
  };
}
