-- Rename columns to be generic
ALTER TABLE dida_master_user_config 
RENAME COLUMN icloud_username TO cal_username;

ALTER TABLE dida_master_user_config 
RENAME COLUMN icloud_app_password TO cal_password;

-- Add server URL column
ALTER TABLE dida_master_user_config 
ADD COLUMN cal_server_url text;

-- Migrate existing iCloud users to use the specific iCloud CalDAV URL
UPDATE dida_master_user_config
SET cal_server_url = 'https://caldav.icloud.com/'
WHERE cal_username IS NOT NULL AND cal_server_url IS NULL;
