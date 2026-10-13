export type SeoData = {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: unknown;
  structuredData?: string;
};

export type SanityPage = {
  _id: string;
  title: string;
  slug: { current: string };
  seo?: SeoData;
  sections: Array<Record<string, any> & { _type: string; _key: string }>;
};

export type SanityPost = {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  author?: string;
  categories?: string[];
  publishedAt: string;
  coverImage?: unknown;
  body: any[];
  seo?: SeoData;
  noIndex?: boolean;
};
