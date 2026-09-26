import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { marked } from "marked";
import { CookieSettingsButton } from "./CookieBanner";
import { AUTH_ENABLED } from "../lib/auth/config";

/**
 * Shared shell for /privacy and /terms. The document text lives in
 * web/content/legal/<file>.md (plain Markdown, so a policy edit never means
 * touching React) and is rendered to HTML on the server at build time.
 * The Markdown is our own trusted content -- never render user-supplied text
 * through this component.
 */
export default function LegalPage({
  eyebrow,
  title,
  file,
  other,
}: {
  eyebrow: string;
  title: string;
  file: "privacy.md" | "terms.md";
  other: { href: string; label: string };
}) {
  const source = fs.readFileSync(path.join(process.cwd(), "content", "legal", file), "utf8");
  // Lines starting "{{login}}" apply only when sign-in is switched on; lines starting
  // "{{nologin}}" only when it is off. Table rows work too (one row per line).
  const markdown = source
    .split("\n")
    .flatMap((line) => {
      if (line.startsWith("{{login}}")) return AUTH_ENABLED ? [line.slice("{{login}}".length)] : [];
      if (line.startsWith("{{nologin}}")) return AUTH_ENABLED ? [] : [line.slice("{{nologin}}".length)];
      return [line];
    })
    .join("\n");
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  // Give every section heading an anchor id ("8. Cookies ..." -> #8-cookies-...)
  // so other pages (e.g. the cookie banner) can deep-link to a section.
  const html = rawHtml.replace(/<h2>(.*?)<\/h2>/g, (_m, inner: string) => {
    const id = inner
      .replace(/<[^>]+>/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `<h2 id="${id}">${inner}</h2>`;
  });

  return (
    <main className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b border-border bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5" aria-label="CarDhoondo home">
            <Image src="/cardhoondo-icon.png" alt="" width={237} height={237} className="h-8 w-8" />
            <span className="font-display text-base font-bold text-ink">CarDhoondo</span>
          </Link>
          <Link
            href="/questionnaire/intro"
            className="rounded-full bg-accent-rust px-5 py-2.5 text-sm font-semibold text-stage shadow-glow-sm transition hover:brightness-110 active:scale-[0.98]"
          >
            Find my car
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-14">
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-accent-rust-soft">{eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-balance text-ink sm:text-4xl">{title}</h1>
        <div
          className="prose-guide prose-legal mt-8"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <p className="mt-12 border-t border-border pt-6 text-sm text-ink-soft">
          Questions or requests about your data? Email{" "}
          <a href="mailto:mycardhoondo@gmail.com" className="text-accent-rust-soft underline underline-offset-2">
            mycardhoondo@gmail.com
          </a>
          . See also our{" "}
          <Link href={other.href} className="text-accent-rust-soft underline underline-offset-2">
            {other.label}
          </Link>
          .{" "}
          <CookieSettingsButton className="text-accent-rust-soft underline underline-offset-2" />
        </p>
      </article>
    </main>
  );
}
