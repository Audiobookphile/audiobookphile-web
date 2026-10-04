# Show and Tell: I built a serverless, native-Swift alternative to Audiobookshelf (Next.js, Vercel, Supabase)

Hey everyone!

I've been using Audiobookshelf for a while and love it, but I really wanted to see if I could build a setup that didn't require managing Docker containers or a home server. I basically wanted a premium, zero-maintenance "serverless" version of my audiobook library.

So I spent some time building **Audiobookphile** as an experiment. It's a completely rewritten, decoupled architecture.

<img alt="Audiobookphile Logo" src="https://raw.githubusercontent.com/Audiobookphile/audiobookphile-web/main/public/images/logo.png" width="100%" />

### What it actually does

- **Syncs progress** between the web player and the native mobile app.
- **Offline mode** so you can download books on the mobile app for road trips/flights.

- **Dark mode** and a really polished UI that feels like a native commercial app.

### The Tech Stack (Serverless & Edge)

Instead of a monolithic Node server and SQLite database, I split it up to run entirely on the edge:

- **Web Client:** Built with Next.js 16 (App Router), Tailwind v4, and Shadcn UI. I went with a really slick "Liquid Glass" aesthetic. It deploys to Vercel with one click.
- **Backend:** Powered completely by **Supabase**. It uses Postgres for the database, Supabase Auth, and Deno Edge Functions for the API endpoints and metadata scraping.
- **Native Mobile App:** Instead of a web wrapper, I wrote the mobile app **100% in Swift**. I used the [Skip framework](https://skip.dev) to transpile the Swift code over to Kotlin/Compose, so it actually runs as a true native app on both iOS and Android from one codebase!

### The Storage Hack (Supabase + Backblaze B2)

To keep cloud costs essentially free, I set up a hybrid storage model:

- Cover images and small metadata files go to Supabase.
- The massive audiobook files are securely uploaded directly to a **Backblaze B2 S3 Bucket** using pre-signed URLs. Backblaze has a great free tier and really cheap egress, making it perfect for streaming audio.

### Want to try it out?

If you want to mess around with a serverless setup, you can check out the source code here:

- [Web Repo](https://github.com/Audiobookphile/audiobookphile-web)
- [Backend Repo](https://github.com/Audiobookphile/audiobookphile-backend)
- [Mobile App Repo](https://github.com/Audiobookphile/audiobookphile-app)

I'd love to hear what you guys think of the UI and the architecture!

**Also, if the community ends up liking this direction, I'd be more than happy to transfer ownership of these projects over to the official org if people want to improve them.**
