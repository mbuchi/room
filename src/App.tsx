import { AuthProvider } from './auth/AuthContext';
import MapView from './components/MapView';
import { RoomAccessGate } from './components/RoomAccessGate';
import { TourProvider } from './tour/TourProvider';

function App() {
  return (
    <AuthProvider>
      <RoomAccessGate>
        <TourProvider>
          <MapView />
        </TourProvider>
      </RoomAccessGate>
    </AuthProvider>
  );
}

export default App;
