-- Function to create purchase and generate access token
CREATE OR REPLACE FUNCTION public.create_purchase_with_token(
    p_user_email TEXT,
    p_user_name TEXT DEFAULT NULL,
    p_external_id TEXT,
    p_payment_platform TEXT,
    p_amount DECIMAL DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_purchase_id UUID;
    v_access_token TEXT;
    v_result JSON;
BEGIN
    -- Generate unique access token
    v_access_token := encode(gen_random_bytes(32), 'hex');
    
    -- Insert purchase record
    INSERT INTO public.purchases (
        user_email,
        user_name,
        external_id,
        payment_platform,
        amount,
        access_token,
        spins_remaining
    ) VALUES (
        p_user_email,
        p_user_name,
        p_external_id,
        p_payment_platform,
        p_amount,
        v_access_token,
        5
    )
    RETURNING id INTO v_purchase_id;
    
    -- Return success with token
    v_result := json_build_object(
        'success', true,
        'purchase_id', v_purchase_id,
        'access_token', v_access_token,
        'wheel_url', format('https://seudominio.com/?token=%s', v_access_token)
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN unique_violation THEN
        -- External ID already exists, return existing token
        SELECT json_build_object(
            'success', true,
            'purchase_id', id,
            'access_token', access_token,
            'wheel_url', format('https://seudominio.com/?token=%s', access_token),
            'message', 'Purchase already exists'
        ) INTO v_result
        FROM public.purchases
        WHERE external_id = p_external_id;
        
        RETURN v_result;
        
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Function to validate token and get purchase info
CREATE OR REPLACE FUNCTION public.get_purchase_info(p_access_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_purchase RECORD;
    v_spins RECORD[];
    v_result JSON;
BEGIN
    -- Get purchase info
    SELECT * INTO v_purchase
    FROM public.purchases
    WHERE access_token = p_access_token;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Token inválido ou expirado'
        );
    END IF;
    
    -- Get spin history
    SELECT array_agg(
        json_build_object(
            'id', sr.id,
            'prize_name', sr.prize_name,
            'is_winning', sr.is_winning,
            'created_at', sr.created_at
        ) ORDER BY sr.created_at DESC
    ) INTO v_spins
    FROM public.spin_results sr
    WHERE sr.purchase_id = v_purchase.id;
    
    -- Return purchase info and spins
    v_result := json_build_object(
        'success', true,
        'purchase', json_build_object(
            'id', v_purchase.id,
            'user_email', v_purchase.user_email,
            'user_name', v_purchase.user_name,
            'spins_remaining', v_purchase.spins_remaining,
            'created_at', v_purchase.created_at
        ),
        'spins', COALESCE(v_spins, ARRAY[]::JSON[])
    );
    
    RETURN v_result;
END;
$$;

-- Function to record spin result
CREATE OR REPLACE FUNCTION public.record_spin(
    p_access_token TEXT,
    p_prize_id UUID,
    p_prize_name TEXT,
    p_is_winning BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_purchase_id UUID;
    v_spins_remaining INTEGER;
    v_result JSON;
BEGIN
    -- Get purchase and check spins
    SELECT id, spins_remaining INTO v_purchase_id, v_spins_remaining
    FROM public.purchases
    WHERE access_token = p_access_token;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Token inválido'
        );
    END IF;
    
    IF v_spins_remaining <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Sem giros restantes'
        );
    END IF;
    
    -- Record spin
    INSERT INTO public.spin_results (
        purchase_id,
        prize_id,
        prize_name,
        is_winning
    ) VALUES (
        v_purchase_id,
        p_prize_id,
        p_prize_name,
        p_is_winning
    );
    
    -- Update spins remaining
    UPDATE public.purchases
    SET spins_remaining = spins_remaining - 1
    WHERE id = v_purchase_id;
    
    RETURN json_build_object(
        'success', true,
        'spins_remaining', v_spins_remaining - 1
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;