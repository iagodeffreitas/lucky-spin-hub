-- Drop existing policy and recreate
DROP POLICY IF EXISTS "Admins can view all spin results" ON public.spin_results;

CREATE POLICY "Admins can manage spin results"
ON public.spin_results
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));