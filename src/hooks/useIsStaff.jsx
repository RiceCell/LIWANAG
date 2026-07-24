import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

// Checks whether the signed-in user has any row(s) in `barangay_staff`,
// and which specific barangay(s) those rows are for. A person can be
// staff of more than one barangay — barangay_staff's uniqueness is on
// (user_id, barangay_name) together, not user_id alone — so
// `staffBarangays` is always an array. For the common single-barangay
// case it'll just have one entry.
//
// This is a UI convenience — it drives whether the LGU Console link is
// shown, which barangay's data GovConsole fetches/displays, and whether
// App.jsx lets someone stay on the 'gov' view. It is NOT the actual
// security boundary; that's the RLS policies in
// 20260722_barangay_staff_and_rls.sql and 20260724_barangay_scoped_rls.sql,
// which can't be bypassed by editing client code. If this hook and the
// database ever disagree, the database wins.
export function useIsStaff() {
    const { session, loading: authLoading } = useAuth();
    const [isStaff, setIsStaff] = useState(false);
    const [staffBarangays, setStaffBarangays] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let ignore = false;

        // Wait for auth to resolve first — no point checking staff status
        // for a session we don't know exists yet.
        if (authLoading) return;

        if (!session) {
            setIsStaff(false);
            setStaffBarangays([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        supabase
            .from('barangay_staff')
            .select('barangay_name')
            .eq('user_id', session.user.id)
            .then(({ data, error }) => {
                if (ignore) return;
                if (error) {
                    // Fail closed: if we can't confirm staff status, treat the
                    // person as a normal user rather than risk showing staff UI.
                    console.error('Staff check failed:', error.message);
                    setIsStaff(false);
                    setStaffBarangays([]);
                } else {
                    const barangays = (data || [])
                        .map((row) => row.barangay_name)
                        .filter(Boolean);
                    setIsStaff(barangays.length > 0);
                    setStaffBarangays(barangays);
                }
                setLoading(false);
            });

        return () => { ignore = true; };
    }, [session, authLoading]);

    return { isStaff, staffBarangays, loading };
}