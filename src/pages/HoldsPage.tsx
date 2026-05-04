import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/database';
import { getWeeksOnHold, getDaysOnHold } from '../db/utils';

export default function HoldsPage() {
  const holds = useLiveQuery(() => db.holds.filter((h) => !h.isFulfilled).toArray());
  const books = useLiveQuery(() => db.books.toArray());
  const libraries = useLiveQuery(() => db.libraries.toArray());
  const navigate = useNavigate();

  const getBookTitle = (id: number) => books?.find((b) => b.id === id)?.title || 'Unknown';
  const getLibraryName = (id: number) => libraries?.find((l) => l.id === id)?.name || 'Unknown';

  const handleFulfill = async (holdId: number) => {
    await db.holds.update(holdId, { isFulfilled: true, fulfilledDate: new Date() });
  };

  const handleUpdatePosition = async (holdId: number) => {
    const pos = prompt('Enter new queue position (0 = unknown):');
    if (pos !== null) {
      await db.holds.update(holdId, { queuePosition: Number(pos) || 0 });
    }
  };

  return (
    <div className="page">
      <h1>Holds</h1>

      {(!holds || holds.length === 0) && (
        <div className="empty-state">
          <span className="empty-icon">⏳</span>
          <p>No active holds. Books you place on hold will appear here.</p>
        </div>
      )}

      <div className="list">
        {holds?.map((hold) => {
          const weeks = getWeeksOnHold(hold.holdDate);
          const days = getDaysOnHold(hold.holdDate);
          return (
            <div key={hold.id} className="card" onClick={() => navigate(`/books/${hold.bookId}`)}>
              <div className="card-header">
                <div>
                  <h3>{getBookTitle(hold.bookId)}</h3>
                  <span className="subtitle">{getLibraryName(hold.libraryId)}</span>
                </div>
                <span className="badge badge-orange">ON HOLD</span>
              </div>
              <div className="hold-meta">
                {hold.queuePosition > 0 && <span>Queue: #{hold.queuePosition}</span>}
                <span className="text-orange">
                  {weeks > 0 ? `${weeks}w ${days % 7}d on hold` : `${days}d on hold`}
                </span>
              </div>
              <div className="hold-actions">
                <button className="btn-small" onClick={(e) => { e.stopPropagation(); handleUpdatePosition(hold.id!); }}>Update Position</button>
                <button className="btn-success" onClick={(e) => { e.stopPropagation(); handleFulfill(hold.id!); }}>Fulfilled</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
