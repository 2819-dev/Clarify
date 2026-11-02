/**
 * Heavy expand: Jewish shiurim (Torah classes) + entertaining family-safe Jewish content.
 * Channel HTML + oEmbed iframe gate (Atom/watch often blocked). Real @handles.
 *
 * Usage: node scripts/expand-jewish-shiurim-fun.mjs
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envText = readFileSync(resolve(root, ".env.local"), "utf8");
const databaseUrl =
  process.env.DATABASE_URL ||
  envText.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL required");
const sql = neon(databaseUrl);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/** [handle, kind] kind: shiur | fun | both */
const TARGETS = [
  // —— Shiurim / Torah classes / lectures ——
  ["torahanytime", "shiur"],
  ["torahanytimeofficial", "shiur"],
  ["yutorah", "shiur"],
  ["yuitorah", "shiur"],
  ["ou torah", "shiur"],
  ["outorah", "shiur"],
  ["orthodoxunion", "shiur"],
  ["aish", "shiur"],
  ["aishcom", "shiur"],
  ["aishvideo", "shiur"],
  ["hidabroot", "shiur"],
  ["hidabrootcom", "shiur"],
  ["alephbeta", "shiur"],
  ["alephbetaacademy", "shiur"],
  ["rabbisacks", "shiur"],
  ["rabbijonathansacks", "shiur"],
  ["theRabbiSacks", "shiur"],
  ["manisfriedman", "shiur"],
  ["rabbi manisfriedman", "shiur"],
  ["meaningfulminute", "shiur"],
  ["yyjacobson", "shiur"],
  ["theyeshiva", "shiur"],
  ["theyeshivanet", "shiur"],
  ["simonjacobson", "shiur"],
  ["inspirationaljewishideas", "shiur"],
  ["jewishpathways", "shiur"],
  ["partnersinjudaism", "shiur"],
  ["jewsforjudaism", "shiur"],
  ["simpletoremember", "shiur"],
  ["torahcafe", "shiur"],
  ["18forty", "shiur"],
  ["pardesinstitute", "shiur"],
  ["pardes", "shiur"],
  ["hartmaninstitute", "shiur"],
  ["shalomhartman", "shiur"],
  ["mechonhadar", "shiur"],
  ["hadarinstitute", "shiur"],
  ["drisha", "shiur"],
  ["yctharova", "shiur"],
  ["riets", "shiur"],
  ["yeshivauniversity", "shiur"],
  ["yutorahonline", "shiur"],
  ["chabadorg", "shiur"],
  ["jewishlearninginstitute", "shiur"],
  ["jliinspire", "shiur"],
  ["myjewishlearning", "shiur"],
  ["sefaria", "shiur"],
  ["sefariaproject", "shiur"],
  ["unpacked", "shiur"],
  ["jewishunpacked", "shiur"],
  ["prageru", "shiur"],
  ["gemaraacademy", "shiur"],
  ["daf yomi", "shiur"],
  ["dafyomi", "shiur"],
  ["dafyomilive", "shiur"],
  ["oukosher", "shiur"],
  ["rabbiangel", "shiur"],
  ["rabbimiller", "shiur"],
  ["rabbikantor", "shiur"],
  ["rabbilevine", "shiur"],
  ["rabbiwein", "shiur"],
  ["rabbiweinreb", "shiur"],
  ["rabbibreitowitz", "shiur"],
  ["rabbibreitowitzztl", "shiur"],
  ["rabbiretzners", "shiur"],
  ["rabbiretznershiurim", "shiur"],
  ["rabbimansour", "shiur"],
  ["rabbijoshyoseph", "shiur"],
  ["rabbijoshyosef", "shiur"],
  ["rabbijaykelman", "shiur"],
  ["rabbileibkelleman", "shiur"],
  ["rabbileibkalehman", "shiur"],
  ["rabbiztvihershweinreb", "shiur"],
  ["rabbidsavidfohrman", "shiur"],
  ["davidfohrman", "shiur"],
  ["rabbifoorman", "shiur"],
  ["alephbetatorah", "shiur"],
  ["torahthinking", "shiur"],
  ["innerTorah", "shiur"],
  ["innertorah", "shiur"],
  ["breslov", "shiur"],
  ["breslovresearch", "shiur"],
  ["nabreslov", "shiur"],
  ["ravaragil", "shiur"],
  ["haravargil", "shiur"],
  ["ravkook", "shiur"],
  ["orot", "shiur"],
  ["torahmitzion", "shiur"],
  ["worldmizrachi", "shiur"],
  ["religiouszionist", "shiur"],
  ["ouisrael", "shiur"],
  ["nishmata", "shiur"],
  ["nishmat", "shiur"],
  ["matan", "shiur"],
  ["matanjerusalem", "shiur"],
  ["midreshet", "shiur"],
  ["midreshetlindenbaum", "shiur"],
  ["migdaloz", "shiur"],
  ["shapell", "shiur"],
  ["shapellcollege", "shiur"],
  ["orahsomayach", "shiur"],
  ["ohr", "shiur"],
  ["ohrsomayach", "shiur"],
  ["neveyerushalayim", "shiur"],
  ["mayanjot", "shiur"],
  ["mayanjotisrael", "shiur"],
  ["torahinmotion", "shiur"],
  ["jewishhistory", "shiur"],
  ["jewishhistorychannel", "shiur"],
  ["jewishhistoryonline", "shiur"],
  ["torahanytimevideos", "shiur"],
  ["shiurim", "shiur"],
  ["dailyshiur", "shiur"],
  ["parshashiur", "shiur"],
  ["weeklyparsha", "shiur"],
  ["parshaoftheweek", "shiur"],
  ["rabbileibtaglich", "shiur"],
  ["rabbipinchaswinston", "shiur"],
  ["rabbizweig", "shiur"],
  ["rabbizweigtorah", "shiur"],
  ["torah.org", "shiur"],
  ["torahorg", "shiur"],
  ["projectgenesis", "shiur"],
  ["virtualyeshiva", "shiur"],
  ["onlineyeshiva", "shiur"],
  ["webuyeshiva", "shiur"],
  ["webyeshiva", "shiur"],
  ["jewishpodcasts", "shiur"],
  ["tabletmag", "shiur"],
  ["forward", "shiur"],
  ["momentmagazine", "shiur"],
  // —— Entertaining family-safe Jewish ——
  ["bighappysmiley", "fun"],
  ["bimbam", "fun"],
  ["jewishkidsfavorites", "fun"],
  ["chabadkidsvideos", "fun"],
  ["ckids", "fun"],
  ["jewishkids", "fun"],
  ["shalomsesame", "fun"],
  ["pjlibraryofficial", "fun"],
  ["pjlibrary", "fun"],
  ["six13sings", "fun"],
  ["themaccabeats", "fun"],
  ["maccabeats", "fun"],
  ["8thdayband", "fun"],
  ["zusha", "fun"],
  ["bennyfriedman", "fun"],
  ["bennyfriedmanmusic", "fun"],
  ["gadelbaz", "fun"],
  ["gadelbazofficial", "fun"],
  ["yaakovshwekey", "fun"],
  ["yaakovshwekeyofficial", "fun"],
  ["avrahamfried", "fun"],
  ["avrahamfriedofficial", "fun"],
  ["mordechaishapiro", "fun"],
  ["ishayribo", "fun"],
  ["ishayriboofficial", "fun"],
  ["lipaschmeltzer", "fun"],
  ["moishiehellman", "fun"],
  ["eliav", "fun"],
  ["bluefringemusic", "fun"],
  ["jewishrockradio", "fun"],
  ["jewishacappella", "fun"],
  ["jewbelong", "fun"],
  ["mayimbialik", "fun"],
  ["jamiegeller", "fun"],
  ["leahcookskosher", "fun"],
  ["kosherdotcom", "fun"],
  ["jewlish", "fun"],
  ["busyinjthekitchen", "fun"],
  ["betweencarpools", "fun"],
  ["homegrownkosher", "fun"],
  ["cookingkosher", "fun"],
  ["modi", "fun"],
  ["modilive", "fun"],
  ["drybarcomedy", "fun"],
  ["jewishcomedy", "fun"],
  ["koshercomedy", "fun"],
  ["jewinthecity", "fun"],
  ["jewlicious", "fun"],
  ["heyalma", "fun"],
  ["kveller", "fun"],
  ["18doors", "fun"],
  ["hillelinternational", "fun"],
  ["standwithus", "fun"],
  ["israel21c", "fun"],
  ["theisraelguys", "fun"],
  ["israelwithilan", "fun"],
  ["travelisrael", "fun"],
  ["youliketravel", "fun"],
  ["lehrbros", "fun"],
  ["coreygilburd", "fun"],
  ["twojews", "fun"],
  ["jewishontiktok", "fun"],
  ["jewishshorts", "fun"],
  ["jewishhumor", "fun"],
  ["jewishmemes", "fun"],
  ["jewishstoriesforkids", "fun"],
  ["hebrewfairytales", "fun"],
  ["hebrewfairytalesrhymes", "fun"],
  ["clappyandfrank", "fun"],
  ["clappyfrank", "fun"],
  ["arkparty", "fun"],
  ["torahkids", "fun"],
  ["torahtown", "fun"],
  ["teachtorahtokids", "fun"],
  ["jewishlullabies", "fun"],
  ["jewishbabysongs", "fun"],
  ["shabbatsongs", "fun"],
  ["shabbatproject", "fun"],
  ["theshabbatproject", "fun"],
  ["osehshalom", "fun"],
  ["jewishmagic", "fun"],
  ["jewishcookingshow", "fun"],
  ["koshercooksoff", "fun"],
  ["jewishfoodhero", "fun"],
  ["jamie geller show", "fun"],
  ["naomihadra", "fun"],
  ["friedavizel", "fun"],
  ["sergioandrhoda", "fun"],
  ["sergiorhoda", "fun"],
  ["livinglashon", "fun"],
  ["hebrewwithhila", "fun"],
  ["hebrewpod101", "fun"],
  ["ulpanor", "fun"],
  ["teachmehebrew", "fun"],
  ["easyhebrew", "fun"],
  ["jewishmusiccentral", "fun"],
  ["neshomah", "fun"],
  ["ruachband", "fun"],
  ["shirachadasha", "fun"],
  ["hatikvahmusic", "fun"],
  ["matisyahu", "fun"],
  ["matisyaahu", "fun"],
  ["jewisha cappella", "fun"],
  ["yeshivaboyschoir", "fun"],
  ["miami boys choir", "fun"],
  ["miamiboyschoir", "fun"],
  ["shwekey", "fun"],
  ["fried", "fun"],
  ["dovestar", "fun"],
  ["beriberimusic", "fun"],
  ["jewishtalent", "fun"],
  ["jewishtalentshow", "fun"],
  ["yiddishbookcenter", "fun"],
  ["nationalyiddish", "fun"],
  ["yivoinstitute", "fun"],
  ["museumofjewishheritage", "fun"],
  ["thejewishmuseum", "fun"],
  ["skirball", "fun"],
  ["skirballculturalcenter", "fun"],
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function normalizeUsername(raw) {
  return String(raw || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[-.]+|[-.]+$/g, "")
    .replace(/--+/g, "-")
    .slice(0, 30);
}

function isValidUsername(username) {
  return /^[a-z0-9](?:[a-z0-9._-]{0,28}[a-z0-9])?$|^[a-z0-9]$/.test(username);
}

function extractChannelId(html) {
  for (const re of [
    /"channelId":"(UC[\w-]{20,})"/,
    /"externalId":"(UC[\w-]{20,})"/,
    /youtube\.com\/channel\/(UC[\w-]{20,})/,
  ]) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

function extractMeta(html, handle) {
  const channelId = extractChannelId(html);
  let name =
    html.match(/"channelMetadataRenderer":\{"title":"([^"\\]+)"/)?.[1] ||
    html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] ||
    handle;
  if (/^(AUDIO_|CHECK_|PLAY_|ICON_|BUTTON_)/i.test(name)) {
    name =
      html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] ||
      handle;
  }
  const description =
    html.match(/<meta property="og:description" content="([^"]*)"/i)?.[1] ||
    "";
  const avatar =
    html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1] || null;
  const cleanName = String(name)
    .replace(/ - YouTube$/i, "")
    .replace(/\\u0026/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
  return {
    channelId,
    name: cleanName,
    description: description.slice(0, 800),
    avatar,
  };
}

