import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import ProfileSection from "./pages/dashboard/ProfileSection";
import LinksSection from "./pages/dashboard/LinksSection";
import AppearanceSection from "./pages/dashboard/AppearanceSection";
import AnalyticsSection from "./pages/dashboard/AnalyticsSection";
import PublicProfile from "./pages/PublicProfile";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#111d33",
              color: "#fff",
              border: "1px solid #1e3a5f",
              borderRadius: "12px",
              fontSize: "14px",
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<ProfileSection />} />
            <Route path="links" element={<LinksSection />} />
            <Route path="appearance" element={<AppearanceSection />} />
            <Route path="analytics" element={<AnalyticsSection />} />
          </Route>
          <Route path="/:username" element={<PublicProfile />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
