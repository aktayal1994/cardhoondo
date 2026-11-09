/**
 * Tell Bing (and the other IndexNow engines: Yandex, Seznam, Naver) that pages
 * are new or changed, so they get crawled within hours instead of weeks.
 * ChatGPT search leans on Bing's index, so this is the main AEO lever.
 *
 *   node scripts/indexnow_ping.mjs                         (every URL in the live sitemap)
 *   node scripts/indexnow_ping.mjs /cars/tata-nexon /compare/a-vs-b   (just these)
 *
 * Run after a deploy that adds or changes public pages. The key file lives at
 * public/<KEY>.txt and must stay deployed, or engines reject the ping.
 */
const SITE_URL = "https://cardhoondo.com";
const KEY = "189804c40187bc5b4b725c58687ab691";

const args = process.argv.slice(2);
let urls;
if (args.length) {
  urls = args.map((p) => (p.startsWith("http") ? p : SITE_URL + (p.startsWith("/") ? p : "/" + p)));
} else {
  const xml = await (await fetch(`${SITE_URL}/sitemap.xml`)).text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}
if (!urls.length) {
  console.error("No URLs to submit.");
  process.exit(1);
}

// IndexNow accepts up to 10,000 URLs per request.
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: new URL(SITE_URL).host,
    key: KEY,
    keyLocation: `${SITE_URL}/${KEY}.txt`,
    urlList: urls,
  }),
});
// 200 = accepted, 202 = accepted while the key is being verified.
console.log(`Submitted ${urls.length} URLs: HTTP ${res.status} ${res.statusText}`);
if (res.status >= 300) {
  console.error(await res.text());
  process.exit(1);
}
