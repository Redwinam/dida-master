-- Migrate JSONB settings to generic CalDAV keys
UPDATE dida_master_user_config
SET settings = settings - 'icloud_username' - 'icloud_app_password' || jsonb_build_object(
    'cal_username', settings->>'icloud_username',
    'cal_password', settings->>'icloud_app_password',
    'cal_server_url', CASE WHEN (settings->>'icloud_username') IS NOT NULL AND (settings->>'icloud_username') != '' THEN 'https://caldav.icloud.com/' ELSE NULL END
)
WHERE settings ? 'icloud_username';
