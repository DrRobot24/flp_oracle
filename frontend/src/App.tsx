import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { Login } from "@/pages/Login"
import { Dashboard } from "@/pages/Dashboard"
import { Predictions } from "@/pages/Predictions"
import { Profile } from "@/pages/Profile"
import { Leaderboard } from "@/pages/Leaderboard"
import { About } from "@/pages/About"
import { Privacy } from "@/pages/Privacy"

// Protected Route Component
function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, isAdmin, loading } = useAuth()

  if (loading) return <div className="flex h-screen items-center justify-center font-bold uppercase">Loading MAGOTTO...</div>

  if (!user) return <Navigate to="/login" />

  if (adminOnly && !isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center space-y-4 p-8 text-center">
        <h1 className="text-4xl font-black text-danger">ACCESS DENIED</h1>
        <p>You do not have clearance for this area.</p>
      </div>
    )
  }

  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Dashboard is protected for any logged in user */}
          {/* Protected Main Routes */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/predictions" element={<ProtectedRoute><Predictions /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />

          {/* Public Legal Routes */}
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />

          {/* Admin routes will go here later */}
          {/* <Route path="/upload" element={<ProtectedRoute adminOnly><UploadPage /></ProtectedRoute>} /> */}

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
