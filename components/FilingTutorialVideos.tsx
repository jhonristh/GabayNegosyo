import videos from "../data/filingVideos.json";

interface FilingVideo { id: string; title: string; description?: string; category?: string; videoUrl: string }

const YT = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/;
const START = /[?&]t=(\d+)s?/;

/**
 * Filing tutorial videos. Add entries to data/filingVideos.json as
 * { "id", "title", "description"?, "videoUrl" } and they appear here automatically.
 * With no entries, a "coming soon" placeholder is shown. No links are invented.
 */
export default function FilingTutorialVideos() {
  const items = videos as FilingVideo[];
  return (
    <section className="guide-stage" aria-labelledby="videos-h">
      <h2 id="videos-h">Filing Tutorial Videos</h2>
      <aside className="youtube-notice" role="note" aria-labelledby="yt-notice-h">
        <p className="youtube-notice-kicker">IMPORTANT · READ BEFORE WATCHING</p>
        <h3 id="yt-notice-h">We do not own these YouTube videos</h3>
        <p>
          Every video on this page is made and owned by its creator and hosted on YouTube. GabayNegosyo does not own, produce, or control them, and we claim no rights in them. They are listed only to help you learn the steps.
        </p>
        <p>
          <strong>CTTO: credit to the owner.</strong> Full credit goes to the original creators. Open a video on YouTube to see the creator&apos;s own details and to support them.
        </p>
        <p>
          Owners can edit or remove their videos at any time, and a video may not match current agency forms, fees, or deadlines. Confirm every step with the official agency before you file or pay.
        </p>
      </aside>
      <p>Step-by-step video guides for filing and maintaining your business compliance.</p>
      <div className="v06-media-grid">
        {items.length === 0 ? (
          <article className="v06-media-card">
            <div className="v06-video-art" role="img" aria-label="Video tutorial placeholder"><span className="v06-video-pending">VIDEO TUTORIAL<br />PLACEHOLDER</span></div>
            <div className="v06-media-content">
              <p className="v06-eyebrow">Filing tutorial</p>
              <h3>Tutorial videos coming soon</h3>
              <p className="v06-unavailable">Filing walkthroughs will appear here once they are published.</p>
            </div>
          </article>
        ) : (
          items.map((v) => {
            const id = v.videoUrl.match(YT)?.[1];
            return (
              <article className="v06-media-card" key={v.id}>
                <div className="v06-video-art">
                  {id ? <iframe title={`Video: ${v.title}`} src={`https://www.youtube-nocookie.com/embed/${id}${START.test(v.videoUrl) ? `?start=${v.videoUrl.match(START)?.[1]}` : ""}`} allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" /> : <span className="v06-video-pending">VIDEO</span>}
                </div>
                <div className="v06-media-content">
                  {v.category && <p className="v06-eyebrow">{v.category}</p>}
                  <h3>{v.title}</h3>
                  {v.description && <p>{v.description}</p>}
                  <p className="hint">Videos are from YouTube and belong to their creators.</p>
                  {!id && <a className="tutorial-link" href={v.videoUrl} target="_blank" rel="noopener noreferrer">Watch video ↗</a>}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
