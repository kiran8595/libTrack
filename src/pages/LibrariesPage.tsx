import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/database';
import type { Library } from '../db/database';

export default function LibrariesPage() {
  const libraries = useLiveQuery(() => db.libraries.orderBy('name').toArray());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [formLocations, setFormLocations] = useState<{ name: string; address: string; id?: number }[]>([]);

  const locations = useLiveQuery(() => db.locations.toArray());
  const bookAvailabilities = useLiveQuery(() => db.bookAvailabilities.toArray());
  const books = useLiveQuery(() => db.books.toArray());
  const borrows = useLiveQuery(() => db.borrows.filter((b) => !b.isReturned).toArray());
  const navigate = useNavigate();

  const resetForm = () => {
    setName('');
    setCardNumber('');
    setFormLocations([]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    let libraryId: number;
    if (editingId) {
      await db.libraries.update(editingId, { name, cardNumber });
      libraryId = editingId;
      // Delete removed locations
      const existingLocs = locations?.filter((l) => l.libraryId === editingId) || [];
      const keptIds = formLocations.filter((fl) => fl.id).map((fl) => fl.id!);
      for (const loc of existingLocs) {
        if (!keptIds.includes(loc.id!)) {
          await db.locations.delete(loc.id!);
        }
      }
    } else {
      libraryId = (await db.libraries.add({ name, cardNumber, createdAt: new Date() })) as number;
    }
    // Add new locations
    for (const loc of formLocations) {
      if (!loc.id && loc.name.trim()) {
        await db.locations.add({ libraryId, name: loc.name, address: loc.address, createdAt: new Date() });
      }
    }
    resetForm();
  };

  const handleEdit = (lib: Library) => {
    setName(lib.name);
    setCardNumber(lib.cardNumber);
    setEditingId(lib.id!);
    const libLocs = locations?.filter((l) => l.libraryId === lib.id!) || [];
    setFormLocations(libLocs.map((l) => ({ name: l.name, address: l.address, id: l.id })));
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this library and all its locations?')) return;
    await db.locations.where('libraryId').equals(id).delete();
    await db.bookAvailabilities.where('libraryId').equals(id).delete();
    await db.libraries.delete(id);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Libraries</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add Library</button>
      </div>

      {showForm && (
        <div className="card form-card">
          <h3>{editingId ? 'Edit Library' : 'Add Library'}</h3>
          <input
            type="text"
            placeholder="Library Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <input
            type="text"
            placeholder="Card Number (optional)"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
          />

          <div className="form-locations">
            <label className="form-label">Locations / Branches</label>
            {formLocations.map((loc, i) => (
              <div key={i} className="form-location-row">
                <input
                  type="text"
                  placeholder="Branch Name"
                  value={loc.name}
                  onChange={(e) => {
                    const updated = [...formLocations];
                    updated[i] = { ...updated[i], name: e.target.value };
                    setFormLocations(updated);
                  }}
                />
                <input
                  type="text"
                  placeholder="Address (optional)"
                  value={loc.address}
                  onChange={(e) => {
                    const updated = [...formLocations];
                    updated[i] = { ...updated[i], address: e.target.value };
                    setFormLocations(updated);
                  }}
                />
                <button className="btn-icon-sm" onClick={() => setFormLocations(formLocations.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            <button className="btn-link" onClick={() => setFormLocations([...formLocations, { name: '', address: '' }])}>+ Add Location</button>
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave} disabled={!name.trim()}>Save</button>
            <button className="btn-secondary" onClick={resetForm}>Cancel</button>
          </div>
        </div>
      )}

      {(!libraries || libraries.length === 0) && !showForm && (
        <div className="empty-state">
          <span className="empty-icon">🏛️</span>
          <p>No libraries yet. Add your library memberships to get started.</p>
        </div>
      )}

      <div className="list">
        {libraries?.map((lib) => {
          const libLocations = locations?.filter((l) => l.libraryId === lib.id!) || [];
          return (
            <div key={lib.id} className="card">
              <div className="card-header">
                <div>
                  <h3>{lib.name}</h3>
                  {lib.cardNumber && <span className="subtitle">Card: {lib.cardNumber}</span>}
                </div>
                <div className="card-actions">
                  <button className="btn-icon" onClick={() => handleEdit(lib)}>✏️</button>
                  <button className="btn-icon" onClick={() => handleDelete(lib.id!)}>🗑️</button>
                </div>
              </div>

              {(() => {
                const libBooks = bookAvailabilities?.filter((a) => a.libraryId === lib.id) || [];
                if (libBooks.length === 0) return null;
                const libLocs = locations?.filter((l) => l.libraryId === lib.id) || [];

                // Group books by locationId
                const byLocation = new Map<number | undefined, typeof libBooks>();
                for (const avail of libBooks) {
                  const key = avail.locationId;
                  if (!byLocation.has(key)) byLocation.set(key, []);
                  byLocation.get(key)!.push(avail);
                }

                const renderBookItem = (avail: typeof libBooks[0]) => {
                  const book = books?.find((b) => b.id === avail.bookId);
                  if (!book) return null;
                  const activeBorrow = borrows?.find((b) => b.bookId === book.id && b.libraryId === lib.id);
                  return (
                    <div key={avail.id} className="lib-book-item" onClick={() => navigate(`/books/${book.id}`)}>
                      <span className="lib-book-title">{book.title}</span>
                      <div className="lib-book-details">
                        {activeBorrow ? (
                          <span className="lib-book-meta text-orange">Due: {new Date(activeBorrow.dueDate).toLocaleDateString()}</span>
                        ) : (
                          <span className={`status-pill-sm status-${book.readStatus.replace(/\s/g, '-').toLowerCase()}`}>{book.readStatus}</span>
                        )}
                        {avail.callNumber && <span className="lib-book-meta"># {avail.callNumber}</span>}
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="lib-books-section">
                    <h4 className="lib-books-title">Books ({libBooks.length})</h4>
                    {Array.from(byLocation.entries()).map(([locId, avails]) => {
                      const locName = locId ? libLocs.find((l) => l.id === locId)?.name : null;
                      return (
                        <div key={locId ?? 'none'} className="lib-location-group">
                          <span className="lib-location-label">{locName || 'No specific location'}</span>
                          {avails.map(renderBookItem)}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
