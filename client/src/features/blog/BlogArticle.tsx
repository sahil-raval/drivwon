import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Check, Link2, Linkedin, Mail } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Head from "@/features/cms/Head";
import RichText from "@/features/cms/RichText";
import Sections, { PostCards } from "@/features/cms/Sections";
import { useCmsRoute } from "@/features/cms/client";
import { Loading, NotFoundView } from "@/features/cms/CmsPage";
import { Breadcrumbs, CmsImage, CmsLink } from "@/features/cms/ui";
import { track } from "@/features/analytics/tracking";
import { headingsFromPt, readingMinutes, ptToText } from "@shared/seo/text";
import { pathForDoc } from "@shared/cms/routes";

const date = (value?: string) => (value ? new Date(value).toLocaleDateString("en-AU", { dateStyle: "long" }) : "");

function Toc({ items }: { items: Array<{ id: string; text: string; level: number }> }) {
  const [active, setActive] = useState("");
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: "-20% 0px -70% 0px" });
    items.forEach((item) => { const element = document.getElementById(item.id); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [items]);
  if (items.length < 3) return null;
  return (
    <nav aria-label="Table of contents" className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">On this page</p>
      <ol className="space-y-2 text-sm">
        {items.map((item) => <li key={item.id} className={item.level === 3 ? "pl-4" : ""}><a href={`#${item.id}`} className={active === item.id ? "text-primary" : "text-muted-foreground hover:text-white"}>{item.text}</a></li>)}
      </ol>
    </nav>
  );
}

