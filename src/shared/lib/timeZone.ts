/**
 * The time zone the application formats and compares dates in.
 *
 * next-intl needs a time zone, and it warns on the server when there is no
 * global default. This app warned on *every* render, because the three
 * NextIntlClientProvider instances in it do not pass one.
 *
 * The warning is not noise. It is next-intl saying that the server render
 * and the browser render may disagree, which React then reports as a
 * hydration mismatch -- the server's HTML is checked against the browser's
 * render, and a disagreement replaces the markup.
 *
 * A fixed zone is the only value that guarantees the two agree. The
 * server's own zone is whatever the machine happens to be set to, and the
 * browser's is wherever the user is, so neither can serve as a default.
 * UTC is also what the cron builder already falls back to
 * (`timeZone || 'UTC'`), so this matches the convention the rest of the app
 * already uses.
 *
 * Nothing the application renders depends on the zone. The only next-intl
 * formatter consumer formats a relative time, which is zone-independent;
 * everything else uses date-fns directly.
 *
 * It lives in its own module rather than in `src/shared/lib/i18n.ts`
 * because that file imports `next/headers`, which is server-only, and these
 * constants are read by client components.
 */
export const TIME_ZONE = 'UTC'
