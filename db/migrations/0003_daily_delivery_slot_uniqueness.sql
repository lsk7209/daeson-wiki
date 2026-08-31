create unique index if not exists idx_daily_delivery_log_target_channel
on daily_delivery_log (target_date, channel);
