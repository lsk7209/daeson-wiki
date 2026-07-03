"use client";

import { useEffect, useMemo, useState } from "react";

type NoteState = {
  commentary: string;
  doodle: string;
};

type NotePadProps = {
  verseId: string;
};

type StorageMode = "loading" | "local" | "turso";

type NoteApiResponse = {
  note: (NoteState & {
    verseId: string;
    updatedAt: string;
  }) | null;
  storage: "local" | "turso";
};

const emptyNote: NoteState = {
  commentary: "",
  doodle: "",
};

export default function NotePad({ verseId }: NotePadProps) {
  const storageKey = useMemo(() => `daeson-wiki:verse-note:${verseId}`, [verseId]);
  const [note, setNote] = useState<NoteState>(emptyNote);
  const [loaded, setLoaded] = useState(false);
  const [storageMode, setStorageMode] = useState<StorageMode>("loading");
  const [saveLabel, setSaveLabel] = useState("불러오는 중");

  useEffect(() => {
    const controller = new AbortController();
    const saved = window.localStorage.getItem(storageKey);
    let localNote = emptyNote;

    if (saved) {
      try {
        localNote = JSON.parse(saved) as NoteState;
      } catch {
        localNote = emptyNote;
      }
    }

    setNote(localNote);
    setLoaded(false);
    setStorageMode("loading");
    setSaveLabel(saved ? "기기 저장 불러옴" : "기기 저장");

    fetch(`/api/verses/${verseId}/note`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load note: ${response.status}`);
        }

        return (await response.json()) as NoteApiResponse;
      })
      .then((data) => {
        setStorageMode(data.storage);

        if (data.note) {
          const remoteNote = {
            commentary: data.note.commentary,
            doodle: data.note.doodle,
          };
          setNote(remoteNote);
          window.localStorage.setItem(storageKey, JSON.stringify(remoteNote));
          setSaveLabel(`${formatTime(data.note.updatedAt)} DB 불러옴`);
        } else {
          setSaveLabel(data.storage === "turso" ? "DB 저장 준비" : "기기 저장");
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setStorageMode("local");
        setSaveLabel("기기 저장");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoaded(true);
        }
      });

    return () => {
      controller.abort();
    };
  }, [storageKey, verseId]);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(note));

    if (storageMode !== "turso") {
      setSaveLabel(`${formatTime()} 기기 저장`);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setSaveLabel("DB 저장 중");

      fetch(`/api/verses/${verseId}/note`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(note),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Failed to save note: ${response.status}`);
          }

          return (await response.json()) as NoteApiResponse;
        })
        .then((data) => {
          setSaveLabel(
            data.note?.updatedAt
              ? `${formatTime(data.note.updatedAt)} DB 저장`
              : `${formatTime()} DB 저장`,
          );
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }

          setSaveLabel(`${formatTime()} 기기 저장`);
        });
    }, 600);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loaded, note, storageKey, storageMode, verseId]);

  return (
    <section className="note-panel">
      <header className="note-heading">
        <div>
          <p className="eyebrow">개인 기록</p>
          <h2>첨언과 낙서장</h2>
        </div>
        <span>{saveLabel}</span>
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

function formatTime(value?: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value ? new Date(value) : new Date());
}