function parseRelativeDate(text) {
  if (!text) return null;
  const now = Date.now();
  const t = text.toLowerCase().trim();
  const m = t.match(
    /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/,
  );
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2];
  const ms =
    unit.startsWith("second")
      ? n * 1000
      : unit.startsWith("minute")
        ? n * 60_000
        : unit.startsWith("hour")
          ? n * 3_600_000
          : unit.startsWith("day")
            ? n * 86_400_000
            : unit.startsWith("week")
              ? n * 7 * 86_400_000
              : unit.startsWith("month")
                ? n * 30 * 86_400_000
                : n * 365 * 86_400_000;
  return new Date(now - ms).toISOString();
}

function parseVideosFromChannelHtml(html, channelName) {
  const entries = [];
  const seen = new Set();
  for (const m of html.matchAll(
    /"videoId":"([\w-]{11})"[^]{0,400}?"publishedTimeText":\{"simpleText":"([^"]+)"/g,
  )) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    entries.push({
      youtubeId: id,
      title: `${channelName} video`,
      publishedAt: parseRelativeDate(m[2]),
      channelName,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    });
    if (entries.length >= 55) break;
  }
  if (entries.length < 12) {
    for (const m of html.matchAll(/"videoId":"([\w-]{11})"/g)) {
      const id = m[1];
      if (seen.has(id)) continue;
      seen.add(id);
      entries.push({
        youtubeId: id,
        title: `${channelName} video`,
        publishedAt: null,
        channelName,
        thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      });
      if (entries.length >= 55) break;
    }
  }
  return entries;
}

