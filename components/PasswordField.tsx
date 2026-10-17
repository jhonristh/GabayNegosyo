"use client";

import { useState, type KeyboardEventHandler } from "react";

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
}

/** Password input with a show/hide control. The button is a real button with a live label and aria-pressed. */
export default function PasswordField({ id, value, onChange, autoComplete, onKeyDown }: Props) {
  const [shown, setShown] = useState(false);
  return (
    <div className="pw-field">
      <input
        id={id}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        className="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="pw-toggle"
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        aria-controls={id}
        onClick={() => setShown((s) => !s)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {shown ? (
            <>
              <path d="M3 3l18 18" />
              <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c5 0 8.5 4.2 9.5 7a11.7 11.7 0 0 1-2.6 3.9M6.6 6.7A11.8 11.8 0 0 0 2.5 12c1 2.8 4.5 7 9.5 7 1.5 0 2.8-.4 4-1" />
              <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            </>
          ) : (
            <>
              <path d="M2.5 12C3.5 9.2 7 5 12 5s8.5 4.2 9.5 7c-1 2.8-4.5 7-9.5 7s-8.5-4.2-9.5-7Z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
