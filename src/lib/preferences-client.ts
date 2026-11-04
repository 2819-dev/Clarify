"use client";

import {
  ACTIVITY_COOKIE,
  ACTIVITY_STORAGE_KEY,
  AFFINITY_COOKIE,
  AFFINITY_STORAGE_KEY,
  HIDE_CHANNELS_COOKIE,
  HIDE_CHANNELS_STORAGE_KEY,
  PREFS_EVENT,
  SUBS_COOKIE,
  SUBS_STORAGE_KEY,
  parseActivity,
  parseAffinity,
  parseSlugList,
  serializeActivity,
  serializeAffinity,
  serializeSlugList,
  type AffinityPrefs,
  type WatchActivity,
} from "./preferences";

function writeCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 400;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(name.length + 1));
  } catch {
    return match.slice(name.length + 1);
  }
}

function emitChange() {
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export function getSubscriptionsClient(): string[] {
  if (typeof window === "undefined") return [];
  const fromStorage = window.localStorage.getItem(SUBS_STORAGE_KEY);
  if (fromStorage != null) return parseSlugList(fromStorage);
  return parseSlugList(readCookie(SUBS_COOKIE));
}

export function setSubscriptionsClient(slugs: string[]) {
  const value = serializeSlugList(slugs);
  window.localStorage.setItem(SUBS_STORAGE_KEY, value);
  writeCookie(SUBS_COOKIE, value);
  emitChange();
}

export function isSubscribedClient(slug: string): boolean {
  return getSubscriptionsClient().includes(slug.toLowerCase());
}

export function toggleSubscriptionClient(slug: string): boolean {
  const normalized = slug.toLowerCase();
  const current = getSubscriptionsClient();
  const next = current.includes(normalized)
    ? current.filter((s) => s !== normalized)
    : [normalized, ...current];
  setSubscriptionsClient(next);
  return next.includes(normalized);
}

export function getActivityClient(): WatchActivity {
  if (typeof window === "undefined") {
    return { channelSlugs: [], categorySlugs: [] };
  }
  const fromStorage = window.localStorage.getItem(ACTIVITY_STORAGE_KEY);
  if (fromStorage != null) return parseActivity(fromStorage);
  return parseActivity(readCookie(ACTIVITY_COOKIE));
}

export function recordWatchActivityClient(input: {
  channelSlug?: string | null;
  categorySlug?: string | null;
}) {
  const current = getActivityClient();
  const channelSlugs = [...current.channelSlugs];
  const categorySlugs = [...current.categorySlugs];
  if (input.channelSlug) {
    const s = input.channelSlug.toLowerCase();
    const next = [s, ...channelSlugs.filter((x) => x !== s)].slice(0, 20);
    channelSlugs.splice(0, channelSlugs.length, ...next);
  }
  if (input.categorySlug) {
    const s = input.categorySlug.toLowerCase();
    const next = [s, ...categorySlugs.filter((x) => x !== s)].slice(0, 20);
    categorySlugs.splice(0, categorySlugs.length, ...next);
  }
  const value = serializeActivity({ channelSlugs, categorySlugs });
  window.localStorage.setItem(ACTIVITY_STORAGE_KEY, value);
  writeCookie(ACTIVITY_COOKIE, value);
  emitChange();
}

export function getAffinityClient(): AffinityPrefs {
  if (typeof window === "undefined") {
    return { channelSlugs: [], categorySlugs: [] };
  }
  const fromStorage = window.localStorage.getItem(AFFINITY_STORAGE_KEY);
  if (fromStorage != null) return parseAffinity(fromStorage);
  return parseAffinity(readCookie(AFFINITY_COOKIE));
}

export function recordAffinityClient(input: {
  channelSlug?: string | null;
  categorySlug?: string | null;
}) {
  const current = getAffinityClient();
  let channelSlugs = [...current.channelSlugs];
  let categorySlugs = [...current.categorySlugs];
  if (input.channelSlug) {
    const s = input.channelSlug.toLowerCase();
    channelSlugs = [s, ...channelSlugs.filter((x) => x !== s)].slice(0, 30);
    // Asking for more of a channel clears a prior hide for that channel.
    const hidden = getHiddenChannelsClient().filter((x) => x !== s);
    if (hidden.length !== getHiddenChannelsClient().length) {
      setHiddenChannelsClient(hidden);
    }
  }
  if (input.categorySlug) {
    const s = input.categorySlug.toLowerCase();
    categorySlugs = [s, ...categorySlugs.filter((x) => x !== s)].slice(0, 20);
  }
  const value = serializeAffinity({ channelSlugs, categorySlugs });
  window.localStorage.setItem(AFFINITY_STORAGE_KEY, value);
  writeCookie(AFFINITY_COOKIE, value);
  emitChange();
}

export function getHiddenChannelsClient(): string[] {
  if (typeof window === "undefined") return [];
  const fromStorage = window.localStorage.getItem(HIDE_CHANNELS_STORAGE_KEY);
  if (fromStorage != null) return parseSlugList(fromStorage, 40);
  return parseSlugList(readCookie(HIDE_CHANNELS_COOKIE), 40);
}

export function setHiddenChannelsClient(slugs: string[]) {
  const value = serializeSlugList(slugs.slice(0, 40));
  window.localStorage.setItem(HIDE_CHANNELS_STORAGE_KEY, value);
  writeCookie(HIDE_CHANNELS_COOKIE, value);
  emitChange();
}

export function hideChannelClient(slug: string): string[] {
  const normalized = slug.toLowerCase();
  const next = [
    normalized,
    ...getHiddenChannelsClient().filter((s) => s !== normalized),
  ].slice(0, 40);
  setHiddenChannelsClient(next);
  // Hide overrides affinity for that channel.
  const affinity = getAffinityClient();
  if (affinity.channelSlugs.includes(normalized)) {
    const value = serializeAffinity({
      channelSlugs: affinity.channelSlugs.filter((s) => s !== normalized),
      categorySlugs: affinity.categorySlugs,
    });
    window.localStorage.setItem(AFFINITY_STORAGE_KEY, value);
    writeCookie(AFFINITY_COOKIE, value);
  }
  return next;
}

/** Keep cookie in sync with localStorage on load (SSR feed reads cookies). */
export function hydratePreferencesCookies() {
  if (typeof window === "undefined") return;
  const subs = window.localStorage.getItem(SUBS_STORAGE_KEY);
  if (subs != null) writeCookie(SUBS_COOKIE, serializeSlugList(parseSlugList(subs)));
  else {
    const cookieSubs = readCookie(SUBS_COOKIE);
    if (cookieSubs) window.localStorage.setItem(SUBS_STORAGE_KEY, cookieSubs);
  }
  const activity = window.localStorage.getItem(ACTIVITY_STORAGE_KEY);
  if (activity != null) {
    writeCookie(ACTIVITY_COOKIE, serializeActivity(parseActivity(activity)));
  } else {
    const cookieActivity = readCookie(ACTIVITY_COOKIE);
    if (cookieActivity) {
      window.localStorage.setItem(ACTIVITY_STORAGE_KEY, cookieActivity);
    }
  }
  const affinity = window.localStorage.getItem(AFFINITY_STORAGE_KEY);
  if (affinity != null) {
    writeCookie(AFFINITY_COOKIE, serializeAffinity(parseAffinity(affinity)));
  } else {
    const cookieAffinity = readCookie(AFFINITY_COOKIE);
    if (cookieAffinity) {
      window.localStorage.setItem(AFFINITY_STORAGE_KEY, cookieAffinity);
    }
  }
  const hidden = window.localStorage.getItem(HIDE_CHANNELS_STORAGE_KEY);
  if (hidden != null) {
    writeCookie(HIDE_CHANNELS_COOKIE, serializeSlugList(parseSlugList(hidden, 40)));
  } else {
    const cookieHidden = readCookie(HIDE_CHANNELS_COOKIE);
    if (cookieHidden) {
      window.localStorage.setItem(HIDE_CHANNELS_STORAGE_KEY, cookieHidden);
    }
  }
}
