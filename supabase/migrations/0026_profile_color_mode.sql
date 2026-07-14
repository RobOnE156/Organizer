-- Per-user light/dark preference. 'system' follows the device; 'light' and
-- 'dark' force that appearance regardless of the OS setting. Applied as a
-- class on <html> by the shell, so it survives navigation with no flash.
alter table profiles
  add column if not exists color_mode text not null default 'system';
