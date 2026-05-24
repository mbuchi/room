import { AuthProvider } from './auth/AuthContext';
import MapView from './components/MapView';
import { TourProvider } from './tour/TourProvider';
import { I18nProvider } from './contexts/I18nContext';

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <TourProvider>
          <MapView />
        </TourProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
