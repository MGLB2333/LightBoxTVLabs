import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Integrations from './pages/Integrations'
import Login from './pages/Login'
import Signup from './pages/Signup'
import MyOrganizations from './pages/MyOrganizations'
import ProtectedRoute from './components/ProtectedRoute'
import Campaigns from "./pages/Campaigns";
import AnalyticsLayout from './pages/analytics';
import { AnalyticsFilterProvider } from './components/layout/AnalyticsFilterContext';
import Overview from './pages/analytics/Overview';
import Inventory from './pages/analytics/Inventory';
import Content from './pages/analytics/Content';
import SupplyPath from './pages/analytics/SupplyPath';
import Audience from './pages/analytics/Audience';
import Reach from './pages/analytics/Reach';
import YouTubeAnalytics from './pages/analytics/YouTube';
import YouTubeCuration from './pages/YouTubeCuration';
import TVIntelligence from './pages/TVIntelligence';
import TVDeliveryMonitor from './pages/TVDeliveryMonitor';
import BARBDataPuller from './pages/BARBDataPuller';
import IncrementalReach from './pages/IncrementalReach';
import LightBoxTVAI from './pages/LightBoxTVAI';
import Documentation from './pages/Documentation';
import AudienceBuilder from './pages/AudienceBuilder';
import GoogleAdsCallback from './pages/GoogleAdsCallback';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/google-ads/callback" element={<GoogleAdsCallback />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/analytics" replace />} />
          <Route path="analytics" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
          <Route path="campaigns/:campaignId/analytics" element={
            <AnalyticsFilterProvider>
              <AnalyticsLayout />
            </AnalyticsFilterProvider>
          } />
          <Route path="analytics-insights/*" element={
            <AnalyticsFilterProvider>
              <AnalyticsLayout />
            </AnalyticsFilterProvider>
          }>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<Overview />} />
            <Route path="youtube" element={<YouTubeAnalytics />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="content" element={<Content />} />
            <Route path="supply-path" element={<SupplyPath />} />
            <Route path="audience" element={<Audience />} />
            <Route path="reach" element={<Reach />} />
          </Route>
          <Route path="integrations" element={<Integrations />} />
          <Route path="youtube-curation" element={<YouTubeCuration />} />
                      <Route path="tv-intelligence" element={<TVIntelligence />} />
            <Route path="tv-delivery-monitor" element={<TVDeliveryMonitor />} />
            <Route path="barb-data-puller" element={<BARBDataPuller />} />
          <Route path="incremental-reach" element={<IncrementalReach />} />
          <Route path="my-organizations" element={<MyOrganizations />} />
          <Route path="lightboxtv-ai" element={<LightBoxTVAI />} />
          <Route path="audience-builder" element={<AudienceBuilder />} />
          <Route path="audience-builder/uber" element={<AudienceBuilder />} />
          <Route path="audience-builder/ai" element={<AudienceBuilder />} />
          <Route path="documentation">
            <Route index element={<Documentation />} />
            <Route path=":section" element={<Documentation />} />
            <Route path=":section/:subsection" element={<Documentation />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  )
}

export default App
