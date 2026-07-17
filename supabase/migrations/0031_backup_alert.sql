-- 0031_backup_alert.sql
-- ---------------------------------------------------------------------
-- Dead-man's-switch e-mail alert for the automatic off-site backup.
-- backup_settings.last_alert_at records when the last alert e-mail went
-- out per household, so repeat alerts are rate-limited while the backup
-- stays unhealthy and reset to null once it recovers.
-- ---------------------------------------------------------------------

alter table backup_settings add column if not exists last_alert_at timestamptz;

-- Least privilege: members may only manage the reminder cadence themselves;
-- the bookkeeping columns (last_sent_at, last_alert_at) are written solely by
-- the cron via the service role (unaffected by these grants). Without this,
-- the table-level update grant from 0024 would let any member account write
-- last_alert_at and silently suppress the alert. The column lists include
-- household_id + updated_at because the app's interval upsert also sets them
-- on its ON CONFLICT DO UPDATE path.
revoke insert, update on backup_settings from authenticated;
grant insert (household_id, interval_days, updated_at) on backup_settings to authenticated;
grant update (household_id, interval_days, updated_at) on backup_settings to authenticated;
