import styles from './LoadingIndicator.module.css'

/**
 * The loading state for a route.
 *
 * A `loading.tsx` file is a Suspense boundary around the page, so the
 * layout is sent as soon as it is ready and the page streams in when its
 * data arrives. The repository had no `loading.tsx` anywhere, which means
 * every navigation waited for the whole page: the browser showed nothing
 * until the server had finished fetching everything the page needed.
 *
 * The animation is CSS rather than framer-motion, and that is not a
 * detail: a loading file is part of the layout's chunk graph, and
 * framer-motion is 42 KB gzipped.
 */
export default function RouteLoading() {
  return (
    <div
      className="flex min-h-[60vh] w-full items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className={`${styles['loader-dots']} relative h-3 w-16`}>
        <div className="absolute top-0 left-0 h-3 w-3 rounded-full bg-primary" />
        <div className="absolute top-0 left-0 h-3 w-3 rounded-full bg-primary" />
        <div className="absolute top-0 left-0 h-3 w-3 rounded-full bg-primary" />
        <div className="absolute top-0 left-0 h-3 w-3 rounded-full bg-primary" />
      </div>
    </div>
  )
}