async function isEmbeddable(youtubeId) {
  for (let i = 0; i < 3; i++) {
    try {
      const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${youtubeId}`,
      )}&format=json`;
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(900 * (i + 1));
        continue;
      }
      if (!res.ok) return null;
      return res.json();
    } catch {
      await sleep(400 * (i + 1));
    }
  }
  return null;
}

function guessCategory(title, kind) {
  const t = title.toLowerCase();
  if (/\b(hanukkah|chanukah|purim|passover|pesach|sukkot|rosh|yom kippur|shavuot)\b/.test(t))
    return ["holidays", "Holidays"];
  if (/\b(shabbat|shabbos|kabbalat)\b/.test(t)) return ["shabbat", "Shabbat"];
  if (/\b(modeh ani|shema|prayer|tefill|brach|bracha|amidah|oseh shalom)\b/.test(t))
    return ["prayer", "Prayer"];
  if (/\b(aleph|hebrew|ivrit|alphabet)\b/.test(t)) return ["hebrew", "Learning Hebrew"];
  if (
    /\b(shiur|parsha|torah|midrash|talmud|gemara|rashi|halacha|halakh|daf yomi|mussar|chassid|hasidic|rebbe|rabbi)\b/.test(
      t,
    )
  )
    return ["torah", "Torah & Stories"];
  if (/\b(song|sing|music|a cappella|acapella|niggun|cover|choir|concert)\b/.test(t))
    return ["music", "Music"];
  if (/\b(cook|recipe|bake|kitchen|food|kosher|challah)\b/.test(t))
    return ["cooking", "Cooking"];
  if (/\b(comedy|funny|stand.?up|humor|joke|prank)\b/.test(t))
    return ["comedy", "Clean Comedy"];
  if (/\b(craft|diy|draw|paint)\b/.test(t)) return ["crafts", "Crafts & DIY"];
  if (/\b(history|holocaust|shoah|heritage)\b/.test(t)) return ["history", "History"];
  if (kind === "shiur") return ["torah", "Torah & Stories"];
  if (kind === "fun") return ["family", "Family & Calm"];
  return ["family", "Family & Calm"];
}

