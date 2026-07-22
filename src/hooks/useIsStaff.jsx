import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

// Checks whether the signed-in user has a row in `barangay_staff`.
//
// This is a UI convenience — it drives whether the LGU Console link is
// shown and whether App.jsx lets someone stay on the 'gov' view. It is NOT
// the actual security boundary; that's the RLS policies in
// 20260722_barangay_staff_and_rls.sql, which can't be bypassed by editing
// client code. If this hook and the database ever disagree, the database
// wins — someone could theoretically patch this hook to always return
// true and still hit a wall the moment they try to insert/update anything
// that requires staff.
export function useIsStaff() {
    const { session, loading: authLoading } = useAuth();
    const [isStaff, setIsStaff] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let ignore = false;

        // Wait for auth to resolve first — no point checking staff status
        // for a session we don't know exists yet.
        if (authLoading) return;

        if (!session) {
            setIsStaff(false);
            setLoading(false);
            return;
        }

        setLoading(true);
        supabase
            .from('barangay_staff')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle()
            .then(({ data, error }) => {
                if (ignore) return;
                if (error) {
                    // Fail closed: if we can't confirm staff status, treat the
                    // person as a normal user rather than risk showing staff UI.
                    console.error('Staff check failed:', error.message);
                    setIsStaff(false);
                } else {
                    setIsStaff(!!data);
                }
                setLoading(false);
            });

        return () => { ignore = true; };
    }, [session, authLoading]);

    return { isStaff, loading };
}