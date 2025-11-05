-- Add image_type column to product_images table to support front/back views
ALTER TABLE product_images 
ADD COLUMN IF NOT EXISTS image_type text CHECK (image_type IN ('front', 'back', 'gallery'));

-- Set default for existing records
UPDATE product_images 
SET image_type = 'gallery' 
WHERE image_type IS NULL;

-- Set NOT NULL constraint after setting defaults
ALTER TABLE product_images 
ALTER COLUMN image_type SET DEFAULT 'gallery';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_images_type ON product_images(product_id, image_type);