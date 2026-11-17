import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { MeetingDetail } from './components/MeetingDetail';
import { MeetingsListPage } from './pages/MeetingsListPage';

function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    return <Navigate to="/" replace />;
  }
  return <MeetingDetail meetingId={id} />;
}

export function App() {
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
