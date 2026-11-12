/**
 * Reading a red end-to-end run.
 *
 * The suite talks to a remote backend, to a browser, and to a dev server on
 * a shared host. When it fails, the failure does not say which of those
 * three let it down -- the assertion is always about the UI, because the UI
 * is what the test can see.
 *
 * These counters read the run's own output and say what the run was up
 * against. They are diagnostics: they report, they do not pass or fail
 * anything. A run that fails while the backend is answering 500 is a
 * different thing from a run that fails against a healthy backend, and
 * telling them apart is the difference between an hour of chasing a
 * regression and a re-run.
 */

/**
 * How many 5xx responses the API answered with while the suite ran.
 *
 * The web app calls the backend for the data the player needs: the playback
 * session, the similar items, the library rows. A backend that answers 500
 * makes the *product* look broken -- the Play button never becomes Pause
 * because the session was never created, and the failure lands on an
 * assertion about the UI.
 *
 * The marker is the serialised `ApiError`, which carries the HTTP status
 * next to the status text. The dev server prints it in the run's output.
 */
export const countServerErrors = (output: string): number => (output.match(/status: 5\d\d/g) ?? []).length

/**
 * How many navigations were refused because nothing was listening.
 *
 * A refused connection is the signature of a dev server that died, which is
 * an infrastructure failure rather than a product regression -- and the one
 * failure a fresh server fixes.
 */
export const countConnectionRefused = (output: string): number => (output.match(/ERR_CONNECTION_REFUSED/g) ?? []).length

/**
 * Whether the dev server is still listening.
 *
 * "Still there" means something is holding the port. `lsof -ti` exits zero
 * when it finds a holder and non-zero when there is none, so the answer is
 * the other way round from what the exit code suggests.
 *
 * Getting that backwards is not a naming problem. The retry for a dead dev
 * server is decided by this question, and a sign error here means the retry
 * fires when the server is alive and never fires when it has died -- which
 * is exactly the case the retry exists for.
 */
export const isServerListening = (portIsFree: boolean): boolean => !portIsFree

/**
 * Whether a failed run should be retried on a fresh dev server.
 *
 * The dev server dying makes every remaining test fail at
 * `page.goto('/login')` with a refused connection, which reads exactly like
 * a product-wide outage and is nothing of the kind. A fresh server is the
 * fix, so the run is retried -- but only when the server is actually gone,
 * because a server that is still there refusing connections is a different
 * problem, and one that a new server does not solve.
 *
 * A remote target has no local server to replace, so it is never retried.
 */
export const shouldRetryOnFreshServer = (options: {
  refused: number
  attempt: number
  maxAttempts: number
  port: string
  isPortFree: (port: string) => boolean
}): boolean => {
  if (options.refused === 0) return false
  if (options.attempt >= options.maxAttempts) return false
  if (options.port === '') return false
  return !isServerListening(options.isPortFree(options.port))
}
