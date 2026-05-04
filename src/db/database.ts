import Dexie, { type EntityTable } from 'dexie';

export interface Library {
  id?: number;
  name: string;
  cardNumber: string;
  createdAt: Date;
}

export interface Location {
  id?: number;
  libraryId: number;
  name: string;
  address: string;
  createdAt: Date;
}

export interface Book {
  id?: number;
  title: string;
  author: string;
  isbn: string;
  genre: string;
  notes: string;
  readStatus: 'Want to Read' | 'Reading' | 'Finished';
  createdAt: Date;
}

export interface BookAvailability {
  id?: number;
  bookId: number;
  libraryId: number;
  locationId?: number;
  category: string;
  shelfRow: string;
  callNumber: string;
  notes: string;
  createdAt: Date;
}

export interface Borrow {
  id?: number;
  bookId: number;
  libraryId: number;
  borrowDate: Date;
  dueDate: Date;
  returnDate?: Date;
  isReturned: boolean;
  maxRenewals: number;
  notes: string;
  createdAt: Date;
}

export interface Hold {
  id?: number;
  bookId: number;
  libraryId: number;
  holdDate: Date;
  queuePosition: number;
  isFulfilled: boolean;
  fulfilledDate?: Date;
  notes: string;
  createdAt: Date;
}

class LibTrackDB extends Dexie {
  libraries!: EntityTable<Library, 'id'>;
  locations!: EntityTable<Location, 'id'>;
  books!: EntityTable<Book, 'id'>;
  bookAvailabilities!: EntityTable<BookAvailability, 'id'>;
  borrows!: EntityTable<Borrow, 'id'>;
  holds!: EntityTable<Hold, 'id'>;

  constructor() {
    super('LibTrackDB');
    this.version(1).stores({
      libraries: '++id, name',
      locations: '++id, libraryId, name',
      books: '++id, title, author, readStatus',
      bookAvailabilities: '++id, bookId, libraryId, locationId',
      borrows: '++id, bookId, libraryId, isReturned',
      holds: '++id, bookId, libraryId, isFulfilled',
    });
  }
}

export const db = new LibTrackDB();
