import type { RouteMatch } from "./routes.js";

const published = `!(_id in path("drafts.**")) && !(_id in path("versions.**"))`;
const REF = `{_type, "slug": slug.current}`;
export const LINK = `{..., internal->${REF}}`;

const SERVICE_CARD = `_id, _type, title, shortTitle, "slug": slug.current, icon, summary, priceFrom, priceTo, priceUnit, serviceType`;
const CASE_CARD = `_id, _type, title, "slug": slug.current, client, industry, clientLocation, summary, mainImage, results, year, websiteUrl, "services": services[]->{title, "slug": slug.current}`;
const POST_CARD = `_id, _type, title, "slug": slug.current, excerpt, coverImage, publishedAt, updatedAt, "author": author->{name, "slug": slug.current, image}, "categories": categories[]->{title, "slug": slug.current}, "readingChars": length(pt::text(body))`;
const PERSON = `_id, _type, name, "slug": slug.current, role, image, shortBio, credentials, knowsAbout, alumniOf, sameAs`;
const TESTIMONIAL = `_id, quote, name, role, company, image, rating, source, sourceUrl, date`;
const LOCATION_CARD = `_id, _type, title, name, "slug": slug.current, region, summary`;

const PT = `[]{..., markDefs[]{..., _type == "internalLink" => {"ref": reference->${REF}}}, _type == "ctaBlock" => {link${LINK}}}`;

const SECTION = `
  ...,
  buttons[]${LINK},
  link${LINK},
  body${PT},
  sideText${PT},
  items[]{..., link${LINK}},
  plans[]{..., link${LINK}},
  _type == "servicesSection" => {"serviceList": select(mode == "manual" => services[]->{${SERVICE_CARD}}, *[_type == "service" && ${published}] | order(order asc, title asc){${SERVICE_CARD}})},
  _type == "projectsSection" => {"projectList": select(
    mode == "manual" => projects[]->{${CASE_CARD}},
    mode == "featured" => *[_type == "caseStudy" && featured == true && ${published}] | order(order asc, year desc)[0...12]{${CASE_CARD}},
    *[_type == "caseStudy" && ${published}] | order(order asc, year desc)[0...12]{${CASE_CARD}}
  )},
  _type == "caseHighlightSection" => {"caseDoc": caseStudy->{${CASE_CARD}, "testimonial": testimonial->{${TESTIMONIAL}}}},
  _type == "testimonialsSection" => {"testimonialList": select(count(testimonials) > 0 => testimonials[]->{${TESTIMONIAL}}, *[_type == "testimonial" && featured == true && ${published}] | order(date desc)[0...9]{${TESTIMONIAL}}), reviewLink${LINK}},
  _type == "faqSection" => {"faqList": faqs[]->{question, answer}},
  _type == "formSection" => {"formDoc": form->{..., "redirectPath": redirectTo->${REF}}},
  _type == "teamSection" => {"peopleList": select(count(people) > 0 => people[]->{${PERSON}}, *[_type == "author" && showOnTeamPage == true && ${published}]{${PERSON}})},
  _type == "postsSection" => {"postList": select(
    mode == "manual" => posts[]->{${POST_CARD}},
    mode == "category" => *[_type == "post" && ${published} && publishedAt <= now() && references(^.category._ref)] | order(publishedAt desc)[0...12]{${POST_CARD}},
    *[_type == "post" && ${published} && publishedAt <= now()] | order(publishedAt desc)[0...12]{${POST_CARD}}
  )},
  _type == "locationsSection" => {"locationList": select(count(locations) > 0 => locations[]->{${LOCATION_CARD}}, *[_type == "location" && ${published}] | order(name asc){${LOCATION_CARD}})}
`;

export const SECTIONS = `sections[]{
  ${SECTION},
  _type == "reusableSectionRef" => {"resolved": section->sections[]{${SECTION}}}
}`;

const SEO = `seo{..., ogImage}`;
const FAQS = `faqs[]{question, answer}`;

export const SETTINGS_QUERY = `*[_type == "siteSettings" && ${published}][0]{
  ...,
  navigation[]{..., link${LINK}, children[]{..., link${LINK}}},
  headerCta${LINK},
  announcement{..., link${LINK}},
  footerColumns[]{..., links[]${LINK}},
  footerCta{..., link${LINK}},
  legalLinks[]${LINK},
  stickyCta{..., quoteLink${LINK}},
  "founders": founders[]->{${PERSON}},
  "defaultLeadForm": defaultLeadForm->{..., "redirectPath": redirectTo->${REF}}
}`;

const PAGE = `_id, _type, _updatedAt, title, "slug": slug.current, ${SEO}, ${SECTIONS}, publishedAt, updatedAt, showBreadcrumbs, "parent": parent->{title, "slug": slug.current, _type}`;

