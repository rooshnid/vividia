function searchUrl(base, query) {
  return `${base}${encodeURIComponent(query)}`;
}

export default function FuelPack({ fuelPack }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
      <section className="rounded-3xl border border-vividia-line bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-vividia-muted">Affirmation</p>
        <p className="mt-4 text-2xl font-medium leading-relaxed text-vividia-ink">{fuelPack.affirmation}</p>
      </section>
      <section className="rounded-3xl border border-vividia-line bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-vividia-muted">Books</p>
        <div className="mt-4 space-y-4">
          {fuelPack.books.map((book) => (
            <a
              key={book.title}
              href={searchUrl('https://www.google.com/search?q=', `${book.title} ${book.author}`)}
              target="_blank"
              rel="noreferrer"
              className="block rounded-3xl bg-vividia-bg p-4"
            >
              <p className="text-base font-medium text-vividia-ink">{book.title}</p>
              <p className="text-sm text-vividia-muted">{book.author}</p>
              <p className="mt-2 text-sm text-vividia-muted">{book.why}</p>
            </a>
          ))}
        </div>
      </section>
      <section className="rounded-3xl border border-vividia-line bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-vividia-muted">Fuel pack</p>
        <div className="mt-4 space-y-4">
          {fuelPack.documentaries.map((doc) => (
            <a
              key={doc.title}
              href={searchUrl('https://www.youtube.com/results?search_query=', doc.title)}
              target="_blank"
              rel="noreferrer"
              className="block rounded-3xl bg-vividia-bg p-4"
            >
              <p className="text-base font-medium text-vividia-ink">{doc.title}</p>
              <p className="text-sm text-vividia-muted">{doc.platform_hint}</p>
              <p className="mt-2 text-sm text-vividia-muted">{doc.why}</p>
            </a>
          ))}
          <a
            href={searchUrl('https://open.spotify.com/search/', fuelPack.spotify_search)}
            target="_blank"
            rel="noreferrer"
            className="block rounded-3xl bg-gradient-to-br from-[#181818] to-[#2e2e2e] p-5 text-white"
          >
            <p className="text-sm font-medium text-white/70">Playlist mood</p>
            <p className="mt-2 text-lg font-medium">{fuelPack.playlist_mood}</p>
            <p className="mt-2 text-sm text-white/70">{fuelPack.spotify_search}</p>
          </a>
        </div>
      </section>
    </div>
  );
}
