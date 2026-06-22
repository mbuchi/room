import type { ReactNode } from 'react';
import { AppAccessGate, useAppAccess } from '@aireon/shared';
import { AppShellSkeleton } from './AppShellSkeleton';

export function RoomAccessGate({ children }: { children: ReactNode }) {
  const { decision } = useAppAccess('room', 'public');
  return (
    <>
      <AppAccessGate appId="room" defaultAccess="public">
        {children}
      </AppAccessGate>
      {decision === 'loading' && <AppShellSkeleton overlay />}
    </>
  );
}
