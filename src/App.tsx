import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { MeetingDetail } from './components/MeetingDetail';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { MeetingsListPage } from './pages/MeetingsListPage';
import { RegisterPage } from './pages/RegisterPage';

function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    return <Navigate to="/" replace />;
  }
  return <MeetingDetail key={id} meetingId={id} />;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MeetingsListPage />} />
            <Route path="/meetings/:id" element={<MeetingDetailPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
