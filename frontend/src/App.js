import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Courses from "@/pages/Courses";
import CourseDetail from "@/pages/CourseDetail";
import Portfolio from "@/pages/Portfolio";
import AdminUsers from "@/pages/AdminUsers";
import AdminCPL from "@/pages/AdminCPL";
import { GraduationCap } from "lucide-react";

function FullLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
      <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center animate-pulse">
        <GraduationCap className="h-7 w-7 text-primary-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">Memuat OBE-LMS…</p>
    </div>
  );
}

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading || user === null) return <FullLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading || user === null) return <FullLoader />;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="App">
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/" element={<Protected><Dashboard /></Protected>} />
              <Route path="/courses" element={<Protected><Courses /></Protected>} />
              <Route path="/courses/:id" element={<Protected><CourseDetail /></Protected>} />
              <Route path="/portfolio" element={<Protected roles={["mahasiswa"]}><Portfolio /></Protected>} />
              <Route path="/admin/users" element={<Protected roles={["admin"]}><AdminUsers /></Protected>} />
              <Route path="/admin/cpl" element={<Protected roles={["admin", "dosen"]}><AdminCPL /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" richColors />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
