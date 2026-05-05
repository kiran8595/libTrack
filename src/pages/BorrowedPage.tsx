import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/database';
import { getEffectiveDueDate, getExtensionsUsed, getDaysUntilDue, isOverdue } from '../db/utils';
import { cancelReminder } from '../db/notifications';

export default function BorrowedPage() {
  const borrows = useLiveQuery(() => db.borrows.filter((b) => !b.isReturned).toArray());
  const books = useLiveQuery(() => db.books.toArray());
  const libraries = useLiveQuery(() => db.libraries.toArray());
  const navigate = useNavigate();

  const getBookTitle = (id: number) => books?.find((b) => b.id === id)?.title || 'Unknown';
  const getLibraryName = (id: number) => libraries?.find((l) => l.id === id)?.name || 'Unknown';

  const overdueBorrows = borrows?.filter((b) => isOverdue(b)) || [];
  const upcomingBorrows = borrows?.filter((b) => !isOverdue(b)) || [];

  const handleReturn = async (borrowId: number) => {
    const borrow = await db.borrows.get(borrowId);
    await db.borrows.update(borrowId, { isReturned: true, returnDate: new Date() });
    cancelReminder(borrowId);
    if (borrow) {
      await db.bookAvailabilities.where('bookId').equals(borrow.bookId).and((a) => a.libraryId === borrow.libraryId).delete();
      await db.books.update(borrow.bookId, { readStatus: 'Finished' });
    }
  };

  return (
    <div className="page">
      <h1>Borrowed Books</h1>

      {(!borrows || borrows.length === 0) && (
        <div className="empty-state">
          <span className="empty-icon">📖</span>
          <p>No borrowed books. Books you borrow will appear here with due date tracking.</p>
        </div>
      )}

      {overdueBorrows.length > 0 && (
        <div className="section">
          <h2 className="section-title text-red">⚠️ Overdue ({overdueBorrows.length})</h2>
          {overdueBorrows.map((borrow) => {
            const daysLeft = getDaysUntilDue(borrow);
            const extensions = getExtensionsUsed(borrow);
            return (
              <div key={borrow.id} className="card borrow-list-card" onClick={() => navigate(`/books/${borrow.bookId}`)}>
                <div className="card-header">
                  <div>
                    <h3>{getBookTitle(borrow.bookId)}</h3>
                    <span className="subtitle">{getLibraryName(borrow.libraryId)}</span>
                  </div>
                  <span className="badge badge-red">OVERDUE</span>
                </div>
                <div className="borrow-meta">
                  <span>Due: {getEffectiveDueDate(borrow).toLocaleDateString()}</span>
                  <span className="text-red">{Math.abs(daysLeft)} day{Math.abs(daysLeft) !== 1 ? 's' : ''} overdue</span>
                </div>
                {extensions > 0 && <span className="text-orange">Renewed {extensions}/{borrow.maxRenewals}</span>}
                <button className="btn-success" onClick={(e) => { e.stopPropagation(); handleReturn(borrow.id!); }}>Return</button>
              </div>
            );
          })}
        </div>
      )}

      {upcomingBorrows.length > 0 && (
        <div className="section">
          <h2 className="section-title">Due Soon ({upcomingBorrows.length})</h2>
          {upcomingBorrows.map((borrow) => {
            const daysLeft = getDaysUntilDue(borrow);
            const extensions = getExtensionsUsed(borrow);
            return (
              <div key={borrow.id} className="card borrow-list-card" onClick={() => navigate(`/books/${borrow.bookId}`)}>
                <div className="card-header">
                  <div>
                    <h3>{getBookTitle(borrow.bookId)}</h3>
                    <span className="subtitle">{getLibraryName(borrow.libraryId)}</span>
                  </div>
                </div>
                <div className="borrow-meta">
                  <span>Due: {getEffectiveDueDate(borrow).toLocaleDateString()}</span>
                  <span className="text-green">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span>
                </div>
                {extensions > 0 && <span className="text-orange">Renewed {extensions}/{borrow.maxRenewals}</span>}
                <button className="btn-success" onClick={(e) => { e.stopPropagation(); handleReturn(borrow.id!); }}>Return</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
