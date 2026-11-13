import type { Tutorial } from "../lib/types";
import { youtubeWatchUrl } from "../lib/youtube";
import KitIcon from "./KitIcon";

export default function TutorialCard({ tutorial }: { tutorial: Tutorial }) {
  const watchUrl = tutorial.isPlaceholder ? null : youtubeWatchUrl(tutorial.videoUrl);
  return (
    <article className="v06-media-card gn-tutorial-card">
      {watchUrl ? (
        <a className="gn-video-available" href={watchUrl} target="_blank" rel="noopener noreferrer"
          aria-label={"Video available: " + tutorial.title + ". Watch on YouTube (opens in a new tab)"}>
          <KitIcon name="tutorials" size={28} />
          <strong>Video Available</strong>
          <span>Watch on YouTube · Opens in a new tab</span>
        </a>
      ) : <p className="gn-video-unavailable">Video link awaiting verification</p>}
      <div className="v06-media-content">
        <p className="v06-eyebrow">{tutorial.agencyId.toUpperCase()} · {tutorial.category}</p>
        <h3>{tutorial.title}</h3>
        <p>{tutorial.description}</p>
      </div>
    </article>
  );
}
