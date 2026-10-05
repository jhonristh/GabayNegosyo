import { redirect } from "next/navigation";

/** The penalty simulator now lives in the lifecycle at /penalties; old links keep working. */
export default function PenaltySimulatorRedirect() {
  redirect("/penalties");
}
