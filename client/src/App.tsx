import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { HomePage } from './pages/HomePage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { ProfilePage } from './pages/ProfilePage';
import { IslamicToolsPage } from './pages/IslamicToolsPage';
import { ScannerPage } from './pages/ScannerPage';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { NewsPage } from './pages/NewsPage';
import { CommunityPage } from './pages/CommunityPage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import SellerLoginPage from './pages/SellerLoginPage';
import SellerDashboard from './pages/SellerDashboard';
import ProtectedSellerRoute from './components/ProtectedSellerRoute';
import { SellerAuthProvider } from './contexts/SellerAuthContext';
// CampBar Pages
import { CampBarPage } from './pages/campbar/CampBarPage';
import { CreateTripPage } from './pages/campbar/CreateTripPage';
import { TripDetailsPage } from './pages/campbar/TripDetailsPage';
import { EditTripPage } from './pages/campbar/EditTripPage';

function App() {
  return (
    <SellerAuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Seller Routes (Outside AppLayout) */}
          <Route path="/seller/login" element={<SellerLoginPage />} />
          <Route
            path="/seller/dashboard"
            element={
              <ProtectedSellerRoute>
                <SellerDashboard />
              </ProtectedSellerRoute>
            }
          />

          {/* Main App Routes */}
          <Route path="/" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="news" element={<NewsPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="event/:id" element={<EventDetailsPage />} />
            <Route path="marketplace" element={<MarketplacePage />} />
            <Route path="my-orders" element={<MyOrdersPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="islamic-tools" element={<IslamicToolsPage />} />
            <Route path="scanner" element={<ScannerPage />} />
            <Route path="dashboard" element={<OrganizerDashboard />} />

            {/* CampBar Routes */}
            <Route path="campbar" element={<CampBarPage />} />
            <Route path="campbar/trips/new" element={<CreateTripPage />} />
            <Route path="campbar/trips/:id" element={<TripDetailsPage />} />
            <Route path="campbar/trips/:id/edit" element={<EditTripPage />} />

            <Route path="more" element={<div className="p-8 text-center text-gray-500">More Features Coming Soon</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SellerAuthProvider>
  );
}

export default App;
