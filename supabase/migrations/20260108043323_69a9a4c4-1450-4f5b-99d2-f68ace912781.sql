-- Remove the problematic policies that still exist
DROP POLICY IF EXISTS "Users can view own purchase by token" ON public.purchases;
DROP POLICY IF EXISTS "Users can view own spin results" ON public.spin_results;
DROP POLICY IF EXISTS "Users can insert spin results for own purchase" ON public.spin_results;

-- For purchases table: public can read via access_token validation (secure function)
-- We'll use security definer functions instead of direct table access

-- For spin_results: only admins via dashboard, users via security definer functions