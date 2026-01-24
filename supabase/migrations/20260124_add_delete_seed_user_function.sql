-- Function to delete old seed user after migration
-- This bypasses RLS to allow cleanup of duplicate records
CREATE OR REPLACE FUNCTION delete_seed_user_by_phone(target_phone TEXT, keep_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete old seed user with matching phone but different ID
  DELETE FROM users
  WHERE phone = target_phone
  AND id != keep_user_id;

  -- Also try to delete from auth.users (may fail due to permissions, that's OK)
  BEGIN
    DELETE FROM auth.users
    WHERE phone = target_phone
    AND id != keep_user_id;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors - auth.users deletion requires admin privileges
    NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_seed_user_by_phone TO authenticated;
