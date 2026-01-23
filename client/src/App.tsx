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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="community" element={<CommunityPage />} />
          <Route path="event/:id" element={<EventDetailsPage />} />
          <Route path="marketplace" element={<MarketplacePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="islamic-tools" element={<IslamicToolsPage />} />
          <Route path="scanner" element={<ScannerPage />} />
          <Route path="dashboard" element={<OrganizerDashboard />} />

          <Route path="more" element={<div className="p-8 text-center text-gray-500">More Features Coming Soon</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
