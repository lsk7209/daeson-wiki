"use client";

import { useEffect, useMemo, useState } from "react";

type NoteState = {
  commentary: string;
  doodle: string;
};

type NotePadProps = {
  verseId: string;
};

const emptyNote: NoteState = {
  commentary: "",
  doodle: "",
};

export default function NotePad({ verseId }: NotePadProps) {
  const storageKey = useMemo(() => `daeson-wiki:verse-note:${verseId}`, [verseId]);
  const [note, setNote] = useState<NoteState>(emptyNote);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);

    if (saved) {
      try {
        setNote(JSON.parse(saved) as NoteState);
      } catch {
        setNote(emptyNote);
      }
    }

    setReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(note));
  }, [note, ready, storageKey]);

  return (
    <section className="note-grid">
      <label className="note-field">
        <span>나의 첨언</span>
        <textarea
          value={note.commentary}
          onChange={(event) =>
            setNote((current) => ({
              ...current,
              commentary: event.target.value,
            }))
          }
        />
      </label>
      <label className="note-field">
        <span>낙서장</span>
        <textarea
          value={note.doodle}
          onChange={(event) =>
            setNote((current) => ({
              ...current,
              doodle: event.target.value,
            }))
          }
        />
      </label>
    </section>
  );
}
