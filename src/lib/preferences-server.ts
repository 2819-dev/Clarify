import { cookies } from "next/headers";
import {
  ACTIVITY_COOKIE,
  SUBS_COOKIE,
  parseActivity,
  parseSlugList,
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
