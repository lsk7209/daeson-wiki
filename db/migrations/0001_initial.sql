create table if not exists verse_notes (
  verse_id text primary key,
  commentary text not null default '',
  doodle text not null default '',
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists source_link_reviews (
  source_link_id text primary key,
  review_status text not null check (review_status in ('auto', 'reviewed', 'rejected')),
  note text not null default '',
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists daily_delivery_log (
  id integer primary key autoincrement,
  target_date text not null,
  verse_id text not null,
  channel text not null default 'pwa',
  status text not null check (status in ('pending', 'sent', 'failed', 'skipped')),
  error_message text,
  delivered_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  unique (target_date, verse_id, channel)
);

create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