async function ensureTargets() {
  const existing = await sql`SELECT slug, username, youtube_url FROM channels`;
  const byHandle = new Set();
  for (const row of existing) {
    if (row.username) byHandle.add(String(row.username).toLowerCase());
    const at = row.youtube_url?.match(/youtube\.com\/@([^/?#]+)/i)?.[1];
    if (at) byHandle.add(decodeURIComponent(at).toLowerCase());
    byHandle.add(String(row.slug).toLowerCase());
  }

  const added = [];
  let skipped = 0;
  let failed = 0;

  for (const [handleRaw, kind] of TARGETS) {
    if (handleRaw.includes(" ")) {
      skipped++;
      continue;
    }
    const handle = handleRaw;
    const key = handle.toLowerCase();
    if (byHandle.has(key)) {
      skipped++;
      continue;
    }
    const url = `https://www.youtube.com/@${handle}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html" },
        redirect: "follow",
      });
      await sleep(240);
      if (!res.ok) {
        failed++;
        continue;
      }
      const html = await res.text();
      const meta = extractMeta(html, handle);
      if (!meta.channelId) {
        failed++;
        continue;
      }
      const page = await fetch(url.replace(/\/$/, "") + "/videos", {
        headers: { "User-Agent": UA },
        redirect: "follow",
      });
      await sleep(180);
      if (!page.ok) {
        failed++;
        continue;
      }
      const vids = parseVideosFromChannelHtml(await page.text(), meta.name);
      let probeOk = false;
      for (const e of vids.slice(0, 5)) {
        const oe = await isEmbeddable(e.youtubeId);
        await sleep(140);
        if (oe?.title) {
          probeOk = true;
          break;
        }
      }
      if (!probeOk) {
        console.log(`skip non-embed @${handle} (${kind})`);
        failed++;
        continue;
      }
      const username = normalizeUsername(handle);
      if (!isValidUsername(username)) {
        failed++;
        continue;
      }
      const slug = slugify(meta.name) || username;
      const taken = await sql`
        SELECT 1 FROM channels WHERE slug=${slug} OR lower(username)=${username} LIMIT 1
      `;
      if (taken.length) {
        skipped++;
        continue;
      }
      await sql`
        INSERT INTO channels (
          slug, name, description, youtube_url, avatar_url,
          is_jewish, username, youtube_channel_id, is_active
        ) VALUES (
          ${slug}, ${meta.name}, ${meta.description || ""}, ${url}, ${meta.avatar},
          TRUE, ${username}, ${meta.channelId}, TRUE
        )
        ON CONFLICT (slug) DO NOTHING
      `;
      byHandle.add(username);
      byHandle.add(slug);
      added.push({ username, name: meta.name, kind, slug });
      console.log(`channel + @${username} (${meta.name}) [${kind}]`);
    } catch (err) {
      failed++;
      console.warn(`fail @${handle}:`, err.message);
    }
  }
  return { added, skipped, failed };
}

async function fetchUploads(ch) {
  if (!ch.youtube_url) return [];
  const byId = new Map();
  for (const path of ["/videos", "/shorts"]) {
    try {
      const res = await fetch(ch.youtube_url.replace(/\/$/, "") + path, {
        headers: { "User-Agent": UA, Accept: "text/html" },
        redirect: "follow",
      });
      await sleep(160);
      if (!res.ok) continue;
      for (const entry of parseVideosFromChannelHtml(
        await res.text(),
        ch.name,
      )) {
        if (!byId.has(entry.youtubeId)) byId.set(entry.youtubeId, entry);
      }
    } catch {
      /* ignore */
    }
  }
  return [...byId.values()];
}

async function expandChannels(channels, perChannel, kindHint = null) {
  const existingRows = await sql`SELECT youtube_id FROM videos`;
  const existing = new Set(existingRows.map((r) => r.youtube_id));
  let inserted = 0;
  let skippedEmbed = 0;
  let skippedExisting = 0;
  let errors = 0;
  const examples = [];

  for (const ch of channels) {
    try {
      const uploads = await fetchUploads(ch);
      let addedHere = 0;
      for (const entry of uploads.slice(0, perChannel)) {
        if (existing.has(entry.youtubeId)) {
          skippedExisting++;
          continue;
        }
        const meta = await isEmbeddable(entry.youtubeId);
        await sleep(160);
        if (!meta?.title) {
          skippedEmbed++;
          continue;
        }
        const title = meta.title || entry.title;
        const channelName = meta.author_name || entry.channelName || ch.name;
        const kind = kindHint || ch.kind || null;
        const [categorySlug, category] = guessCategory(title, kind);
        const isShort =
          /\b#shorts\b/i.test(title) ||
          (meta.height && meta.width && meta.height > meta.width);

        if (meta.author_url && /youtube\.com\/@/i.test(meta.author_url)) {
          const handle = normalizeUsername(
            meta.author_url.match(/youtube\.com\/@([^/?#]+)/i)?.[1],
          );
          if (isValidUsername(handle)) {
            try {
              await sql`
                UPDATE channels
                SET username = ${handle},
                    youtube_url = COALESCE(youtube_url, ${meta.author_url})
                WHERE id = ${ch.id}::uuid
                  AND NOT EXISTS (
                    SELECT 1 FROM channels c2
                    WHERE lower(c2.username) = ${handle}
                      AND c2.id <> ${ch.id}::uuid
                  )
              `;
            } catch {
              /* ignore */
            }
          }
        }

        await sql`
          INSERT INTO videos (
            youtube_id, title, description, channel_name, channel_id,
            category, category_slug, thumbnail_url, is_short, is_jewish,
            embeddable, is_active, published_at
          ) VALUES (
            ${entry.youtubeId},
            ${title},
            ${""},
            ${channelName},
            ${ch.id}::uuid,
            ${category},
            ${categorySlug},
            ${entry.thumbnailUrl || meta.thumbnail_url || `https://i.ytimg.com/vi/${entry.youtubeId}/hqdefault.jpg`},
            ${Boolean(isShort)},
            TRUE,
            TRUE,
            TRUE,
            ${entry.publishedAt}
          )
          ON CONFLICT (youtube_id) DO NOTHING
        `;
        existing.add(entry.youtubeId);
        inserted++;
        addedHere++;
        if (examples.length < 24) {
          examples.push({
            channel: ch.slug,
            username: ch.username,
            youtubeId: entry.youtubeId,
            title: title.slice(0, 80),
            category: categorySlug,
            kind,
          });
        }
        if (addedHere <= 2) {
          console.log(`+ ${ch.slug} ${entry.youtubeId} ${title.slice(0, 55)}`);
        }
      }
      console.log(`channel ${ch.slug}: +${addedHere} / ${uploads.length}`);
    } catch (err) {
      errors++;
      console.warn(`fail ${ch.slug}:`, err.message);
    }
  }
  return {
    inserted,
    skippedEmbed,
    skippedExisting,
    errors,
    channels: channels.length,
    examples,
  };
}

async function counts() {
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND embeddable) AS videos,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND COALESCE(is_jewish,true)) AS jewish,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND NOT COALESCE(is_jewish,true)) AS family_only,
      (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active,true)) AS channels,
      (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active,true) AND COALESCE(is_jewish,true)) AS jewish_ch,
      (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active,true) AND NOT COALESCE(is_jewish,true)) AS family_ch,
      (SELECT COUNT(*)::int FROM channels WHERE youtube_url ~* 'youtube\\.com/@') AS with_at,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND category_slug = 'torah') AS torah_videos,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND category_slug IN ('torah','prayer','hebrew')) AS shiurish_videos,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND category_slug IN ('music','comedy','family','cooking') AND COALESCE(is_jewish,true)) AS jewish_fun_videos
  `;
  return rows[0];
}

async function exportSeed() {
  const channels = await sql`
    SELECT slug, name, description, youtube_url, avatar_url, banner_url,
           subscriber_count, COALESCE(is_jewish, TRUE) AS is_jewish, username
    FROM channels WHERE COALESCE(is_active, TRUE) ORDER BY name`;
  const videos = await sql`
    SELECT v.youtube_id, v.title, v.description, ch.slug AS channel_slug,
           v.channel_name, v.category_slug, v.category, v.thumbnail_url,
           TRUE AS embeddable, COALESCE(v.is_short, FALSE) AS is_short,
           COALESCE(v.is_jewish, TRUE) AS is_jewish
    FROM videos v JOIN channels ch ON ch.id = v.channel_id
    WHERE v.is_active AND v.embeddable
    ORDER BY v.published_at DESC NULLS LAST`;
  const byCat = {};
  for (const v of videos) {
    byCat[v.category_slug || "family"] =
      (byCat[v.category_slug || "family"] || 0) + 1;
  }
  writeFileSync(
    resolve(root, "data/catalog-seed.json"),
    JSON.stringify(
      {
        counts: {
          videos: videos.length,
          channels: channels.length,
          by_category: byCat,
        },
        channels,
        videos,
      },
      null,
      2,
    ) + "\n",
  );
  return { videos: videos.length, channels: channels.length, by_category: byCat };
}

const before = await counts();
console.log("=== before ===");
console.log(JSON.stringify(before, null, 2));

console.log("=== add shiurim + entertaining Jewish @handles ===");
const chSummary = await ensureTargets();
console.log(
  JSON.stringify(
    {
      added: chSummary.added.length,
      skipped: chSummary.skipped,
      failed: chSummary.failed,
      examples: chSummary.added.slice(0, 30),
    },
    null,
    2,
  ),
);

console.log("=== expand newly added Jewish channels ===");
const fresh = await sql`
  SELECT ch.id, ch.slug, ch.name, ch.username, ch.youtube_url, ch.youtube_channel_id,
         TRUE AS is_jewish
  FROM channels ch
  WHERE COALESCE(ch.is_active, TRUE)
    AND COALESCE(ch.is_jewish, TRUE)
    AND ch.created_at > NOW() - INTERVAL '4 hours'
  ORDER BY ch.name
`;
const freshSummary = await expandChannels(fresh, 32, "shiur");
console.log(JSON.stringify({ ...freshSummary, examples: freshSummary.examples.slice(0, 12) }, null, 2));

console.log("=== deepen existing Jewish / Torah / fun channels ===");
const deepen = await sql`
  SELECT ch.id, ch.slug, ch.name, ch.username, ch.youtube_url, ch.youtube_channel_id,
         COALESCE(ch.is_jewish, TRUE) AS is_jewish,
         COUNT(v.id)::int AS video_count
  FROM channels ch
  LEFT JOIN videos v ON v.channel_id = ch.id AND v.is_active
  WHERE COALESCE(ch.is_active, TRUE)
    AND COALESCE(ch.is_jewish, TRUE)
    AND ch.youtube_url IS NOT NULL
  GROUP BY ch.id
  HAVING COUNT(v.id) <= 45
  ORDER BY
    CASE
      WHEN ch.slug ~* 'torah|shiur|chabad|aish|hidabroot|aleph|yeshiva|rabbi|daf|parsha|ou|sefaria|unpacked|bimbam|maccabeat|six13|jewish|kosher|shabbat|hebrew|comedy|kids'
        THEN 0
      ELSE 1
    END,
    COUNT(v.id) ASC,
    ch.name ASC
  LIMIT 260
`;
const deepenSummary = await expandChannels(deepen, 30, null);
console.log(
  JSON.stringify(
    { ...deepenSummary, examples: deepenSummary.examples.slice(0, 12) },
    null,
    2,
  ),
);

const after = await counts();
console.log("=== after ===");
console.log(JSON.stringify(after, null, 2));
console.log("=== seed ===");
console.log(JSON.stringify(await exportSeed(), null, 2));

const sampleShiur = await sql`
  SELECT v.title, ch.name, ch.username, v.category_slug, v.youtube_id
  FROM videos v JOIN channels ch ON ch.id = v.channel_id
  WHERE v.is_active AND COALESCE(v.is_jewish,true)
    AND (v.category_slug = 'torah' OR v.title ~* 'shiur|parsha|talmud|gemara|halach|torah')
  ORDER BY v.created_at DESC NULLS LAST
  LIMIT 12
`;
const sampleFun = await sql`
  SELECT v.title, ch.name, ch.username, v.category_slug, v.youtube_id
  FROM videos v JOIN channels ch ON ch.id = v.channel_id
  WHERE v.is_active AND COALESCE(v.is_jewish,true)
    AND v.category_slug IN ('music','comedy','family','cooking','holidays','shabbat')
  ORDER BY v.created_at DESC NULLS LAST
  LIMIT 12
`;

console.log(
  JSON.stringify(
    {
      delta_videos: after.videos - before.videos,
      delta_channels: after.channels - before.channels,
      delta_torah: after.torah_videos - before.torah_videos,
      channels_added: chSummary.added.length,
      channel_examples: chSummary.added.slice(0, 25),
      fresh_inserted: freshSummary.inserted,
      deepen_inserted: deepenSummary.inserted,
      sample_shiurim: sampleShiur,
      sample_entertaining: sampleFun,
      before,
      after,
    },
    null,
    2,
  ),
);
