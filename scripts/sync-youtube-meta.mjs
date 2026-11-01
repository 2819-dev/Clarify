/**
 * Sync real YouTube channel art/descriptions + video titles/thumbs/authors.
 * Writes into data/catalog-seed.json and public/channels/*.
 */
import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedPath = path.join(root, "data/catalog-seed.json");
const outDir = path.join(root, "public/channels");
fs.mkdirSync(outDir, { recursive: true });

const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 800) throw new Error(`too small ${buf.length}`);
  fs.writeFileSync(dest, buf);
  return buf.length;
}

function unescapeYt(s) {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\u0026/g, "&")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u2019/g, "'")
    .replace(/\\u2014/g, "—");
}

function parseSubs(text) {
  if (!text) return null;
  const m = text.replace(/,/g, "").match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return null;
  let n = parseFloat(m[1]);
  const u = (m[2] || "").toUpperCase();
  if (u === "K") n *= 1e3;
  if (u === "M") n *= 1e6;
  if (u === "B") n *= 1e9;
  return Math.round(n);
}

function widestBanner(urls) {
  if (!urls?.length) return null;
  return [...urls].sort((a, b) => {
    const wa = Number(a.match(/=w(\d+)/)?.[1] || 0);
    const wb = Number(b.match(/=w(\d+)/)?.[1] || 0);
    return wb - wa;
  })[0];
}

async function syncChannel(browser, ch) {
  if (!ch.youtube_url) {
    return { slug: ch.slug, skipped: true };
  }
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  try {
    await page.goto(ch.youtube_url.replace(/\/$/, ""), {
      waitUntil: "domcontentloaded",
      timeout: 70000,
    });
    await new Promise((r) => setTimeout(r, 2800));

    const extracted = await page.evaluate(() => {
      let yt = null;
      for (const s of document.querySelectorAll("script")) {
        const t = s.textContent || "";
        const m = t.match(/var ytInitialData = (\{.*?\});/s);
        if (m) {
          try {
            yt = JSON.parse(m[1]);
            break;
          } catch {
            /* ignore */
          }
        }
      }
      const raw = yt ? JSON.stringify(yt) : "";
      const fcrop = [
        ...raw.matchAll(/https:[^"\\]+fcrop64[^"\\]+/g),
      ].map((x) => x[0].replace(/\\u0026/g, "&"));
      const avatars = [
        ...raw.matchAll(/"avatar":\{"thumbnails":\[(.*?)\]\}/g),
      ].flatMap((m) =>
        [...m[1].matchAll(/"url":"(https:[^"]+)"/g)].map((x) =>
          x[1].replace(/\\u0026/g, "&"),
        ),
      );
      const domBanner =
        document.querySelector(
          "yt-image-banner-view-model img, #page-header-banner img",
        )?.src || null;
      const og = document.querySelector('meta[property="og:image"]')?.content;
      const metaDesc =
        document.querySelector('meta[name="description"]')?.content || "";
      const descMatches = [...raw.matchAll(/"description":"(.*?)"/g)].map(
        (m) => m[1],
      );
      const sub =
        raw.match(/"subscriberCountText":\{"simpleText":"([^"]+)"\}/)?.[1] ||
        raw.match(/"subscriberCountText":\{"content":"([^"]+)"\}/)?.[1] ||
        null;
      const title =
        document.querySelector('meta[property="og:title"]')?.content ||
        document.title.replace(/ - YouTube$/, "");
      return {
        fcrop,
        avatars,
        domBanner,
        og,
        metaDesc,
        descMatches: descMatches.slice(0, 8),
        sub,
        title,
      };
    });

    const bannerSrc = widestBanner(extracted.fcrop) || extracted.domBanner;
    let avatarSrc =
      extracted.avatars.sort(
        (a, b) =>
          Number(b.match(/=s(\d+)/)?.[1] || 0) -
          Number(a.match(/=s(\d+)/)?.[1] || 0),
      )[0] || extracted.og;
    if (avatarSrc) {
      avatarSrc = avatarSrc.replace(/=s\d+(-c-k-c0x00ffffff-no-rj)?/, "=s800-c-k-c0x00ffffff-no-rj");
    }

    // Prefer longest real channel description (not truncated meta)
    let description =
      extracted.descMatches
        .map(unescapeYt)
        .filter((d) => d.length > 40)
        .sort((a, b) => b.length - a.length)[0] || extracted.metaDesc;
    description = description.replace(/\s+/g, " ").trim().slice(0, 600);

    const result = {
      slug: ch.slug,
      name: (extracted.title || ch.name).replace(/ - YouTube$/, "").trim(),
      description,
      subscriber_count: parseSubs(extracted.sub) ?? ch.subscriber_count,
    };

    if (avatarSrc) {
      const dest = path.join(outDir, `${ch.slug}-avatar.jpg`);
      try {
        await download(avatarSrc, dest);
        result.avatar_url = `/channels/${ch.slug}-avatar.jpg`;
      } catch (e) {
        result.avatar_error = String(e.message || e);
      }
    }

    if (bannerSrc) {
      const dest = path.join(outDir, `${ch.slug}-banner.jpg`);
      try {
        await download(bannerSrc, dest);
        result.banner_url = `/channels/${ch.slug}-banner.jpg`;
      } catch (e) {
        result.banner_error = String(e.message || e);
      }
    }

    console.log(
      ch.slug,
      "avatar",
      !!result.avatar_url,
      "banner",
      !!result.banner_url,
      "desc",
      (result.description || "").slice(0, 48),
    );
    return result;
  } catch (e) {
    console.log(ch.slug, "FAIL", e.message || e);
    return { slug: ch.slug, error: String(e.message || e) };
  } finally {
    await page.close().catch(() => {});
  }
}

