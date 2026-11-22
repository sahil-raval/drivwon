import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Head from "@/features/cms/Head";
import Sections, { PostCards } from "@/features/cms/Sections";
import { useCmsRoute } from "@/features/cms/client";
import { builtInPages } from "@shared/seo/builtins";
import { Loading, NotFoundView } from "@/features/cms/CmsPage";
import { CmsImage } from "@/features/cms/ui";
import RichText from "@/features/cms/RichText";
import { cn } from "@/lib/utils";

function PostGrid({ posts }: { posts: any[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? posts.filter((post) => `${post.title} ${post.excerpt}`.toLowerCase().includes(q)) : posts;
  }, [posts, query]);
  return (
    <>
      {posts.length > 6 && <label className="mb-8 block max-w-md"><span className="sr-only">Search articles</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search articles…" className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-white outline-none focus:border-primary" /></label>}
      {filtered.length ? <PostCards list={filtered} /> : <div className="rounded-2xl border border-white/10 bg-white/[.03] p-8 text-muted-foreground">{posts.length ? "No articles match your search." : "New articles are on the way. Check back soon."}</div>}
    </>
  );
}

export default function BlogIndex() {
  const [path] = useLocation();
  const { data, loading } = useCmsRoute("/blog");
  if (loading) return <Loading />;
  const page = data?.page;
  const posts: any[] = data?.posts ?? [];
  const featured = posts.find((post) => post.featured);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Head doc={page} path={path} list={posts} fallback={builtInPages["/blog"]} />
      <Navbar />
      <main id="main">
        {page?.sections?.length ? <Sections sections={page.sections} /> : (
          <header className="mx-auto max-w-6xl px-6 pb-6 pt-36">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[.2em] text-primary">Drivwon blog</p>
            <h1 className="max-w-3xl font-display text-5xl font-bold text-white md:text-7xl">SEO, web design and AI guides for Geelong businesses.</h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">Plain-English advice on getting found on Google and AI search, building websites that convert and using automation to save time.</p>
          </header>
        )}
        <div className="mx-auto max-w-6xl px-6 pb-24">
          {(data?.categories ?? []).length > 0 && <nav aria-label="Blog categories" className="mb-10 flex flex-wrap gap-2"><Link href="/blog" className="rounded-full bg-primary px-4 py-1.5 text-sm text-white">All</Link>{data.categories.map((category: any) => <Link key={category.slug} href={`/blog/category/${category.slug}`} className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-white/80 hover:border-primary">{category.title}</Link>)}</nav>}
          {featured && (
            <Link href={`/blog/${featured.slug}`} className="mb-12 grid overflow-hidden rounded-3xl border border-white/10 bg-white/[.03] md:grid-cols-2">
              <CmsImage image={featured.coverImage} width={1000} height={640} priority className="h-full w-full object-cover" />
              <div className="p-8 md:p-10"><p className="text-sm font-semibold uppercase tracking-wider text-primary">Featured</p><h2 className="mt-3 font-display text-3xl font-bold text-white">{featured.title}</h2><p className="mt-4 text-muted-foreground">{featured.excerpt}</p></div>
            </Link>
          )}
          <PostGrid posts={featured ? posts.filter((post) => post._id !== featured._id) : posts} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function CategoryPage() {
  const [path] = useLocation();
  const { data, loading } = useCmsRoute(path);
  if (loading) return <Loading />;
  if (!data) return <NotFoundView path={path} />;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Head doc={data} path={path} list={data.posts} />
      <Navbar />
      <main id="main" className="mx-auto max-w-6xl px-6 pb-24 pt-36">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground"><Link href="/" className="hover:text-primary">Home</Link> / <Link href="/blog" className="hover:text-primary">Blog</Link> / <span className="text-white/80">{data.title}</span></nav>
        <h1 className="font-display text-5xl font-bold text-white md:text-6xl">{data.title}</h1>
        {data.description && <p className="mt-5 max-w-3xl text-lg text-muted-foreground">{data.description}</p>}
        <div className="mt-12"><PostGrid posts={data.posts ?? []} /></div>
      </main>
      <Footer />
    </div>
  );
}

export function AuthorPage() {
  const [path] = useLocation();
  const { data, loading } = useCmsRoute(path);
  if (loading) return <Loading />;
  if (!data) return <NotFoundView path={path} />;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Head doc={data} path={path} list={data.posts} />
      <Navbar />
      <main id="main" className="mx-auto max-w-6xl px-6 pb-24 pt-36">
        <header className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
          {data.image && <CmsImage image={data.image} width={320} height={320} priority className="h-40 w-40 rounded-full object-cover" />}
          <div>
            <h1 className="font-display text-5xl font-bold text-white">{data.name}</h1>
            {data.role && <p className="mt-2 text-xl text-primary">{data.role}</p>}
            {data.shortBio && <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{data.shortBio}</p>}
            {data.sameAs?.length > 0 && <ul className="mt-4 flex flex-wrap gap-4 text-sm">{data.sameAs.map((url: string) => <li key={url}><a href={url} rel="me noopener noreferrer" target="_blank" className="text-primary hover:underline">{new URL(url).hostname.replace("www.", "")}</a></li>)}</ul>}
          </div>
        </header>
        {data.credentials?.length > 0 && <section className="mt-12"><h2 className="font-display text-2xl font-bold text-white">Qualifications</h2><ul className="mt-4 flex flex-wrap gap-2">{data.credentials.map((item: string) => <li key={item} className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-white/85">{item}</li>)}</ul></section>}
        {data.bio?.length > 0 && <section className="mt-12 max-w-3xl"><RichText value={data.bio} /></section>}
        <section className={cn("mt-16")}><h2 className="mb-8 font-display text-3xl font-bold text-white">Articles by {data.name}</h2><PostGrid posts={data.posts ?? []} /></section>
      </main>
      <Footer />
    </div>
  );
}
