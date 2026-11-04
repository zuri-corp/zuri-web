'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SignOut from '@/components/admin/SignOut';

type ProfileLink = { title: string; url: string };
type Profile = {
  display_name: string;
  bio: string;
  handle: string;
  location: string;
  links: ProfileLink[];
  is_public: boolean;
  receive_invites: boolean;
  avatar_media_id: string | null;
};

const emptyProfile: Profile = {
  display_name: '',
  bio: '',
  handle: '',
  location: '',
  links: [],
  is_public: false,
  receive_invites: false,
  avatar_media_id: null,
};

async function mediaRequest(body: FormData | Blob | object) {
  const isForm = body instanceof FormData;
  const isBlob = body instanceof Blob;
  const response = await fetch('/api/backend/media', {
    method: 'POST',
    headers: isForm || isBlob ? undefined : { 'Content-Type': 'application/json' },
    body: isForm || isBlob ? body : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The private photo service is unavailable.');
  return result;
}

export default function SharedProfileForm() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploadedPhotoId, setUploadedPhotoId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/backend', { cache: 'no-store', signal });
      const result = await response.json();
      if (signal?.aborted) return;
      setError('');
      setPhotoError('');
      if (!response.ok) {
        setSignedIn(response.status === 401 || response.status === 403 ? false : null);
        throw new Error(result.error || 'Unable to open your ZURI profile.');
      }
      const saved = result.data?.profile;
      const next: Profile = saved ? {
        ...emptyProfile,
        ...saved,
        handle: saved.handle ?? '',
        location: saved.location ?? '',
        links: Array.isArray(saved.links) ? saved.links : [],
        avatar_media_id: saved.avatar_media_id ?? null,
      } : emptyProfile;
      setProfile(next);
      setSignedIn(true);
      if (next.avatar_media_id) {
        try {
          const signed = await mediaRequest({ action: 'read', id: next.avatar_media_id });
          if (!signal?.aborted) setPhotoUrl(signed.url);
        } catch {
          if (!signal?.aborted) setPhotoError('Your private profile photo could not be loaded.');
        }
      } else {
        setPhotoUrl('');
      }
    } catch (e) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : 'Unable to open your ZURI profile.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // The effect starts a request; profile state is populated from its response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setPhotoError('');
    setNotice('');
    try {
      let avatar_media_id = uploadedPhotoId ?? profile.avatar_media_id;
      if (photo && !uploadedPhotoId) {
        const uploaded = await mediaRequest(photo);
        if (typeof uploaded.id !== 'string') throw new Error('Photo upload was not confirmed.');
        avatar_media_id = uploaded.id;
        setUploadedPhotoId(uploaded.id);
      }
      const response = await fetch('/api/backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'profile.save',
          payload: { ...profile, handle: profile.handle || null, avatar_media_id },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your profile was not saved.');
      const saved = result.data;
      const needsIntroduction = firstVisit;
      setProfile({
        ...emptyProfile,
        ...saved,
        handle: saved.handle ?? '',
        location: saved.location ?? '',
        links: Array.isArray(saved.links) ? saved.links : [],
        avatar_media_id: saved.avatar_media_id ?? null,
      });
      setPhoto(null);
      setUploadedPhotoId(null);
      setNotice('Your ZURI profile is saved and available in the app.');
      if (saved.avatar_media_id) {
        try {
          const signed = await mediaRequest({ action: 'read', id: saved.avatar_media_id });
          setPhotoUrl(signed.url);
        } catch {
          setPhotoError('Your profile was saved, but its private photo preview could not be loaded.');
        }
      } else {
        setPhotoUrl('');
      }
      if (needsIntroduction) window.location.assign('/app?tour=welcome#/lounge');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your profile was not saved.');
    } finally {
      setBusy(false);
    }
  }

  const firstVisit = !profile.display_name || profile.display_name === 'ZURI member';
  const visiblePhoto = photo ? '' : photoUrl;
  if (loading) return <p role="status">Opening your ZURI profile…</p>;
  if (signedIn === false) return <p role="alert">Sign in with your verified email to set up your profile. <Link className="text-link" href="/pamoja/login?next=%2Fpamoja%2Faccount">Continue with email →</Link></p>;
  if (signedIn !== true) return <p role="alert">{error || 'Unable to open your ZURI profile.'} <button className="text-link" type="button" onClick={() => { setLoading(true); void load(); }}>Try again</button></p>;

  return <section aria-busy={busy}>
    <SignOut destination="pamoja"/>
    <h2 className="text-2xl font-bold mb-4">{firstVisit ? 'Start with your ZURI profile' : 'Your ZURI profile'}</h2>
    <p className="muted mt-3 mb-6">This profile is shared with the ZURI app. Your email stays private. Profiles are private unless you choose otherwise.</p>
    <form className="request-form" onSubmit={submit}>
      <label>Your display name<input className="input-style" required maxLength={80} autoComplete="name" value={profile.display_name} onChange={e => setProfile({ ...profile, display_name: e.target.value })}/></label>
      <label>About you<textarea className="input-style" maxLength={600} value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })}/></label>
      <label>Handle (optional)<input className="input-style" maxLength={40} pattern="[a-z0-9][a-z0-9_\-]{2,39}" value={profile.handle} onChange={e => setProfile({ ...profile, handle: e.target.value })}/><span className="muted text-sm">3–40 lowercase letters, numbers, underscores or hyphens.</span></label>
      <label>Location (optional)<input className="input-style" maxLength={100} autoComplete="address-level2" value={profile.location} onChange={e => setProfile({ ...profile, location: e.target.value })}/></label>
      <fieldset className="space-y-3">
        <legend className="font-semibold">Links (optional)</legend>
        {profile.links.map((item, index) => <div className="grid gap-3 sm:grid-cols-2" key={index}>
          <label>Link title<input className="input-style" maxLength={80} value={item.title} onChange={e => setProfile({ ...profile, links: profile.links.map((link, i) => i === index ? { ...link, title: e.target.value } : link) })}/></label>
          <label>HTTPS URL<input className="input-style" type="url" pattern="https://.*" maxLength={500} value={item.url} onChange={e => setProfile({ ...profile, links: profile.links.map((link, i) => i === index ? { ...link, url: e.target.value } : link) })}/></label>
          <button className="text-link sm:col-span-2 sm:justify-self-start" type="button" onClick={() => setProfile({ ...profile, links: profile.links.filter((_, i) => i !== index) })}>Remove link</button>
        </div>)}
        {profile.links.length < 12 && <button className="text-link" type="button" onClick={() => setProfile({ ...profile, links: [...profile.links, { title: '', url: '' }] })}>Add a link</button>}
      </fieldset>
      <label>Profile photo (optional)<input className="input-style" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { setPhoto(e.target.files?.[0] ?? null); setUploadedPhotoId(null); }}/></label>
      {visiblePhoto && <Image className="h-24 w-24 rounded-full object-cover" src={visiblePhoto} alt="Profile photo preview" width={96} height={96} unoptimized/>}
      {photo && <p>{photo.name} will be uploaded privately when you save.</p>}
      <p className="muted text-sm">Photos are stored privately in your ZURI account for use across your devices. They are not shown to other people.</p>
      <label className="flex items-start gap-3"><input className="mt-1" type="checkbox" checked={profile.is_public} onChange={e => setProfile({ ...profile, is_public: e.target.checked, receive_invites: e.target.checked ? profile.receive_invites : false })}/><span>Make my profile public. My display name, about, handle, links and location may then appear in ZURI discovery.</span></label>
      <button className="button button-dark" disabled={busy}>{busy ? 'Saving…' : firstVisit ? 'Save my ZURI profile' : 'Save profile changes'}</button>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {photoError && <p role="alert">{photoError}</p>}
      {notice && <p role="status">{notice}</p>}
    </form>
  </section>;
}
