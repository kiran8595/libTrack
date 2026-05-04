import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Location } from '../db/database';
import { searchBooks, type OpenLibraryResult } from '../db/bookSearch';
import type { Book } from '../db/database';
import { useNavigate } from 'react-router-dom';

export default function BooksPage() {
  const books = useLiveQuery(() => db.books.orderBy('title').toArray());
  const borrows = useLiveQuery(() => db.borrows.where('isReturned').equals(0).toArray());
  const holds = useLiveQuery(() => db.holds.where('isFulfilled').equals(0).toArray());
  const [showForm, setShowForm] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const navigate = useNavigate();

  const filteredBooks = books?.filter((book) => {
    const matchesSearch = !searchText ||
      book.title.toLowerCase().includes(searchText.toLowerCase()) ||
      book.author.toLowerCase().includes(searchText.toLowerCase()) ||
      book.genre.toLowerCase().includes(searchText.toLowerCase());
    const matchesFilter = filterStatus === 'all' || book.readStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>Books</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add Book</button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search books..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All</option>
          <option value="Want to Read">Want to Read</option>
          <option value="Reading">Reading</option>
          <option value="Finished">Finished</option>
        </select>
      </div>

      {showForm && <AddBookForm onClose={() => setShowForm(false)} />}

      {(!filteredBooks || filteredBooks.length === 0) && !showForm && (
        <div className="empty-state">
          <span className="empty-icon">📚</span>
          <p>{books?.length ? 'No books match your search.' : 'Add books to your reading list.'}</p>
        </div>
      )}

      <div className="list">
        {filteredBooks?.map((book) => {
          const isBorrowed = borrows?.some((b) => b.bookId === book.id && !b.isReturned);
          const isOnHold = holds?.some((h) => h.bookId === book.id && !h.isFulfilled);
          return (
            <div key={book.id} className="card book-card" onClick={() => navigate(`/books/${book.id}`)}>
              <div className="card-header">
                <div>
                  <h3>{book.title}</h3>
                  {book.author && <span className="subtitle">{book.author}</span>}
                </div>
                <div className="badges">
                  {isBorrowed && <span className="badge badge-blue">Borrowed</span>}
                  {isOnHold && <span className="badge badge-orange">On Hold</span>}
                </div>
              </div>
              <div className="book-meta">
                <span className={`status-pill status-${book.readStatus.replace(/\s/g, '-').toLowerCase()}`}>
                  {book.readStatus}
                </span>
                {book.genre && <span className="genre-tag">{book.genre}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddBookForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [genre, setGenre] = useState('');
  const [notes, setNotes] = useState('');
  const [readStatus, setReadStatus] = useState<Book['readStatus']>('Want to Read');
  const [searchResults, setSearchResults] = useState<OpenLibraryResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Library availability
  const [addLibrary, setAddLibrary] = useState(false);
  const [selectedLibraryId, setSelectedLibraryId] = useState<number>(0);
  const [selectedLocationId, setSelectedLocationId] = useState<number>(0);
  const [category, setCategory] = useState('');
  const [shelfRow, setShelfRow] = useState('');
  const [callNumber, setCallNumber] = useState('');

  const libraries = useLiveQuery(() => db.libraries.orderBy('name').toArray());
  const locations = useLiveQuery<Location[]>(
    () => selectedLibraryId ? db.locations.where('libraryId').equals(selectedLibraryId).toArray() : Promise.resolve([]),
    [selectedLibraryId]
  );

  const debounceSearch = useCallback(
    (() => {
      let timeout: ReturnType<typeof setTimeout>;
      return (query: string) => {
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
          if (query.trim().length < 2) {
            setSearchResults([]);
            return;
          }
          setIsSearching(true);
          const results = await searchBooks(query);
          setSearchResults(results);
          setIsSearching(false);
        }, 400);
      };
    })(),
    []
  );

  useEffect(() => {
    if (showSuggestions) debounceSearch(title);
  }, [title, showSuggestions, debounceSearch]);

  const selectResult = (result: OpenLibraryResult) => {
    setTitle(result.title);
    setAuthor(result.author);
    setIsbn(result.isbn);
    setGenre(result.category);
    setSearchResults([]);
    setShowSuggestions(false);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    const bookId = await db.books.add({
      title, author, isbn, genre, notes, readStatus, createdAt: new Date(),
    });

    if (addLibrary && selectedLibraryId) {
      await db.bookAvailabilities.add({
        bookId: bookId as number,
        libraryId: selectedLibraryId,
        locationId: selectedLocationId || undefined,
        category, shelfRow, callNumber, notes: '', createdAt: new Date(),
      });
    }
    onClose();
  };

  return (
    <div className="card form-card">
      <h3>Add Book</h3>
      <input
        type="text"
        placeholder="Start typing a book title..."
        value={title}
        onChange={(e) => { setTitle(e.target.value); setShowSuggestions(true); }}
        autoFocus
      />

      {showSuggestions && (isSearching || searchResults.length > 0) && (
        <div className="search-suggestions">
          {isSearching && <div className="searching">Searching...</div>}
          {searchResults.map((r, i) => (
            <div key={i} className="suggestion-item" onClick={() => selectResult(r)}>
              <strong>{r.title}</strong>
              <span>{r.author}{r.firstPublishYear ? ` (${r.firstPublishYear})` : ''}</span>
            </div>
          ))}
        </div>
      )}

      <input type="text" placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
      <input type="text" placeholder="ISBN (optional)" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
      <input type="text" placeholder="Genre / Category (optional)" value={genre} onChange={(e) => setGenre(e.target.value)} />

      <div className="status-selector">
        {(['Want to Read', 'Reading', 'Finished'] as const).map((s) => (
          <button key={s} className={`status-btn ${readStatus === s ? 'active' : ''}`} onClick={() => setReadStatus(s)}>{s}</button>
        ))}
      </div>

      <label className="toggle-label">
        <input type="checkbox" checked={addLibrary} onChange={(e) => setAddLibrary(e.target.checked)} />
        Add library availability
      </label>

      {addLibrary && (
        <div className="library-fields">
          <select value={selectedLibraryId} onChange={(e) => { setSelectedLibraryId(Number(e.target.value)); setSelectedLocationId(0); }}>
            <option value={0}>Select a library</option>
            {libraries?.map((lib) => <option key={lib.id} value={lib.id}>{lib.name}</option>)}
          </select>
          {locations && locations.length > 0 && (
            <select value={selectedLocationId} onChange={(e) => setSelectedLocationId(Number(e.target.value))}>
              <option value={0}>Any / Not sure</option>
              {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </select>
          )}
          <input type="text" placeholder="Category (e.g. Fiction, Sci-Fi)" value={category} onChange={(e) => setCategory(e.target.value)} />
          <input type="text" placeholder="Row / Shelf Name" value={shelfRow} onChange={(e) => setShelfRow(e.target.value)} />
          <input type="text" placeholder="Call Number (optional)" value={callNumber} onChange={(e) => setCallNumber(e.target.value)} />
        </div>
      )}

      <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

      <div className="form-actions">
        <button className="btn-primary" onClick={handleSave} disabled={!title.trim()}>Save</button>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
