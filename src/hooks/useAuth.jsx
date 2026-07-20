import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        supabase.auth.getSession()
            .then(({ data: { session }, error }) => {
                if (!isMounted) return;
                if (error) setError(error.message);
                setSession(session);
                setLoading(false);
            })
            .catch((err) => {
                if (!isMounted) return;
                setError(err.message);
                setLoading(false);
            });

        // Listen for changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = useCallback(async () => {
        const { error } = await supabase.auth.signOut();
        if (error) setError(error.message);
    }, []);

    return { session, loading, error, signOut };
}