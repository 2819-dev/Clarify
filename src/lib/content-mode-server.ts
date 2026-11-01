import { cookies } from "next/headers";
import {
  CONTENT_MODE_COOKIE,
  type ContentMode,
  parseContentMode,
} from "./content-mode";

export async function getContentMode(): Promise<ContentMode> {
  const jar = await cookies();
  return parseContentMode(jar.get(CONTENT_MODE_COOKIE)?.value);
}
