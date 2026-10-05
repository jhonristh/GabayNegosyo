import { redirect } from "next/navigation";

/**
 * The old "Business guide" has been split into the lifecycle stages
 * (/registration and /renewal). This keeps existing links and bookmarks working.
 */
export default function GuidePage() {
  redirect("/registration");
}
