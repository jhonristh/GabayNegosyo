"use client";
import type { Tutorial } from "../lib/types";
import { youtubeEmbedUrl } from "../lib/youtube";

export default function TutorialCard({ tutorial }: { tutorial: Tutorial }) {
  const embed = tutorial.isPlaceholder ? null : youtubeEmbedUrl(tutorial.videoUrl);
  return <article className="v06-media-card gn-tutorial-card">
    <div className="gn-youtube-player">
      {embed ? <iframe title={`Video: ${tutorial.title}`} src={embed}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="lazy" />
        : <p className="gn-video-unavailable">Video link awaiting completion</p>}
    </div>
    <div className="v06-media-content">
      <p className="v06-eyebrow">{tutorial.agencyId.toUpperCase()} · {tutorial.category}</p>
      <h3>{tutorial.title}</h3><p>{tutorial.description}</p>
      <p className="hint">Videos are from YouTube and belong to their creators.</p>
      {embed && <details className="gn-player-help"><summary>Video not playing?</summary><p>The creator may restrict embedding or remove a video. You can <a className="tutorial-link" href={tutorial.videoUrl} target="_blank" rel="noopener noreferrer">open it on YouTube ↗</a>.</p></details>}
    </div>
  </article>;
}