export function routeQuery(match: RouteMatch): { query: string; params: Record<string, string> } | null {
  switch (match.kind) {
    case "page":
      return { query: `*[_type == "page" && slug.current == $slug && ${published}][0]{${PAGE}}`, params: { slug: match.slug } };
    case "pageOrLanding":
      return {
        query: `coalesce(
          *[_type == "page" && slug.current == $slug && ${published}][0]{${PAGE}},
          *[_type == "landingPage" && slug.current == $slug && ${published}][0]{${PAGE}, hideNavigation, hideFooter, hideChatbot, stickyCta${LINK}, campaign, channel, conversionGoal, variant, expiresAt, expiredMessage, headScripts}
        )`,
        params: { slug: match.slug },
      };
    case "post":
      return {
        query: `*[_type == "post" && slug.current == $slug && ${published} && publishedAt <= now()][0]{
          _id, _type, _updatedAt, title, "slug": slug.current, excerpt, coverImage, body${PT}, ${FAQS}, tags, articleType, showToc, publishedAt, updatedAt, ${SEO},
          cta{..., link${LINK}},
          "author": author->{${PERSON}}, "reviewedBy": reviewedBy->{${PERSON}},
          "categories": categories[]->{_id, title, "slug": slug.current},
          "relatedServices": relatedServices[]->{${SERVICE_CARD}},
          "relatedPosts": select(
            count(relatedPosts) > 0 => relatedPosts[]->{${POST_CARD}},
            *[_type == "post" && ${published} && publishedAt <= now() && slug.current != $slug && count(categories[@._ref in ^.^.categories[]._ref]) > 0] | order(publishedAt desc)[0...3]{${POST_CARD}}
          )
        }`,
        params: { slug: match.slug },
      };
    case "blogIndex":
      return {
        query: `{
          "page": *[_type == "page" && slug.current == "blog" && ${published}][0]{${PAGE}},
          "posts": *[_type == "post" && ${published} && publishedAt <= now() && seo.noIndex != true] | order(featured desc, publishedAt desc)[0...60]{${POST_CARD}, featured},
          "categories": *[_type == "category" && ${published}] | order(title asc){title, "slug": slug.current}
        }`,
        params: {},
      };
    case "category":
      return {
        query: `*[_type == "category" && slug.current == $slug && ${published}][0]{
          _id, _type, _updatedAt, title, "slug": slug.current, description, ${SEO},
          "posts": *[_type == "post" && ${published} && publishedAt <= now() && references(^._id)] | order(publishedAt desc){${POST_CARD}}
        }`,
        params: { slug: match.slug },
      };
    case "author":
      return {
        query: `*[_type == "author" && slug.current == $slug && ${published}][0]{
          ${PERSON}, _updatedAt, bio${PT}, ${SEO},
          "posts": *[_type == "post" && ${published} && publishedAt <= now() && references(^._id)] | order(publishedAt desc){${POST_CARD}}
        }`,
        params: { slug: match.slug },
      };
    case "service":
      return {
        query: `*[_type == "service" && slug.current == $slug && ${published}][0]{
          ${PAGE}, shortTitle, icon, summary, ${FAQS}, serviceType, priceFrom, priceTo, priceUnit, deliverables, turnaround, areaServed,
          "relatedServices": relatedServices[]->{${SERVICE_CARD}},
          "caseStudies": caseStudies[]->{${CASE_CARD}}
        }`,
        params: { slug: match.slug },
      };
    case "location":
      return {
        query: `*[_type == "location" && slug.current == $slug && ${published}][0]{
          ${PAGE}, name, region, postcode, geo, wikipediaUrl, summary, ${FAQS},
          "services": services[]->{${SERVICE_CARD}},
          "localProof": localProof[]->{${CASE_CARD}},
          "nearby": nearby[]->{${LOCATION_CARD}}
        }`,
        params: { slug: match.slug },
      };
    case "caseStudy":
      return {
        query: `*[_type == "caseStudy" && slug.current == $slug && ${published}][0]{
          ${PAGE}, client, industry, clientLocation, websiteUrl, year, tech, mainImage, summary, challenge${PT}, solution${PT}, results, gallery,
          "services": services[]->{${SERVICE_CARD}},
          "testimonial": testimonial->{${TESTIMONIAL}}
        }`,
        params: { slug: match.slug },
      };
    default:
      return null;
  }
}

export const REDIRECT_QUERY = `*[_type == "redirect" && from == $path && ${published}][0]{to, permanent}`;

export const SITEMAP_QUERY = `*[_type in ["page", "landingPage", "post", "service", "location", "caseStudy", "category", "author"] && defined(slug.current) && ${published} && (_type != "post" || publishedAt <= now())]{
  _type, "slug": slug.current, _updatedAt, updatedAt, publishedAt, title,
  "noIndex": coalesce(seo.noIndex, false), "exclude": coalesce(seo.excludeFromSitemap, false), "priority": seo.sitemapPriority, "changefreq": seo.changeFrequency,
  "canonical": seo.canonicalUrl, "expiresAt": expiresAt,
  "images": [coverImage, mainImage, sections[_type == "heroSection"][0].image][defined(asset)]{"ref": asset._ref, alt}
}`;

export const LLMS_QUERY = `{
  "settings": *[_type == "siteSettings" && ${published}][0]{siteName, siteUrl, description, longDescription, llmsIntro, email, phone, addressLocality, addressRegion, areaServed, knowsAbout, priceRange},
  "docs": *[_type in ["page", "service", "location", "caseStudy", "post"] && defined(slug.current) && ${published} && (_type != "post" || publishedAt <= now()) && coalesce(seo.noIndex, false) != true && coalesce(seo.includeInLlms, true) == true]
    | order(_type asc, title asc){_type, title, "slug": slug.current, excerpt, summary, "quickAnswer": seo.quickAnswer, "description": seo.metaDescription, "facts": seo.keyFacts, priceFrom, priceTo, priceUnit},
  "faqs": *[_type == "faq" && active == true && ${published}] | order(order asc)[0...40]{question, answer}
}`;

export const RSS_QUERY = `{
  "settings": *[_type == "siteSettings" && ${published}][0]{siteName, siteUrl, description},
  "posts": *[_type == "post" && ${published} && publishedAt <= now() && seo.noIndex != true] | order(publishedAt desc)[0...30]{title, "slug": slug.current, excerpt, publishedAt, updatedAt, "author": author->name, "categories": categories[]->title, coverImage}
}`;
