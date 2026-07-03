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
  const [savedAt, setSavedAt] = useState<string | null>(null);

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
    setSavedAt(
      new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
    );
  }, [note, ready, storageKey]);

  return (
    <section className="note-panel">
      <header className="note-heading">
        <div>
          <p className="eyebrow">개인 기록</p>
          <h2>첨언과 낙서장</h2>
        </div>
        <span>{savedAt ? `${savedAt} 저장` : "기기 저장"}</span>
      </header>
      <div className="note-grid">
        <label className="note-field">
          <span>나의 첨언</span>
          <textarea
            value={note.commentary}
            rows={8}
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
            rows={8}
            onChange={(event) =>
              setNote((current) => ({
                ...current,
                doodle: event.target.value,
              }))
            }
          />
        </label>
      </div>
    </section>
  );
}
