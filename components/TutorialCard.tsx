import type { Tutorial } from "../lib/types";

export default function TutorialCard({ tutorial }: { tutorial: Tutorial }) {
  const videoId = !tutorial.isPlaceholder ? tutorial.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/)?.[1] : undefined;
  return <article className="v06-media-card">
    <div className="v06-video-art" aria-label={videoId ? "Video preview" : "Tutorial awaiting a verified video"}>
      {videoId ? <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} loading="lazy" alt="" /> : <span className="v06-video-pending">VIDEO<br />COMING SOON</span>}
      {videoId && <span className="v06-play" aria-hidden="true">▶</span>}
    </div>
    <div className="v06-media-content"><p className="v06-eyebrow">{tutorial.agencyId.toUpperCase()} · {tutorial.category}</p><h3>{tutorial.title}</h3><p>{tutorial.description}</p>
      {tutorial.isPlaceholder ? <p className="v06-unavailable">A curated video has not been verified yet.</p> : <a className="tutorial-link" href={tutorial.videoUrl} target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a>}
    </div>
  </article>;
}