function Share({ title }: { title: string }) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2" aria-label="Share this article">
      <a className="rounded-full border border-white/10 p-2.5 hover:border-primary" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn" data-track="share_linkedin"><Linkedin className="h-4 w-4" aria-hidden /></a>
      <a className="rounded-full border border-white/10 p-2.5 hover:border-primary" href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`} aria-label="Share by email" data-track="share_email"><Mail className="h-4 w-4" aria-hidden /></a>
      <button className="rounded-full border border-white/10 p-2.5 hover:border-primary" aria-label="Copy link" onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); track("share_copy_link"); }}>{copied ? <Check className="h-4 w-4 text-primary" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}</button>
    </div>
  );
}

export default function BlogArticle() {
  const [path] = useLocation();
  const { data: post, loading } = useCmsRoute(path);
  const toc = useMemo(() => headingsFromPt(post?.body), [post?.body]);
  const minutes = useMemo(() => readingMinutes(ptToText(post?.body).length), [post?.body]);

  useEffect(() => {
    if (!post) return;
    track("article_view", { article: post.title, category: post.categories?.[0]?.title, author: post.author?.name });
  }, [post?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Loading />;
  if (!post) return <NotFoundView path={path} />;
  const showToc = post.showToc !== false && toc.length >= 3;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Head doc={post} path={path} />
      <Navbar />
      <main id="main" className="mx-auto max-w-6xl px-6 pb-24 pt-32">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }, ...(post.categories?.[0] ? [{ name: post.categories[0].title, href: `/blog/category/${post.categories[0].slug}` }] : []), { name: post.title }]} />
        <article>
          <header className="mx-auto max-w-3xl">
            <div className="flex flex-wrap gap-2">{(post.categories ?? []).map((category: any) => <Link key={category.slug} href={`/blog/category/${category.slug}`} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{category.title}</Link>)}</div>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-white md:text-6xl">{post.title}</h1>
            <p className="mt-5 text-xl leading-relaxed text-muted-foreground">{post.excerpt}</p>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-white/10 py-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {post.author?.image && <CmsImage image={post.author.image} width={80} height={80} className="h-10 w-10 rounded-full object-cover" />}
                <p>
                  {post.author?.name && <>By <Link href={`/authors/${post.author.slug}`} className="font-medium text-white hover:text-primary" rel="author">{post.author.name}</Link> · </>}
                  <time dateTime={post.publishedAt}>{date(post.publishedAt)}</time>
                  {post.updatedAt && post.updatedAt.slice(0, 10) !== post.publishedAt?.slice(0, 10) && <> · Updated <time dateTime={post.updatedAt}>{date(post.updatedAt)}</time></>}
                  {` · ${minutes} min read`}
                </p>
              </div>
              <Share title={post.title} />
            </div>
            {post.reviewedBy?.name && <p className="mt-3 text-sm text-muted-foreground">Reviewed by <Link href={`/authors/${post.reviewedBy.slug}`} className="text-white hover:text-primary">{post.reviewedBy.name}</Link>{post.reviewedBy.role ? `, ${post.reviewedBy.role}` : ""}</p>}
          </header>
          {post.coverImage && <CmsImage image={post.coverImage} priority width={1600} className="mx-auto mt-10 max-h-[65vh] w-full rounded-3xl object-cover" sizes="(min-width: 1200px) 1150px, 100vw" />}
          <div className={showToc ? "mt-12 grid gap-12 lg:grid-cols-[1fr_260px]" : "mt-12"}>
            <div className="mx-auto w-full max-w-3xl">
              {post.seo?.quickAnswer && (
                <aside className="mb-10 rounded-2xl border border-primary/30 bg-primary/10 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Quick answer</p>
                  <p className="quick-answer mt-2 text-lg leading-relaxed text-white">{post.seo.quickAnswer}</p>
                  {post.seo.keyFacts?.length > 0 && <ul className="mt-4 space-y-1.5">{post.seo.keyFacts.map((fact: string) => <li key={fact} className="flex gap-2 text-white/85"><Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />{fact}</li>)}</ul>}
                </aside>
              )}
              {showToc && <div className="mb-10 lg:hidden"><Toc items={toc} /></div>}
              <RichText value={post.body} />
              {post.faqs?.length > 0 && <div className="-mx-6"><Sections sections={[{ _type: "faqSection", _key: "post-faqs", items: post.faqs, settings: { spacing: "small", width: "narrow" } }]} /></div>}
              {post.seo?.sources?.length > 0 && (
                <section className="mt-12 border-t border-white/10 pt-8" aria-label="Sources">
                  <h2 className="font-display text-xl font-bold text-white">Sources</h2>
                  <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">{post.seo.sources.map((source: any) => <li key={source._key ?? source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{source.title || source.url}</a></li>)}</ol>
                </section>
              )}
              {post.tags?.length > 0 && <ul className="mt-10 flex flex-wrap gap-2">{post.tags.map((tag: string) => <li key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground">#{tag}</li>)}</ul>}
              {post.author && (
                <aside className="mt-12 flex gap-5 rounded-2xl border border-white/10 bg-white/[.03] p-6" aria-label="About the author">
                  {post.author.image && <CmsImage image={post.author.image} width={160} height={160} className="h-16 w-16 shrink-0 rounded-full object-cover" />}
                  <div>
                    <p className="text-sm text-muted-foreground">Written by</p>
                    <p className="font-display text-xl font-bold text-white"><Link href={`/authors/${post.author.slug}`} className="hover:text-primary">{post.author.name}</Link></p>
                    {post.author.role && <p className="text-primary">{post.author.role}</p>}
                    {post.author.shortBio && <p className="mt-2 text-muted-foreground">{post.author.shortBio}</p>}
                  </div>
                </aside>
              )}
              {(post.cta?.heading || post.relatedServices?.length) && (
                <aside className="mt-12 rounded-3xl bg-gradient-to-br from-primary/25 to-primary/5 p-8">
                  <p className="font-display text-2xl font-bold text-white">{post.cta?.heading || "Want this done for your business?"}</p>
                  <p className="mt-2 text-white/80">{post.cta?.text || "Talk to the Drivwon team in Geelong."}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {post.cta?.link ? <CmsLink link={post.cta.link} /> : <Link href="/quotation" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-white" data-track="article_cta">Get a quote <ArrowRight className="h-4 w-4" aria-hidden /></Link>}
                    {(post.relatedServices ?? []).map((service: any) => <Link key={service._id} href={pathForDoc(service)} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-white hover:bg-white/10">{service.shortTitle || service.title}</Link>)}
                  </div>
                </aside>
              )}
            </div>
            {showToc && <aside className="hidden lg:block"><div className="sticky top-28"><Toc items={toc} /></div></aside>}
          </div>
        </article>
        {post.relatedPosts?.length > 0 && <section className="mt-20" aria-label="Related articles"><h2 className="mb-8 font-display text-3xl font-bold text-white">Keep reading</h2><PostCards list={post.relatedPosts} /></section>}
      </main>
      <Footer />
    </div>
  );
}
