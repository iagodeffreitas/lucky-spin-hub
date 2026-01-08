-- Add probability_weight column to existing prizes table
ALTER TABLE public.prizes ADD COLUMN IF NOT EXISTS probability_weight INTEGER NOT NULL DEFAULT 1;

-- Update existing prizes with default weights
UPDATE public.prizes SET probability_weight = CASE 
    WHEN name = 'Mesa $30K' THEN 1
    WHEN name = 'Bônus $200' THEN 2
    WHEN name = 'Bônus $100' THEN 3
    WHEN name = 'Mentoria VIP' THEN 2
    WHEN name = 'E-book Pro' THEN 4
    WHEN name = 'Perdeu a vez' THEN 40
    WHEN name = 'Gire novamente' THEN 30
    WHEN name = 'Que pena...' THEN 18
    ELSE 1
END;