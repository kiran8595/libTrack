import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useEffect } from 'react';
import BooksPage from './pages/BooksPage';
import BookDetailPage from './pages/BookDetailPage';
import BorrowedPage from './pages/BorrowedPage';
import HoldsPage from './pages/HoldsPage';
import LibrariesPage from './pages/LibrariesPage';
import { requestNotificationPermission } from './db/notifications';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/database';
import { isOverdue } from './db/utils';

const BASE = '/libTrack/';

export default function App() {
  const borrows = useLiveQuery(() => db.borrows.where('isReturned').equals(0).toArray());
  const holds = useLiveQuery(() => db.holds.where('isFulfilled').equals(0).toArray());

  const overdueCount = borrows?.filter((b) => isOverdue(b)).length || 0;
  const holdsCount = holds?.length || 0;

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <BrowserRouter basename={BASE}>
      <div className="app">
        <main className="main-content">
          <Routes>
            <Route path="/" element={<BooksPage />} />
            <Route path="/books" element={<BooksPage />} />
            <Route path="/books/:id" element={<BookDetailPage />} />
            <Route path="/borrowed" element={<BorrowedPage />} />
            <Route path="/holds" element={<HoldsPage />} />
            <Route path="/libraries" element={<LibrariesPage />} />
          </Routes>
        </main>

        <nav className="tab-bar">
          <NavLink to="/books" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
            <span className="tab-icon">📚</span>
            <span className="tab-label">Books</span>
          </NavLink>
          <NavLink to="/borrowed" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
            <span className="tab-icon">📖</span>
            <span className="tab-label">Borrowed</span>
            {overdueCount > 0 && <span className="tab-badge">{overdueCount}</span>}
          </NavLink>
          <NavLink to="/holds" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
            <span className="tab-icon">⏳</span>
            <span className="tab-label">Holds</span>
            {holdsCount > 0 && <span className="tab-badge badge-orange">{holdsCount}</span>}
          </NavLink>
          <NavLink to="/libraries" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
            <span className="tab-icon">🏛️</span>
            <span className="tab-label">Libraries</span>
          </NavLink>
        </nav>
      </div>
    </BrowserRouter>
  );
}