async function oembed(id) {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`oembed ${res.status}`);
  return res.json();
}

async function probeThumb(id) {
  // Prefer true 16:9 landscape thumbs
  for (const name of ["maxresdefault", "sddefault", "hq720", "mqdefault"]) {
    const url = `https://i.ytimg.com/vi/${id}/${name}.jpg`;
    try {
      const res = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA } });
      if (res.ok) {
        // YouTube sometimes returns a tiny placeholder for missing maxres
        const len = Number(res.headers.get("content-length") || 0);
        if (name === "maxresdefault" && len > 0 && len < 5000) continue;
        return url;
      }
    } catch {
      /* try next */
    }
  }
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

async function isShort(id) {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${id}`, {
      method: "HEAD",
      redirect: "manual",
      headers: { "User-Agent": UA },
    });
    // Non-shorts usually redirect to /watch?v=…
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location") || "";
      return /\/shorts\//.test(loc) && !/\/watch/.test(loc);
    }
    // 200 on HEAD typically means the Shorts URL is valid
    return res.status === 200;
  } catch {
    return false;
  }
}

function categorize(title, channelName, is_short, queryHint = "") {
  const t = `${title} ${channelName} ${queryHint}`.toLowerCase();
  if (
    /hanukkah|chanukah|dreidel|menorah|latke|maoz|purim|esther|passover|pesach|dayenu|seder|rosh hashanah|yom kippur|sukkot|simchat|tu bishvat|lag baomer/.test(
      t,
    )
  ) {
    return ["holidays", "Holidays"];
  }
  if (/shabbat|shalom aleichem|havdalah|candle lighting|friday night/.test(t)) {
    return ["shabbat", "Shabbat"];
  }
  if (/modeh|oseh shalom|shema|adon olam|prayer|blessing|liturgy/.test(t)) {
    return ["prayer", "Prayer"];
  }
  if (/aleph|alef|hebrew alphabet|learning hebrew|hebrew letter/.test(t)) {
    return ["hebrew", "Learning Hebrew"];
  }
  if (
    /torah|parsha|moses|noah|david and goliath|bible story|jewish story|folktale|bedtime story/.test(
      t,
    )
  ) {
    return ["torah", "Torah & Stories"];
  }
  if (/story|stories|sesame|pj library|cartoon|folktale/.test(t) && !/song|sing|music|a cappella/.test(t)) {
    return ["stories", "Stories"];
  }
  if (
    /nature|animal|ocean|aquarium|rainforest|wildlife|relaxation|sleep|calm nature|4k ultra/.test(
      t,
    ) && !/song|music|sing/.test(t)
  ) {
    return ["family", "Family & Calm"];
  }
  // Music / songs / a cappella / electronic / short music
  if (
    /song|sing|music|a cappella|acapella|maccabeats|six13|lullaby|echoes|flow|tides|melody|choir|band|album|track|remix|medley|karaoke|lyrics video/.test(
      t,
    ) ||
    /bighappysmiley|jewish kids music|holiday songs|learning station|kita|jammin/.test(
      t,
    )
  ) {
    return ["music", "Music"];
  }
  if (is_short) return ["music", "Music"];
  return ["music", "Music"];
}

const browser = await puppeteer.launch({
  executablePath: "/usr/local/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});

const channelResults = [];
for (const ch of seed.channels) {
  const synced = await syncChannel(browser, ch);
  channelResults.push(synced);
  if (!synced.error && !synced.skipped) {
    if (synced.name) ch.name = synced.name;
    if (synced.description) ch.description = synced.description;
    if (synced.avatar_url) ch.avatar_url = synced.avatar_url;
    if (synced.banner_url) ch.banner_url = synced.banner_url;
    if (synced.subscriber_count != null) ch.subscriber_count = synced.subscriber_count;
  }
}
await browser.close();

// For channels without a banner, use a landscape video thumb as banner fallback
const videosByChannel = {};
for (const v of seed.videos) (videosByChannel[v.channel_slug] ||= []).push(v);
for (const ch of seed.channels) {
  if (ch.banner_url) continue;
  const vids = videosByChannel[ch.slug] || [];
  if (!vids.length) continue;
  // Will set after thumb sync using mqdefault
  ch._banner_from_video = vids[0].youtube_id;
}

console.log("\nSyncing video metadata…");
const CONCURRENCY = 8;
let vi = 0;
async function syncVideo(v) {
  try {
    const [meta, thumb, short] = await Promise.all([
      oembed(v.youtube_id),
      probeThumb(v.youtube_id),
      isShort(v.youtube_id),
    ]);
    v.title = meta.title || v.title;
    if (meta.author_name) {
      if (
        v.channel_slug === "bighappysmiley" ||
        /bighappysmiley/i.test(meta.author_name)
      ) {
        v.channel_name = "BigHappySmiley";
      } else {
        const ch = seed.channels.find((c) => c.slug === v.channel_slug);
        v.channel_name = ch?.name || meta.author_name;
      }
    }
    v.thumbnail_url = thumb;
    v.is_short = short;
    const [category_slug, category] = categorize(
      v.title,
      v.channel_name,
      v.is_short,
    );
    v.category_slug = category_slug;
    v.category = category;
    v.description = v.is_short
      ? `YouTube Short from ${v.channel_name}.`
      : `From ${v.channel_name} on YouTube.`;
  } catch (e) {
    v.thumbnail_url = `https://i.ytimg.com/vi/${v.youtube_id}/mqdefault.jpg`;
    v.is_short = Boolean(v.is_short);
    const [category_slug, category] = categorize(
      v.title,
      v.channel_name,
      v.is_short,
    );
    v.category_slug = category_slug;
    v.category = category;
    console.log("video fail", v.youtube_id, e.message || e);
  } finally {
    vi++;
    if (vi % 40 === 0) console.log(`videos ${vi}/${seed.videos.length}`);
  }
}
{
  let i = 0;
  async function worker() {
    while (i < seed.videos.length) {
      const idx = i++;
      await syncVideo(seed.videos[idx]);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
}

for (const ch of seed.channels) {
  if (ch.banner_url) continue;
  const id = ch._banner_from_video;
  if (!id) continue;
  const thumb =
    videosByChannel[ch.slug]?.[0]?.thumbnail_url ||
    `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  // Download landscape thumb as banner fallback
  try {
    const dest = path.join(outDir, `${ch.slug}-banner.jpg`);
    await download(thumb.replace("/mqdefault.jpg", "/maxresdefault.jpg").replace("/hqdefault.jpg", "/maxresdefault.jpg"), dest).catch(
      () => download(thumb, dest),
    );
    ch.banner_url = `/channels/${ch.slug}-banner.jpg`;
  } catch {
    ch.banner_url = thumb;
  }
  delete ch._banner_from_video;
}

fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n");
fs.writeFileSync(
  "/tmp/clarify-art/channel-sync.json",
  JSON.stringify(channelResults, null, 2),
);
const shorts = seed.videos.filter((v) => v.is_short).length;
const music = seed.videos.filter((v) => v.category_slug === "music").length;
const banners = seed.channels.filter((c) => c.banner_url).length;
console.log(
  JSON.stringify(
    {
      videos: seed.videos.length,
      channels: seed.channels.length,
      banners,
      shorts,
      music,
      bhs: seed.videos
        .filter((v) => v.channel_slug === "bighappysmiley")
        .map((v) => ({
          title: v.title,
          cat: v.category_slug,
          short: v.is_short,
          thumb: v.thumbnail_url,
        })),
    },
    null,
    2,
  ),
);
