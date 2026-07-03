import { getTursoClient, isTursoConfigured } from "@/lib/turso";

export type VerseNote = {
  verseId: string;
  commentary: string;
  doodle: string;
  createdAt: string;
  updatedAt: string;
};

export type VerseNoteInput = {
  commentary: string;
  doodle: string;
};

type VerseNoteRow = {
  verse_id: string;
  commentary: string;
  doodle: string;
  created_at: string;
  updated_at: string;
};

export async function getVerseNote(verseId: string) {
  if (!isTursoConfigured()) {
    return null;
  }

  const client = getTursoClient();
  const result = await client.execute({
    sql: `
      select verse_id, commentary, doodle, created_at, updated_at
      from verse_notes
      where verse_id = ?
      limit 1
    `,
    args: [verseId],
  });

  const row = result.rows.at(0) as VerseNoteRow | undefined;

  return row ? mapVerseNote(row) : null;
}

export async function upsertVerseNote(
  verseId: string,
  input: VerseNoteInput,
) {
  const now = new Date().toISOString();

  const client = getTursoClient();

  await client.execute({
    sql: `
      insert into verse_notes (verse_id, commentary, doodle, created_at, updated_at)
      values (?, ?, ?, ?, ?)
      on conflict (verse_id) do update set
        commentary = excluded.commentary,
        doodle = excluded.doodle,
        updated_at = excluded.updated_at
    `,
    args: [verseId, input.commentary, input.doodle, now, now],
  });

  return getVerseNote(verseId);
}

function mapVerseNote(row: VerseNoteRow): VerseNote {
  return {
    verseId: row.verse_id,
    commentary: row.commentary,
    doodle: row.doodle,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
