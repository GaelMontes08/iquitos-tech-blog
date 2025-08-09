-- Create contact_attempts table for rate limiting and analytics
-- This should be run in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS contact_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  name TEXT,
  message_preview TEXT, -- First 100 chars of message for logging
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_attempts_ip_date 
  ON contact_attempts(ip_address, attempted_at);

CREATE INDEX IF NOT EXISTS idx_contact_attempts_email_date 
  ON contact_attempts(email, attempted_at);

CREATE INDEX IF NOT EXISTS idx_contact_attempts_success 
  ON contact_attempts(success, attempted_at);

-- Enable Row Level Security
ALTER TABLE contact_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies that allow anonymous users to insert contact attempts
CREATE POLICY "Allow anonymous inserts" ON contact_attempts
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated inserts" ON contact_attempts
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to select" ON contact_attempts
  FOR SELECT TO authenticated
  USING (true);

-- Note: Anonymous users can insert but cannot select (for security)

-- Create RPC function for rate limiting (similar to newsletter)
CREATE OR REPLACE FUNCTION get_recent_contact_attempts_by_ip(
  ip_addr TEXT,
  hours_back INTEGER DEFAULT 24
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM contact_attempts 
    WHERE ip_address = ip_addr 
      AND attempted_at >= NOW() - INTERVAL '1 hour' * hours_back
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon users (needed for contact form)
GRANT EXECUTE ON FUNCTION get_recent_contact_attempts_by_ip TO anon, authenticated;

-- Optional: Create a view for contact analytics (accessible only to authenticated users)
CREATE OR REPLACE VIEW contact_stats AS
SELECT 
  DATE(attempted_at) as date,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE success = true) as successful_attempts,
  COUNT(*) FILTER (WHERE success = false) as failed_attempts,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT email) as unique_emails
FROM contact_attempts 
WHERE attempted_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(attempted_at)
ORDER BY date DESC;

-- Grant select permission on the view to authenticated users
GRANT SELECT ON contact_stats TO authenticated;

-- Optional: Create a function to clean up old attempts (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_contact_attempts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM contact_attempts 
  WHERE attempted_at < CURRENT_DATE - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- You can set up a cron job in Supabase to run this function weekly:
-- SELECT cron.schedule('cleanup-contact-attempts', '0 2 * * 0', 'SELECT cleanup_old_contact_attempts();');

COMMENT ON TABLE contact_attempts IS 'Stores contact form submission attempts for rate limiting and analytics';
COMMENT ON COLUMN contact_attempts.message_preview IS 'First 100 characters of the message for logging purposes';
COMMENT ON COLUMN contact_attempts.success IS 'Whether the contact form submission was successful';
COMMENT ON FUNCTION get_recent_contact_attempts_by_ip IS 'Returns count of contact attempts from an IP within specified hours';
COMMENT ON VIEW contact_stats IS 'Daily contact form submission statistics for the last 30 days';
