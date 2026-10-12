const studioUrl = import.meta.env.VITE_SANITY_STUDIO_URL || "https://drivwon.sanity.studio";

export default function StudioPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-5 py-12 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[.035] p-8">
        <p className="text-sm font-semibold uppercase tracking-[.18em] text-primary">Drivwon CMS</p>
        <h1 className="mt-3 text-3xl font-bold">Open Content Studio</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">Sanity Studio is hosted separately from the public website. Sign in with an account that has access to the Drivwon Sanity project to edit pages, landing pages, posts, SEO fields and chatbot answers.</p>
        <a href={studioUrl} className="mt-7 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary/90">Open Sanity Studio ↗</a>
        <p className="mt-4 text-xs text-muted-foreground">The editor is private to approved Sanity project members. The content token is not sent to website visitors.</p>
      </section>
    </main>
  );
}
