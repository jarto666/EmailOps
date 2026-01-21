-- Demo seed data for EmailOps demos
-- This creates a fake customer database with users for segmentation demos

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  plan_type VARCHAR(50) DEFAULT 'free',
  signup_date DATE DEFAULT CURRENT_DATE,
  country VARCHAR(2) DEFAULT 'US',
  last_active_at TIMESTAMP DEFAULT NOW(),
  email_verified BOOLEAN DEFAULT true,
  receive_marketing BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert 500 demo users with varied attributes
INSERT INTO users (email, first_name, last_name, plan_type, signup_date, country, last_active_at, email_verified, receive_marketing)
SELECT
  'user' || i || '@demo.example.com',
  (ARRAY['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack',
         'Kate', 'Leo', 'Mia', 'Noah', 'Olivia', 'Paul', 'Quinn', 'Rose', 'Sam', 'Tina'])[1 + (i % 20)],
  (ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Martinez', 'Anderson'])[1 + (i % 10)],
  (ARRAY['free', 'free', 'free', 'pro', 'pro', 'enterprise'])[1 + (i % 6)],
  CURRENT_DATE - (i % 365),
  (ARRAY['US', 'US', 'US', 'CA', 'GB', 'DE', 'FR', 'AU', 'JP', 'BR'])[1 + (i % 10)],
  NOW() - (interval '1 hour' * (i % 720)),
  i % 20 != 0,  -- 5% unverified
  i % 10 != 0   -- 10% opted out of marketing
FROM generate_series(1, 500) AS i;

-- Add some specific test emails for demo scenarios
INSERT INTO users (email, first_name, last_name, plan_type, country, receive_marketing)
VALUES
  ('alice.demo@example.com', 'Alice', 'Demo', 'enterprise', 'US', true),
  ('bob.test@example.com', 'Bob', 'Test', 'pro', 'GB', true),
  ('charlie.sample@example.com', 'Charlie', 'Sample', 'free', 'CA', false),
  ('bounce.test@example.com', 'Bounce', 'Test', 'free', 'US', true),
  ('complaint.test@example.com', 'Complaint', 'Test', 'free', 'US', true);

-- Create some useful views for segmentation demos
CREATE VIEW active_pro_users AS
SELECT * FROM users
WHERE plan_type IN ('pro', 'enterprise')
  AND last_active_at > NOW() - interval '7 days'
  AND email_verified = true
  AND receive_marketing = true;

CREATE VIEW inactive_free_users AS
SELECT * FROM users
WHERE plan_type = 'free'
  AND last_active_at < NOW() - interval '30 days'
  AND email_verified = true
  AND receive_marketing = true;

CREATE VIEW us_enterprise_users AS
SELECT * FROM users
WHERE plan_type = 'enterprise'
  AND country = 'US'
  AND email_verified = true
  AND receive_marketing = true;

-- Summary for quick checks
SELECT
  plan_type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE receive_marketing) as marketing_opted_in
FROM users
GROUP BY plan_type
ORDER BY plan_type;
