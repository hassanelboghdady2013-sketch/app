import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import ProfileSection from "./pages/dashboard/ProfileSection";
import LinksSection from "./pages/dashboard/LinksSection";
import CardSection from "./pages/dashboard/CardSection";
import AppearanceSection from "./pages/dashboard/AppearanceSection";
import AnalyticsSection from "./pages/dashboard/AnalyticsSection";
import AdminCodes from "./pages/admin/AdminCodes";
import PublicProfile from "./pages/PublicProfile";
import PublicCard from "./pages/PublicCard";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--color-card-hi)",
              color: "var(--color-fg)",
              border: "1px solid var(--color-line-strong)",
              borderRadius: "12px",
              fontSize: "14px",
              boxShadow: "0 8px 24px -12px rgba(0,0,0,0.4)",
            },
            success: { iconTheme: { primary: "var(--color-success)", secondary: "var(--color-fg)" } },
            error: { iconTheme: { primary: "var(--color-danger)", secondary: "var(--color-fg)" } },
          }}
        />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
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
            <Route path="card" element={<CardSection />} />
            <Route path="appearance" element={<AppearanceSection />} />
            <Route path="analytics" element={<AnalyticsSection />} />
          </Route>
          <Route
            path="/admin/codes"
            element={
              <AdminRoute>
                <AdminCodes />
              </AdminRoute>
            }
          />
          {/* /card/:username must come before the catch-all
              /:username route so a username of "card" can't shadow
              the standalone card page. */}
          <Route path="/card/:username" element={<PublicCard />} />
          <Route path="/:username" element={<PublicProfile />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
