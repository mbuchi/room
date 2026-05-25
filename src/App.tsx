import { AuthProvider } from './auth/AuthContext';
import MapView from './components/MapView';
import { TourProvider } from './tour/TourProvider';

function App() {
  return (
    <AuthProvider>
      <TourProvider>
        <MapView />
      </TourProvider>
    </AuthProvider>
  );
}

export default App;
