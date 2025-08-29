import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layouts
import Layout from './components/Layout';
import AdminLayout from './pages/admin/AdminLayout';

// Public Pages
import Home from './pages/Home';
import EventDetails from './pages/EventDetails';
import EventFAQ from './pages/EventFAQ';
import EventCGV from './pages/EventCGV';
import Cart from './pages/Cart';
import FindTicket from './pages/FindTicket';
import Profile from './pages/Profile';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import EventManagement from './pages/admin/EventManagement';
import PassManagement from './pages/admin/PassManagement';
import TimeSlotManagement from './pages/admin/TimeSlotManagement';
import ActivityManagement from './pages/admin/ActivityManagement';
import ReservationManagement from './pages/admin/ReservationManagement';
import Reports from './pages/admin/Reports';
import Communication from './pages/admin/Communication';
import Settings from './pages/admin/Settings';
import FlowManagement from './pages/admin/FlowManagement';
import ActivityVariantsManagement from './pages/admin/ActivityVariantsManagement';
import UserManagement from './pages/admin/UserManagement';
import ProviderLayout from './pages/provider/ProviderLayout';
import PonyValidation from './pages/provider/PonyValidation';
import ArcheryValidation from './pages/provider/ArcheryValidation';
import LugeValidation from './pages/provider/LugeValidation';
import ProviderStats from './pages/provider/Stats';

export default function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="event/:eventId" element={<EventDetails />} />
            <Route path="event/:eventId/faq" element={<EventFAQ />} />
            <Route path="event/:eventId/cgv" element={<EventCGV />} />
            <Route path="cart" element={<Cart />} />
            <Route path="find-ticket" element={<FindTicket />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="events" element={<EventManagement />} />
            <Route path="activity-variants" element={<ActivityVariantsManagement />} />
            <Route path="activities" element={<ActivityManagement />} />
            <Route path="passes" element={<PassManagement />} />
            <Route path="time-slots" element={<TimeSlotManagement />} />
            <Route path="flow" element={<FlowManagement />} />
            <Route path="reservations" element={<ReservationManagement />} />
            <Route path="reports" element={<Reports />} />
            <Route path="communication" element={<Communication />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Provider Routes */}
          <Route path="/provider" element={<ProviderLayout />}>
            <Route path="pony" element={<PonyValidation />} />
            <Route path="archery" element={<ArcheryValidation />} />
            <Route path="luge" element={<LugeValidation />} />
            <Route path="stats" element={<ProviderStats />} />
          </Route>
        </Routes>

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: '',
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10B981',
              },
            },
            error: {
              style: {
                background: '#EF4444',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}
