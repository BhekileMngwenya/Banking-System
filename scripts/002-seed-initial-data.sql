-- Seed initial data for the banking portal

-- Insert default exchange rates
INSERT INTO exchange_rates (currency_from, currency_to, rate) VALUES
('USD', 'ZAR', 18.75),
('EUR', 'ZAR', 20.45),
('GBP', 'ZAR', 23.85),
('ZAR', 'ZAR', 1.00)
ON DUPLICATE KEY UPDATE 
rate = VALUES(rate),
updated_at = CURRENT_TIMESTAMP;

-- Insert system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('daily_transfer_limit', '100000', 'Daily transfer limit in ZAR'),
('monthly_transfer_limit', '1000000', 'Monthly transfer limit in ZAR'),
('max_login_attempts', '5', 'Maximum failed login attempts before lockout'),
('lockout_duration_minutes', '15', 'Account lockout duration in minutes'),
('session_timeout_hours', '24', 'Session timeout in hours'),
('min_password_length', '8', 'Minimum password length'),
('require_2fa', 'false', 'Require two-factor authentication'),
('maintenance_mode', 'false', 'System maintenance mode')
ON DUPLICATE KEY UPDATE 
setting_value = VALUES(setting_value),
updated_at = CURRENT_TIMESTAMP;

-- Create default admin user (password: AdminPass123!)
-- Note: In production, this should be done securely
INSERT INTO users (
    id,
    email, 
    password_hash, 
    password_salt,
    first_name, 
    last_name, 
    role, 
    account_number, 
    balance,
    is_active
) VALUES (
    'admin-001',
    'admin@securebank.com',
    'hashed_admin_password_placeholder',
    'admin_salt_placeholder',
    'System',
    'Administrator',
    'admin',
    '6200000001',
    0.00,
    TRUE
) ON DUPLICATE KEY UPDATE
email = VALUES(email);

-- Create sample customer (password: Customer123!)
INSERT INTO users (
    id,
    email,
    password_hash,
    password_salt,
    first_name,
    last_name,
    role,
    account_number,
    balance,
    is_active
) VALUES (
    'customer-001',
    'john.doe@example.com',
    'hashed_customer_password_placeholder',
    'customer_salt_placeholder',
    'John',
    'Doe',
    'customer',
    '6200000002',
    25000.00,
    TRUE
) ON DUPLICATE KEY UPDATE
email = VALUES(email);

-- Create initial deposit transaction for sample customer
INSERT INTO transactions (
    id,
    from_account_number,
    to_account_number,
    amount,
    currency,
    amount_in_zar,
    reference,
    recipient_name,
    recipient_bank,
    status,
    transaction_type,
    fees,
    completed_at
) VALUES (
    'txn-001',
    'SYSTEM_DEPOSIT',
    '6200000002',
    25000.00,
    'ZAR',
    25000.00,
    'Initial account deposit',
    'John Doe',
    'SECUREBANK',
    'completed',
    'deposit',
    0.00,
    CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE
reference = VALUES(reference);

COMMIT;
