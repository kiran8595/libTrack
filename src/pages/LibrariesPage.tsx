import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Library } from '../db/database';

export default function LibrariesPage() {
  const libraries = useLiveQuery(() => db.libraries.orderBy('name').toArray());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [showLocationForm, setShowLocationForm] = useState<number | null>(null);

  const locations = useLiveQuery(() => db.locations.toArray());

  const resetForm = () => {
    setName('');
    setCardNumber('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editingId) {
      await db.libraries.update(editingId, { name, cardNumber });
    } else {
      await db.libraries.add({ name, cardNumber, createdAt: new Date() });
    }
    resetForm();
  };

  const handleEdit = (lib: Library) => {
    setName(lib.name);
    setCardNumber(lib.cardNumber);
    setEditingId(lib.id!);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this library and all its locations?')) return;
    await db.locations.where('libraryId').equals(id).delete();
    await db.bookAvailabilities.where('libraryId').equals(id).delete();
    await db.libraries.delete(id);
  };

  const handleAddLocation = async (libraryId: number) => {
    if (!locationName.trim()) return;
    await db.locations.add({
      libraryId,
      name: locationName,
      address: locationAddress,
      createdAt: new Date(),
    });
    setLocationName('');
    setLocationAddress('');
    setShowLocationForm(null);
  };

  const handleDeleteLocation = async (id: number) => {
    await db.locations.delete(id);
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
                  <span className="subtitle">{libLocations.length} location{libLocations.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="card-actions">
                  <button className="btn-icon" onClick={() => handleEdit(lib)}>✏️</button>
                  <button className="btn-icon" onClick={() => handleDelete(lib.id!)}>🗑️</button>
                </div>
              </div>

              {libLocations.length > 0 && (
                <div className="locations-list">
                  {libLocations.map((loc) => (
                    <div key={loc.id} className="location-item">
                      <span>{loc.name}{loc.address ? ` — ${loc.address}` : ''}</span>
                      <button className="btn-icon-sm" onClick={() => handleDeleteLocation(loc.id!)}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {showLocationForm === lib.id ? (
                <div className="inline-form">
                  <input
                    type="text"
                    placeholder="Branch Name"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Address (optional)"
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                  />
                  <div className="form-actions">
                    <button className="btn-small" onClick={() => handleAddLocation(lib.id!)}>Add</button>
                    <button className="btn-small btn-secondary" onClick={() => setShowLocationForm(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="btn-link" onClick={() => setShowLocationForm(lib.id!)}>+ Add Location</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
