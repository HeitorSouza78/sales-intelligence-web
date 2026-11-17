import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AccessCodeGate } from './components/AccessCodeGate';
import { MeetingDetail } from './components/MeetingDetail';
import { MeetingsListPage } from './pages/MeetingsListPage';
import { getStoredToken } from './services/api';

function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    return <Navigate to="/" replace />;
  }
  return <MeetingDetail meetingId={id} />;
}

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    Boolean(getStoredToken()),
  );

  useEffect(() => {
    const handleLock = () => setIsAuthenticated(false);
    window.addEventListener('si:unauthorized', handleLock);
    window.addEventListener('si:logout', handleLock);
    return () => {
      window.removeEventListener('si:unauthorized', handleLock);
      window.removeEventListener('si:logout', handleLock);
    };
  }, []);

  if (!isAuthenticated) {
    return <AccessCodeGate onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MeetingsListPage />} />
        <Route path="/meetings/:id" element={<MeetingDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
