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

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import EventManagement from './pages/admin/EventManagement';
import PassManagement from './pages/admin/PassManagement';
import TimeSlotManagement from './pages/admin/TimeSlotManagement';
import ReservationManagement from './pages/admin/ReservationManagement';
import Reports from './pages/admin/Reports';
import Communication from './pages/admin/Communication';
import Settings from './pages/admin/Settings';

export default function App() {
  return (
    <Router>
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
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="events" element={<EventManagement />} />
            <Route path="passes" element={<PassManagement />} />
            <Route path="time-slots" element={<TimeSlotManagement />} />
            <Route path="reservations" element={<ReservationManagement />} />
            <Route path="reports" element={<Reports />} />
            <Route path="communication" element={<Communication />} />
            <Route path="settings" element={<Settings />} />
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