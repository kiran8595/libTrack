export async function searchBooks(query: string): Promise<OpenLibraryResult[]> {
  if (!query.trim()) return [];

  const encoded = encodeURIComponent(query);
  const url = `https://openlibrary.org/search.json?q=${encoded}&limit=8&fields=title,author_name,isbn,subject,cover_i,first_publish_year`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return (data.docs || []).map((doc: any) => ({
      title: doc.title || '',
      author: doc.author_name?.[0] || '',
      isbn: doc.isbn?.[0] || '',
      category: (doc.subject || []).slice(0, 3).join(', '),
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg` : undefined,
      firstPublishYear: doc.first_publish_year,
    }));
  } catch {
    return [];
  }
}

export interface OpenLibraryResult {
  title: string;
  author: string;
  isbn: string;
  category: string;
  coverUrl?: string;
  firstPublishYear?: number;
}
