import { AppAccessGate } from '@aireon/shared';
import { AuthProvider } from './auth/AuthContext';
import MapView from './components/MapView';
import { TourProvider } from './tour/TourProvider';

function App() {
  return (
    <AuthProvider>
      <AppAccessGate appId="room" defaultAccess="public">
        <TourProvider>
          <MapView />
        </TourProvider>
      </AppAccessGate>
    </AuthProvider>
  );
}

export default App;
