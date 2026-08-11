import type { ReactNode } from 'react';
import { AppAccessGate } from '@aireon/shared';
import { AppShellSkeleton } from './AppShellSkeleton';

export function RoomAccessGate({ children }: { children: ReactNode }) {
  return (
    <AppAccessGate
      appId="room"
      defaultAccess="public"
      loadingFallback={<AppShellSkeleton />}
    >
      {children}
    </AppAccessGate>
  );
}
