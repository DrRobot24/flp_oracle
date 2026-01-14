import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { Login } from "@/pages/Login"
import { Dashboard } from "@/pages/Dashboard"

// Protected Route Component
function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, isAdmin, loading } = useAuth()

  if (loading) return <div className="flex h-screen items-center justify-center font-bold uppercase">Loading FLP...</div>

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
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Admin routes will go here later */}
          {/* <Route path="/upload" element={<ProtectedRoute adminOnly><UploadPage /></ProtectedRoute>} /> */}

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
