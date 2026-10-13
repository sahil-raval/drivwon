import { useEffect, useState } from "react";
import { PortableText } from "@portabletext/react";
import { Link, useRoute } from "wouter";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageSEO from "@/features/cms/PageSEO";
import { imageUrl, sanityClient } from "@/features/cms/client";
import type { SanityPost } from "@/features/cms/types";

export default function BlogArticle() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug ?? "";
  const [post, setPost] = useState<SanityPost | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    sanityClient
      .fetch<SanityPost | null>(`*[_type == "post" && slug.current == $slug && !(_id in path("drafts.**")) && publishedAt <= now()][0]{_id,title,slug,excerpt,author,categories,publishedAt,coverImage,body,seo,noIndex}`, { slug })
      .then((result) => { if (active) setPost(result ?? null); })
      .catch((error) => { console.error("Sanity article query failed", error); if (active) setPost(null); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [slug]);
  const cover = post?.coverImage ? imageUrl(post.coverImage, 1800) : undefined;
  return (
    <div className="min-h-screen bg-background text-foreground">
      {post && <PageSEO data={{ title: post.title, description: post.excerpt, seo: post.seo, path: `/blog/${slug}`, type: "article", publishedAt: post.publishedAt }} />}
      {!post && loaded && <PageSEO data={{ title: "Article not found | Drivwon", description: "This article is unavailable.", path: `/blog/${slug}`, seo: { noIndex: true } }} />}
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-36">
        {post ? <>
          <Link href="/blog" className="text-sm text-primary hover:underline">← All articles</Link>
          <div className="mt-8 flex flex-wrap gap-2">{(post.categories ?? []).map((category) => <span key={category} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{category}</span>)}</div>
          <h1 className="mt-5 text-4xl font-bold leading-tight md:text-6xl">{post.title}</h1>
          <p className="mt-5 text-xl leading-relaxed text-muted-foreground">{post.excerpt}</p>
          <p className="mt-5 text-sm text-muted-foreground">{new Date(post.publishedAt).toLocaleDateString("en-AU", { dateStyle: "long" })}{post.author ? ` · ${post.author}` : ""}</p>
          {cover && <img src={cover} alt={(post.coverImage as any)?.alt ?? ""} className="mt-10 max-h-[65vh] w-full rounded-3xl object-cover" />}
          <article className="prose prose-invert prose-lg mx-auto mt-12 max-w-none prose-headings:font-display prose-a:text-primary">
            <PortableText value={post.body ?? []} />
          </article>
        </> : loaded ? <section className="py-16"><h1 className="text-4xl font-bold">Article not found</h1><p className="mt-4 text-muted-foreground">This article may have been unpublished or the URL may have changed.</p><Link href="/blog" className="mt-6 inline-block text-primary">Browse the journal</Link></section> : <p className="py-16 text-muted-foreground">Loading article…</p>}
      </main>
      <Footer />
    </div>
  );
}
