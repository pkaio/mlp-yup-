-- Allow storing larger data URLs for profile images
ALTER TABLE users
ALTER COLUMN profile_image_url TYPE TEXT;
