import { useEffect, useState } from "react";
import { Link } from "wouter";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageSEO from "@/features/cms/PageSEO";
import { sanityClient } from "@/features/cms/client";
import { imageUrl } from "@/features/cms/client";
import type { SanityPost } from "@/features/cms/types";

export default function BlogIndex() {
  const [posts, setPosts] = useState<SanityPost[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    sanityClient
      .fetch<SanityPost[]>(`*[_type == "post" && !(_id in path("drafts.**")) && defined(publishedAt) && publishedAt <= now() && !noIndex] | order(publishedAt desc){_id,title,slug,excerpt,author,categories,publishedAt,coverImage,seo}`)
      .then((result) => { if (active) setPosts(result ?? []); })
      .catch((error) => { console.error("Sanity blog query failed", error); if (active) setPosts([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSEO data={{ title: "Ideas & insights | Drivwon", description: "Practical ideas on web development, digital strategy, SEO and business growth from Drivwon in Geelong.", path: "/blog" }} />
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-36">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[.2em] text-primary">Drivwon journal</p>
        <h1 className="max-w-3xl text-5xl font-bold md:text-7xl">Ideas for building better digital businesses.</h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">Notes on design, development, search and the systems behind sustainable growth.</p>
        {loading ? <p className="mt-14 text-muted-foreground">Loading articles…</p> : posts.length === 0 ? (
          <div className="mt-14 rounded-2xl border border-white/10 bg-white/[.03] p-8 text-muted-foreground">New articles are on the way. Check back soon.</div>
        ) : (
          <div className="mt-14 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => {
              const image = imageUrl(post.coverImage, 1000);
              return <article key={post._id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
                <Link href={`/blog/${post.slug.current}`} className="block">
                  {image ? <img src={image} alt={(post.coverImage as any)?.alt ?? ""} loading="lazy" className="aspect-[16/10] w-full object-cover" /> : <div className="aspect-[16/10] bg-gradient-to-br from-primary/40 to-cyan-400/10" />}
                  <div className="p-6">
                    <div className="mb-3 flex flex-wrap gap-2">{(post.categories ?? []).slice(0, 2).map((category) => <span key={category} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{category}</span>)}</div>
                    <h2 className="text-2xl font-semibold">{post.title}</h2>
                    <p className="mt-3 line-clamp-3 leading-relaxed text-muted-foreground">{post.excerpt}</p>
                    <p className="mt-5 text-sm text-muted-foreground">{new Date(post.publishedAt).toLocaleDateString("en-AU", { dateStyle: "long" })}{post.author ? ` · ${post.author}` : ""}</p>
                  </div>
                </Link>
              </article>;
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
