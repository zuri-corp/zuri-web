'use client';
import { useCallback, useEffect, useState } from 'react';
export type BasicAccount = { display_name: string };
export type OwnMoment = { id: string; status: 'pending' | 'approved' | 'rejected' | 'withdrawn'; note: string; display_name: string; space_name: string; space_slug: string | null };
type AccountData = { account: BasicAccount | null; items: OwnMoment[]; page: number; pages: number; total: number };
export function useBasicAccount(page = 1) {
  const [data, setData] = useState<AccountData | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [login, setLogin] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    try { const response = await fetch(`/api/pamoja/account?page=${page}`, { cache: 'no-store', signal }); const result = await response.json(); if (signal?.aborted) return;
      if (!response.ok) { setLogin(response.status === 401 || response.status === 403); throw new Error(result.error || 'Unable to open your account.'); }
      setError(''); setLogin(false); setData(result);
    } catch (e) { if (!signal?.aborted) { setData(null); setError(e instanceof Error ? e.message : 'Unable to load your account.'); } }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [page]);
  useEffect(() => { const controller = new AbortController();
    // The effect owns an external request; state comes from its response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal); return () => controller.abort(); }, [load]);
  return { data, loading, error, login, refresh: load, setAccount: (account: BasicAccount) => setData(previous => previous ? { ...previous, account } : null) };
}
