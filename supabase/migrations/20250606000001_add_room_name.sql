-- Add room name field to rooms table
ALTER TABLE rooms ADD COLUMN name VARCHAR(100);

-- Set default room names for existing rooms
UPDATE rooms SET name = 'Room ' || room_code WHERE name IS NULL;

-- Make room name NOT NULL with a default value
ALTER TABLE rooms ALTER COLUMN name SET NOT NULL;
ALTER TABLE rooms ALTER COLUMN name SET DEFAULT 'WorldleParty Room';