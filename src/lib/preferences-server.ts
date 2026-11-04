import { cookies } from "next/headers";
import {
  ACTIVITY_COOKIE,
  AFFINITY_COOKIE,
  HIDE_CHANNELS_COOKIE,
  SUBS_COOKIE,
  parseActivity,
  parseAffinity,
  parseSlugList,
  type AffinityPrefs,
  type WatchActivity,
} from "./preferences";

export async function getSubscriptionSlugs(): Promise<string[]> {
  const jar = await cookies();
  return parseSlugList(jar.get(SUBS_COOKIE)?.value);
}

export async function getWatchActivity(): Promise<WatchActivity> {
  const jar = await cookies();
  return parseActivity(jar.get(ACTIVITY_COOKIE)?.value);
}

export async function getAffinityPrefs(): Promise<AffinityPrefs> {
  const jar = await cookies();
  return parseAffinity(jar.get(AFFINITY_COOKIE)?.value);
}

export async function getHiddenChannelSlugs(): Promise<string[]> {
  const jar = await cookies();
  return parseSlugList(jar.get(HIDE_CHANNELS_COOKIE)?.value, 40);
}
