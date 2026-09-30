"use client";

import { useEffect } from "react";
import { db } from "../lib/db";
import { useToast } from "./ToastProvider";

const MESSAGES: Record<string, string> = {
  saveBusinessProfile: "We couldn't save your business profile. Check your connection and try again.",
  markComplete: "We couldn't save that change. It may not be there next time you open the app.",
  markIncomplete: "We couldn't save that change. It may not be there next time you open the app.",
  setReminderConfig: "We couldn't save your reminder setting. Check your connection and try again.",
};

/** Turns a failed background save (lib/db.ts) into a visible, announced message. */
export default function DbErrorToasts() {
  const { notify } = useToast();
  useEffect(
    () =>
      db.onPersistError((label) => {
        notify(MESSAGES[label] ?? "We couldn't save your latest change. Check your connection and try again.", "error");
      }),
    [notify]
  );
  return null;
}
