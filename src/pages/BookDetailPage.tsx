import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db, type Location } from '../db/database';
import { getEffectiveDueDate, getExtensionsUsed, getDaysUntilDue, isOverdue, getWeeksOnHold, getDaysOnHold } from '../db/utils';
import { scheduleDueReminder, cancelReminder } from '../db/notifications';

export default function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bookId = Number(id);

  const book = useLiveQuery(() => db.books.get(bookId), [bookId]);
  const availabilities = useLiveQuery(() => db.bookAvailabilities.where('bookId').equals(bookId).toArray(), [bookId]);
  const borrows = useLiveQuery(() => db.borrows.where('bookId').equals(bookId).toArray(), [bookId]);
  const holds = useLiveQuery(() => db.holds.where('bookId').equals(bookId).toArray(), [bookId]);
  const libraries = useLiveQuery(() => db.libraries.toArray());
  const locations = useLiveQuery(() => db.locations.toArray());

  const [showBorrowForm, setShowBorrowForm] = useState(false);
  const [showHoldForm, setShowHoldForm] = useState(false);
  const [showAvailForm, setShowAvailForm] = useState(false);

  if (!book) return <div className="page"><p>Loading...</p></div>;

  const activeBorrow = borrows?.find((b) => !b.isReturned);
  const activeHolds = holds?.filter((h) => !h.isFulfilled) || [];

  const handleReturn = async (borrowId: number) => {
    await db.borrows.update(borrowId, { isReturned: true, returnDate: new Date() });
    cancelReminder(borrowId);
  };

  const handleFulfillHold = async (holdId: number) => {
    await db.holds.update(holdId, { isFulfilled: true, fulfilledDate: new Date() });
  };

  const handleDelete = async () => {
    if (!confirm('Delete this book and all its records?')) return;
    await db.bookAvailabilities.where('bookId').equals(bookId).delete();
    await db.borrows.where('bookId').equals(bookId).delete();
    await db.holds.where('bookId').equals(bookId).delete();
    await db.books.delete(bookId);
    navigate('/books');
  };

  const getLibraryName = (id: number) => libraries?.find((l) => l.id === id)?.name || 'Unknown';
  const getLocationName = (id?: number) => id ? locations?.find((l) => l.id === id)?.name : undefined;

  return (
    <div className="page">
      <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>

      <div className="card">
        <div className="card-header">
          <h2>{book.title}</h2>
          <button className="btn-icon" onClick={handleDelete}>🗑️</button>
        </div>
        {book.author && <p className="detail-row"><strong>Author:</strong> {book.author}</p>}
        {book.isbn && <p className="detail-row"><strong>ISBN:</strong> {book.isbn}</p>}
        {book.genre && <p className="detail-row"><strong>Genre:</strong> {book.genre}</p>}
        <p className="detail-row"><strong>Status:</strong>
          <select
            className="inline-select"
            value={book.readStatus}
            onChange={(e) => db.books.update(bookId, { readStatus: e.target.value as any })}
          >
            <option value="Want to Read">Want to Read</option>
            <option value="Reading">Reading</option>
            <option value="Finished">Finished</option>
          </select>
        </p>
        {book.notes && <p className="detail-row"><strong>Notes:</strong> {book.notes}</p>}
      </div>

      {/* Library Availability */}
      <div className="card">
        <div className="card-header">
          <h3>Library Availability</h3>
          <button className="btn-small" onClick={() => setShowAvailForm(true)}>+ Add</button>
        </div>
        {availabilities?.length === 0 && <p className="muted">Not tracked in any library</p>}
        {availabilities?.map((avail) => (
          <div key={avail.id} className="avail-item">
            <strong>{getLibraryName(avail.libraryId)}</strong>
            {getLocationName(avail.locationId) && <span> — {getLocationName(avail.locationId)}</span>}
            <div className="avail-details">
              {avail.category && <span>📁 {avail.category}</span>}
              {avail.shelfRow && <span>📍 Row: {avail.shelfRow}</span>}
              {avail.callNumber && <span># {avail.callNumber}</span>}
            </div>
          </div>
        ))}
        {showAvailForm && <AvailabilityForm bookId={bookId} onClose={() => setShowAvailForm(false)} />}
      </div>

      {/* Borrow Status */}
      <div className="card">
        <div className="card-header">
          <h3>Borrow Status</h3>
        </div>
        {activeBorrow ? (
          <BorrowCard borrow={activeBorrow} libraryName={getLibraryName(activeBorrow.libraryId)} onReturn={() => handleReturn(activeBorrow.id!)} />
        ) : (
          <>
            <p className="muted">Not currently borrowed</p>
            <button className="btn-small" onClick={() => setShowBorrowForm(true)}>Mark as Borrowed</button>
          </>
        )}
        {showBorrowForm && <BorrowForm bookId={bookId} availabilities={availabilities || []} onClose={() => setShowBorrowForm(false)} />}
      </div>

      {/* Holds */}
      <div className="card">
        <div className="card-header">
          <h3>Holds</h3>
          <button className="btn-small" onClick={() => setShowHoldForm(true)}>+ Place Hold</button>
        </div>
        {activeHolds.length === 0 && <p className="muted">No active holds</p>}
        {activeHolds.map((hold) => (
          <HoldCard key={hold.id} hold={hold} libraryName={getLibraryName(hold.libraryId)} onFulfill={() => handleFulfillHold(hold.id!)} />
        ))}
        {showHoldForm && <HoldForm bookId={bookId} availabilities={availabilities || []} onClose={() => setShowHoldForm(false)} />}
      </div>

      {/* Borrow History */}
      {borrows && borrows.filter((b) => b.isReturned).length > 0 && (
        <div className="card">
          <h3>Borrow History</h3>
          {borrows.filter((b) => b.isReturned).map((b) => (
            <div key={b.id} className="history-item">
              <span>{getLibraryName(b.libraryId)}</span>
              <span className="muted">{new Date(b.borrowDate).toLocaleDateString()} → {b.returnDate ? new Date(b.returnDate).toLocaleDateString() : 'N/A'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BorrowCard({ borrow, libraryName, onReturn }: { borrow: any; libraryName: string; onReturn: () => void }) {
  const effectiveDue = getEffectiveDueDate(borrow);
  const extensions = getExtensionsUsed(borrow);
  const daysLeft = getDaysUntilDue(borrow);
  const overdue = isOverdue(borrow);

  return (
    <div className="borrow-card">
      <div className="borrow-header">
        <strong>{libraryName}</strong>
        {overdue && <span className="badge badge-red">OVERDUE</span>}
      </div>
      <p className="detail-row">Borrowed: {new Date(borrow.borrowDate).toLocaleDateString()}</p>
      <p className="detail-row">Due: {effectiveDue.toLocaleDateString()}</p>
      {extensions > 0 && <p className="detail-row text-orange">Auto-renewed {extensions}/{borrow.maxRenewals} times</p>}
      {!overdue && <p className="detail-row text-green">{daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining</p>}
      {overdue && <p className="detail-row text-red">{Math.abs(daysLeft)} day{Math.abs(daysLeft) !== 1 ? 's' : ''} overdue (all renewals used)</p>}
      <button className="btn-success" onClick={onReturn}>Mark as Returned</button>
    </div>
  );
}

function HoldCard({ hold, libraryName, onFulfill }: { hold: any; libraryName: string; onFulfill: () => void }) {
  const weeks = getWeeksOnHold(hold.holdDate);
  const days = getDaysOnHold(hold.holdDate);

  return (
    <div className="hold-card">
      <div className="borrow-header">
        <strong>{libraryName}</strong>
        <span className="badge badge-orange">ON HOLD</span>
      </div>
      <p className="detail-row">Placed: {new Date(hold.holdDate).toLocaleDateString()}</p>
      {hold.queuePosition > 0 && <p className="detail-row">Queue: #{hold.queuePosition}</p>}
      <p className="detail-row text-orange">
        {weeks > 0 ? `${weeks}w ${days % 7}d on hold` : `${days}d on hold`}
      </p>
      <button className="btn-success" onClick={onFulfill}>Mark Fulfilled</button>
    </div>
  );
}

function AvailabilityForm({ bookId, onClose }: { bookId: number; onClose: () => void }) {
  const libraries = useLiveQuery(() => db.libraries.orderBy('name').toArray());
  const [libraryId, setLibraryId] = useState(0);
  const [locationId, setLocationId] = useState(0);
  const [category, setCategory] = useState('');
  const [shelfRow, setShelfRow] = useState('');
  const [callNumber, setCallNumber] = useState('');
  const locs = useLiveQuery<Location[]>(() => libraryId ? db.locations.where('libraryId').equals(libraryId).toArray() : Promise.resolve([]), [libraryId]);

  const handleSave = async () => {
    if (!libraryId) return;
    await db.bookAvailabilities.add({ bookId, libraryId, locationId: locationId || undefined, category, shelfRow, callNumber, notes: '', createdAt: new Date() });
    onClose();
  };

  return (
    <div className="inline-form">
      <select value={libraryId} onChange={(e) => { setLibraryId(Number(e.target.value)); setLocationId(0); }}>
        <option value={0}>Select a library</option>
        {libraries?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      {locs && locs.length > 0 && (
        <select value={locationId} onChange={(e) => setLocationId(Number(e.target.value))}>
          <option value={0}>Any location</option>
          {locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      )}
      <input type="text" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
      <input type="text" placeholder="Shelf / Row" value={shelfRow} onChange={(e) => setShelfRow(e.target.value)} />
      <input type="text" placeholder="Call Number" value={callNumber} onChange={(e) => setCallNumber(e.target.value)} />
      <div className="form-actions">
        <button className="btn-primary" onClick={handleSave} disabled={!libraryId}>Save</button>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function BorrowForm({ bookId, availabilities, onClose }: { bookId: number; availabilities: any[]; onClose: () => void }) {
  const firstAvail = availabilities[0];
  const libraries = useLiveQuery(() => db.libraries.orderBy('name').toArray());
  const [libraryId, setLibraryId] = useState(firstAvail?.libraryId || 0);
  const [borrowDate, setBorrowDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  const handleBorrowDateChange = (value: string) => {
    setBorrowDate(value);
    const newDue = new Date(new Date(value).getTime() + 21 * 24 * 60 * 60 * 1000);
    setDueDate(newDue.toISOString().split('T')[0]);
  };

  const handleSave = async () => {
    if (!libraryId) return;
    const borrow = {
      bookId, libraryId,
      borrowDate: new Date(borrowDate),
      dueDate: new Date(dueDate),
      isReturned: false,
      maxRenewals: 2,
      notes,
      createdAt: new Date(),
    };
    const id = await db.borrows.add(borrow);
    scheduleDueReminder({ ...borrow, id: id as number });
    onClose();
  };

  return (
    <div className="inline-form">
      {availabilities.length === 0 ? (
        <select value={libraryId} onChange={(e) => setLibraryId(Number(e.target.value))}>
          <option value={0}>Select a library</option>
          {libraries?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      ) : (
        <select value={libraryId} onChange={(e) => setLibraryId(Number(e.target.value))}>
          {availabilities.map((a) => (
            <option key={a.id} value={a.libraryId}>
              {libraries?.find((l) => l.id === a.libraryId)?.name || `Library #${a.libraryId}`}
            </option>
          ))}
        </select>
      )}
      <label>Borrow Date <input type="date" value={borrowDate} onChange={(e) => handleBorrowDateChange(e.target.value)} /></label>
      <label>Due Date <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
      <input type="text" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="form-actions">
        <button className="btn-primary" onClick={handleSave} disabled={!libraryId}>Save</button>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function HoldForm({ bookId, availabilities, onClose }: { bookId: number; availabilities: any[]; onClose: () => void }) {
  const firstAvail = availabilities[0];
  const libraries = useLiveQuery(() => db.libraries.orderBy('name').toArray());
  const [libraryId, setLibraryId] = useState(firstAvail?.libraryId || 0);
  const [holdDate, setHoldDate] = useState(new Date().toISOString().split('T')[0]);
  const [queuePosition, setQueuePosition] = useState(0);
  const [notes, setNotes] = useState('');

  const handleSave = async () => {
    if (!libraryId) return;
    await db.holds.add({ bookId, libraryId, holdDate: new Date(holdDate), queuePosition, isFulfilled: false, notes, createdAt: new Date() });
    onClose();
  };

  return (
    <div className="inline-form">
      {availabilities.length === 0 ? (
        <select value={libraryId} onChange={(e) => setLibraryId(Number(e.target.value))}>
          <option value={0}>Select a library</option>
          {libraries?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      ) : (
        <select value={libraryId} onChange={(e) => setLibraryId(Number(e.target.value))}>
          {availabilities.map((a) => (
            <option key={a.id} value={a.libraryId}>
              {libraries?.find((l) => l.id === a.libraryId)?.name || `Library #${a.libraryId}`}
            </option>
          ))}
        </select>
      )}
      <label>Hold Placed On <input type="date" value={holdDate} onChange={(e) => setHoldDate(e.target.value)} /></label>
      <label>Queue Position <input type="number" min={0} value={queuePosition} onChange={(e) => setQueuePosition(Number(e.target.value))} /></label>
      <input type="text" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="form-actions">
        <button className="btn-primary" onClick={handleSave} disabled={!libraryId}>Save</button>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
