/**
 * The head of a standalone page: its name, set the way every other page here
 * sets its title.
 *
 * Fugroo's version wrapped its wordmark over a field of gems; this site's pages
 * open on a plain heading, so the component keeps the name and the call sites
 * and drops the artwork.
 */
export function PageBanner({ title }: { title: string }) {
  return (
    <section className="section wrap" style={{ paddingTop: 40, paddingBottom: 0 }}>
      <div className="section-head">
        <h1 className="h-page">{title}</h1>
      </div>
    </section>
  );
}
