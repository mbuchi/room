// room's signal (telemetry) client — bound to the app name once here,
// then imported wherever a user action is tracked. The dispatcher and the
// `/api/signal-collect` edge handler both live in @aireon/shared.
import { createSignalClient } from '@aireon/shared';

export const signal = createSignalClient({ appName: 'room' });
