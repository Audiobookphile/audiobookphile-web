import { motion } from 'framer-motion'

export function AdminAnalyticsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="relative overflow-hidden rounded-2xl border border-border bg-primary/80 p-6 shadow-xl backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 animate-pulse rounded-md bg-primary" />
            <div className="h-9 w-9 animate-pulse rounded-lg bg-primary" />
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <div className="h-10 w-20 animate-pulse rounded-lg bg-primary" />
            <div className="h-5 w-24 animate-pulse rounded-full bg-primary/60" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}
