-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create prizes table
CREATE TABLE public.prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_losing BOOLEAN NOT NULL DEFAULT false,
    color TEXT NOT NULL DEFAULT '#d4af37',
    icon TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchases table (verified buyers)
CREATE TABLE public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    user_name TEXT,
    external_id TEXT UNIQUE NOT NULL,
    payment_platform TEXT NOT NULL CHECK (payment_platform IN ('mercado_pago', 'kiwify')),
    amount DECIMAL(10,2),
    status TEXT NOT NULL DEFAULT 'confirmed',
    spins_remaining INTEGER NOT NULL DEFAULT 5,
    access_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create spin_results table
CREATE TABLE public.spin_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
    prize_id UUID REFERENCES public.prizes(id) ON DELETE SET NULL,
    prize_name TEXT NOT NULL,
    is_winning BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Prizes policies (public read for active, admin write)
CREATE POLICY "Anyone can view active prizes"
ON public.prizes
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage prizes"
ON public.prizes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Purchases policies
CREATE POLICY "Users can view own purchase by token"
ON public.purchases
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage purchases"
ON public.purchases
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Spin results policies
CREATE POLICY "Users can view own spin results"
ON public.spin_results
FOR SELECT
USING (true);

CREATE POLICY "Users can insert spin results for own purchase"
ON public.spin_results
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all spin results"
ON public.spin_results
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers
CREATE TRIGGER update_prizes_updated_at
BEFORE UPDATE ON public.prizes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at
BEFORE UPDATE ON public.purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default prizes (including losing options)
INSERT INTO public.prizes (name, description, is_losing, color, display_order) VALUES
('Mesa $30K', 'Mesa proprietária de $30.000', false, '#ffd700', 1),
('Bônus $200', 'Bônus de $200 em créditos', false, '#d4af37', 2),
('Bônus $100', 'Bônus de $100 em créditos', false, '#c0a030', 3),
('Mentoria VIP', 'Sessão de mentoria exclusiva', false, '#b8860b', 4),
('E-book Pro', 'E-book de estratégias avançadas', false, '#daa520', 5),
('Perdeu a vez', 'Tente novamente na próxima!', true, '#4a4a4a', 6),
('Gire novamente', 'Você tem mais uma chance!', true, '#5a5a5a', 7),
('Que pena...', 'Não foi dessa vez!', true, '#3a3a3a', 8);