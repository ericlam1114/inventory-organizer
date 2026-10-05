'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/** True for super admins. RLS on org_roles only returns rows to super admins. */
export function useIsSuperAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('org_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      if (!cancelled) setIsAdmin(!!data);
    })();
    return () => { cancelled = true; };
  }, []);
  return isAdmin;
}
