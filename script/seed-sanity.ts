import { createReadStream } from "node:fs";
import path from "node:path";
import { createClient } from "@sanity/client";

const projectId = process.env.SANITY_PROJECT_ID || "v6luawxh";
const dataset = process.env.SANITY_DATASET || "production";
const token = process.env.SANITY_WRITE_TOKEN;

if (!token) {
  throw new Error("Set SANITY_WRITE_TOKEN in Replit Secrets before running this import.");
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2026-10-12",
  token,
  useCdn: false,
  perspective: "published",
});

const root = process.cwd();
const imagePaths = {
  logo: "client/src/assets/logo.png",
  daytoday: "client/src/assets/projects/Daytoday.webp",
  varni: "client/src/assets/projects/Varni.webp",
  scrub: "client/src/assets/projects/Scrub.webp",
  msm: "client/src/assets/projects/msm.webp",
  aprational: "client/src/assets/projects/aprational.webp",
  psmfinance: "client/src/assets/projects/psmfinance.webp",
};

type SanityImage = { _type: "image"; alt: string; asset: { _type: "reference"; _ref: string } };
type TextBlock = { _key: string; _type: "block"; style: string; markDefs: unknown[]; children: Array<{ _key: string; _type: "span"; marks: string[]; text: string }> };
type Section = Record<string, any> & { _key: string; _type: string };

function portableText(paragraphs: Array<{ text: string; style?: string }>): TextBlock[] {
  return paragraphs.map(({ text, style = "normal" }, index) => ({
    _key: `copy-${index + 1}`,
    _type: "block",
    style,
    markDefs: [],
    children: [{ _key: `span-${index + 1}`, _type: "span", marks: [], text }],
  }));
}

function hero(heading: string, subheading: string, eyebrow?: string, primaryButton?: { label: string; href: string }, secondaryButton?: { label: string; href: string }): Section {
  return { _key: `hero-${heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`, _type: "heroSection", eyebrow, heading, subheading, primaryButton, secondaryButton };
}

function rich(heading: string, paragraphs: Array<{ text: string; style?: string }>, eyebrow?: string): Section {
  return { _key: `copy-${heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`, _type: "richTextSection", eyebrow, heading, body: portableText(paragraphs) };
}

function cards(heading: string, items: Array<{ heading: string; body: string; eyebrow?: string; image?: SanityImage; link?: { label: string; href: string } }>, intro?: string, eyebrow?: string): Section {
  return {
    _key: `grid-${heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    _type: "featureGridSection",
    eyebrow,
    heading,
    intro,
    items: items.map((item, index) => ({ _key: `item-${index + 1}`, _type: "contentBlock", ...item })),
  };
}

function cta(heading: string, body: string, label: string, href: string, eyebrow?: string): Section {
  return { _key: `cta-${heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`, _type: "ctaSection", eyebrow, heading, body, link: { label, href } };
}

async function uploadImages() {
  const assets: Record<string, SanityImage> = {};
  for (const [name, relativePath] of Object.entries(imagePaths)) {
    const filePath = path.join(root, relativePath);
    const asset = await client.assets.upload("image", createReadStream(filePath), {
      filename: path.basename(filePath),
    });
    assets[name] = {
      _type: "image",
      alt: name === "logo" ? "Drivwon" : `${name} project preview`,
      asset: { _type: "reference", _ref: asset._id },
    };
    console.log(`Uploaded image asset: ${path.basename(filePath)}`);
  }
  return assets;
}

function makePages(images: Record<string, SanityImage>) {
  const services = [
    ["Custom Software & SaaS Development", "Bespoke software products built around your workflow, not the other way around — from MVP to scalable SaaS platforms."],
    ["AI Agents & Automation", "Custom AI agents and workflow automation that handle repetitive work, integrate with your tools, and scale with your business."],
    ["System Architecture & IT Consulting", "Technical architecture design, cloud infrastructure planning, and hands-on advisory to keep your systems reliable and future-proof."],
    ["Data Analytics & Dashboards", "Reporting pipelines and BI dashboards that turn raw data into decisions — built for the metrics that actually matter to you."],
    ["E-commerce Development", "Online store setup and development across Shopify, WooCommerce, or fully custom builds — tailored to how you sell."],
    ["Web Development", "Custom websites and web applications designed and built for performance, from marketing sites to complex platforms."],
    ["Mobile Application Development", "Native and cross-platform iOS and Android apps, built and shipped with the same care as our web products."],
    ["Branding & Positioning", "Brand identity, strategy, and market positioning that gives your business a clear, consistent voice across every touchpoint."],
    ["UI/UX & Product Design", "Design that supports the build, not just decorates it — wireframes, prototypes, and polished interfaces for web and app."],
    ["Search Engine Optimisation (SEO)", "Organic search strategy focused on visibility and ranking that compounds — technical SEO, content, and on-page optimisation."],
    ["Digital & Social Media Marketing", "Paid and organic campaigns across digital channels, built to drive traffic that converts, not just impressions."],
  ];
  const projects = [
    { title: "Day To Day Deals", description: "A high-performance neural network visualization dashboard built with React and Three.js.\nTechnology: React · Three.js · Tailwind", image: images.daytoday, link: "https://daytodaydeals.com.au" },
    { title: "Varni Diamonds", description: "Next-generation e-commerce platform with real-time stock tracking and AI recommendations.\nTechnology: Next.js · Node.js · Stripe", image: images.varni, link: "https://www.varnidiamonds.com.au" },
    { title: "Scrub N Clean", description: "Decentralized identity management system with biometric authentication and blockchain security.\nTechnology: Web3 · Solidity · TypeScript", image: images.scrub, link: "https://www.scrubnclean.com.au" },
    { title: "MSM Logistics", description: "Decentralized identity management system with biometric authentication and blockchain security.\nTechnology: Web3 · Solidity · TypeScript", image: images.msm, link: "https://www.msmtranslink.com" },
    { title: "Aprational Energy", description: "Decentralized identity management system with biometric authentication and blockchain security.\nTechnology: Web3 · Solidity · TypeScript", image: images.aprational, link: "#" },
    { title: "PSM Finance", description: "Decentralized identity management system with biometric authentication and blockchain security.\nTechnology: Web3 · Solidity · TypeScript", image: images.psmfinance, link: "#" },
  ];

  return [
    {
      _id: "drivwon-seed-page-home",
      _type: "page",
      title: "Home",
      slug: { _type: "slug", current: "home" },
      isHome: true,
      seo: { metaTitle: "Drivwon | Digital studio in Geelong, Australia", metaDescription: "We are Drivwon, a creative technology company building web, mobile and digital experiences for ambitious businesses." },
      sections: [
        hero("Future Proof Digital Experiences", "We are Drivwon. A creative tech agency based in Australia, building the next generation of web and mobile interfaces.", undefined, { label: "Start a Project", href: "/quotation" }, { label: "Explore Services", href: "/services" }),
        cards("Our Expertise", [
          { heading: "Branding & Design", body: "Visual identities that leave a lasting impression. Logos, guidelines, and UI/UX design." },
          { heading: "Web Development", body: "Cutting-edge websites using React, Next.js, and Webflow. Fast, secure, and scalable." },
          { heading: "Mobile Apps", body: "Native and cross-platform mobile applications for iOS and Android." },
          { heading: "Digital Marketing", body: "Strategic campaigns that drive growth, engagement, and conversion." },
          { heading: "Custom Software", body: "Tailored software solutions to streamline your business operations." },
          { heading: "SEO & Analytics", body: "Data-driven strategies to improve visibility and rank higher on search engines." },
        ], "Comprehensive digital solutions tailored for ambitious brands."),
        cta("Ready to transform?", "Let's build something extraordinary together. From concept to launch, we are your partners in digital innovation.", "Let's Talk", "/contact"),
      ],
    },
    {
      _id: "drivwon-seed-page-about",
      _type: "page",
      title: "About",
      slug: { _type: "slug", current: "about" },
      seo: { metaTitle: "About Drivwon | Technology that empowers", metaDescription: "Meet Drivwon, a Geelong technology company building practical, secure and human-centric digital solutions." },
      sections: [
        hero("Technology That Empowers", "Building intelligent, scalable, and impact-driven digital solutions that help businesses evolve and lead.", "(about Drivwon.)"),
        rich("Technology should empower people, simplify complexity, and create measurable value.", [{ text: "By combining AI innovation with industry insight, we aim to help businesses evolve, adapt, and lead in a rapidly changing digital world. We believe advanced technology should be practical, secure, and human-centric." }], "OUR VISION"),
        rich("Next-Generation Technology Solutions", [
          { text: "Drivwon is a next-generation technology company focused on building intelligent, scalable, and impact-driven digital solutions. We specialize in Artificial Intelligence, automation, web platforms, and smart business systems that help organizations streamline operations, enhance decision-making, and unlock new growth opportunities." },
          { text: "Our philosophy is simple: advanced technology should be practical, secure, and human-centric. By combining cutting-edge AI research with real-world industry experience, Drivwon delivers solutions that are innovative yet grounded, powerful yet easy to adopt." },
        ], "ABOUT DRIVWON"),
        cards("How We Work", [
          { heading: "AI-Powered Innovation", body: "Leveraging cutting-edge AI research and machine learning to build intelligent systems that adapt and improve." },
          { heading: "Industry Expertise", body: "Deep understanding of real-world challenges across multiple industries—from tech to real estate to e-commerce." },
          { heading: "Practical Solutions", body: "Advanced technology that solves real problems. We balance innovation with usability and adoption." },
          { heading: "Strategic Partnership", body: "We're not just vendors. We're partners invested in your success and long-term growth." },
        ]),
      ],
    },
    {
      _id: "drivwon-seed-page-services",
      _type: "page",
      title: "Services",
      slug: { _type: "slug", current: "services" },
      seo: { metaTitle: "Digital, software, AI & marketing services | Drivwon", metaDescription: "Explore Drivwon's software, AI automation, web, mobile, design, SEO and digital marketing services in Geelong and Australia." },
      sections: [
        hero("Our Services", "From custom software and AI agents to branding, marketing, and everything in between — one team, end-to-end, built to move your business forward.", "Full-Service Technology Partner"),
        cards("Service Lines", [
          { heading: "11 Service Lines", body: "End-to-end coverage from strategy to launch." },
          { heading: "50+ Projects Delivered", body: "Across web, mobile, and AI-driven products." },
          { heading: "100% In-House Build", body: "No outsourcing — one team, start to finish." },
          { heading: "24/7 Support & Monitoring", body: "Ongoing care after every launch." },
        ]),
        cards("What We Offer", services.map(([heading, body], index) => ({
          heading,
          body: index === 10 ? `${body}\nPaid Campaigns: Targeted ad strategy across search & social.\nOrganic Growth: Content and community-led acquisition.\nCross-Channel: Unified strategy across every platform.` : body,
        }))),
        cards("From Strategy to Launch — and Beyond", [
          { heading: "01 · Discovery & Strategy", body: "We start by understanding your business, your users, and your goals — mapping out the right mix of services to get there.\nStakeholder interviews · Technical & market assessment · Scope and roadmap definition · Success metrics established.\nDeliverables: Clear documentation, milestones, and sign-off at every stage." },
          { heading: "02 · Design & Architecture", body: "Product design and technical architecture come together before a single line of production code is written.\nUI/UX wireframes & prototypes · System & data architecture · Brand and design system alignment · Stakeholder review & sign-off.\nDeliverables: Clear documentation, milestones, and sign-off at every stage." },
          { heading: "03 · Build & Integrate", body: "Our team builds your software, app, store, or automation in-house — integrating AI, analytics, and third-party tools as needed.\nAgile, milestone-based delivery · Continuous testing & QA · AI/automation integration · Analytics & tracking setup.\nDeliverables: Clear documentation, milestones, and sign-off at every stage." },
          { heading: "04 · Launch & Grow", body: "We launch with you, then keep optimising — through SEO, marketing, dashboards, and ongoing support.\nDeployment & go-live support · SEO & marketing activation · Performance monitoring · Ongoing iteration & support.\nDeliverables: Clear documentation, milestones, and sign-off at every stage." },
        ], "A consistent process across every service line, so nothing falls through the cracks.", "Our Process"),
        cards("Built for Businesses Like Yours", [
          { heading: "Startups & SaaS", body: "MVP builds, product-market fit iteration, and scalable architecture for early-stage teams.\nTypical outcome: Faster time-to-launch, built to scale." },
          { heading: "E-commerce & Retail", body: "Custom storefronts, checkout optimisation, and marketing to convert traffic into sales.\nTypical outcome: Higher conversion, streamlined operations." },
          { heading: "Professional Services", body: "Websites, branding, and automation that make client-facing operations run smoother.\nTypical outcome: Stronger positioning, less manual admin." },
          { heading: "Operations-Heavy Businesses", body: "AI agents and automation that take repetitive workflows off your team's plate.\nTypical outcome: Reduced manual work, fewer errors." },
          { heading: "Data-Driven Teams", body: "Dashboards and analytics pipelines that make your data actually usable day to day.\nTypical outcome: Faster decisions, clearer reporting." },
          { heading: "Established Enterprises", body: "System architecture, IT consulting, and cybersecurity-aware infrastructure planning.\nTypical outcome: Reliable systems, future-proofed stack." },
        ], "Our services flex to fit the stage and shape of your business — whether you're launching or scaling.", "Who We Work With"),
        cta("Ready to Build Something?", "Tell us what you're working on — software, an app, an AI agent, or a full brand refresh — and we'll map out the right services to get you there.", "Start a Project", "/contact", "Free consultation · No obligation · Clear scope before we start"),
      ],
    },
    {
      _id: "drivwon-seed-page-projects",
      _type: "page",
      title: "Selected Projects",
      slug: { _type: "slug", current: "projects" },
      seo: { metaTitle: "Selected projects | Drivwon", metaDescription: "A showcase of Drivwon digital projects across websites, commerce, logistics, energy and finance." },
      sections: [
        hero("Selected Projects", "A showcase of digital excellence. Exploring the boundaries of web development and AI integration."),
        cards("Selected Work", projects.map((project) => ({ heading: project.title, body: project.description, image: project.image, link: { label: "View project", href: project.link } }))),
      ],
    },
    {
      _id: "drivwon-seed-page-contact",
      _type: "page",
      title: "Get in Touch",
      slug: { _type: "slug", current: "contact" },
      seo: { metaTitle: "Contact Drivwon | Geelong, Australia", metaDescription: "Talk to Drivwon about your next digital, software, web, mobile or marketing project." },
      sections: [
        hero("Get in Touch", "Have a project in mind? We'd love to hear from you. Send us a message and let's start a conversation."),
        cards("Contact Drivwon", [
          { heading: "Email Us", body: "info@drivwon.com", link: { label: "Email Drivwon", href: "mailto:info@drivwon.com" } },
          { heading: "Call Us", body: "0474 817 548", link: { label: "Call Drivwon", href: "tel:+61474817548" } },
          { heading: "Visit Us", body: "Geelong, Australia" },
        ]),
        rich("Contact form", [
          { text: "Existing form fields: Name, Email, Message. Submit button: Send Message." },
          { text: "Form behavior is not published from these draft CMS pages; review the CMS form section and email delivery before publishing this page." },
        ]),
      ],
    },
    {
      _id: "drivwon-seed-page-quotation",
      _type: "page",
      title: "Request a Quote",
      slug: { _type: "slug", current: "quotation" },
      seo: { metaTitle: "Request a project quote | Drivwon", metaDescription: "Tell Drivwon about your goals, service needs and budget to get a project quote." },
      sections: [
        hero("Request a Quote", "Tell us about your project goals and budget, and we'll help you build the perfect solution."),
        rich("Project quote request", [
          { text: "Existing form fields: Full Name, Company (Optional), Email Address, Service Required, Estimated Budget (AUD), Project Details." },
          { text: "Service options: Web Development, Mobile App Development, Branding & Design, Digital Marketing, SEO Optimization." },
          { text: "Budget options: $5,000–$10,000, $10,000–$25,000, $25,000–$50,000, $50,000+." },
          { text: "Submit button: Submit. The current page says: “Tell us about your project goals and budget, and we'll help you build the perfect solution.”" },
          { text: "Form behavior is not published from this draft CMS page; review CMS form submission settings before publishing." },
        ]),
      ],
    },
    {
      _id: "drivwon-seed-page-privacy-policy",
      _type: "page",
      title: "Privacy Policy",
      slug: { _type: "slug", current: "privacy-policy" },
      seo: { metaTitle: "Privacy policy | Drivwon", metaDescription: "Read how Drivwon collects, uses, protects and manages personal information." },
      sections: [
        hero("Your Privacy Matters", "Last updated: December 2025", "(privacy policy.)"),
        rich("Privacy Policy", [
          { text: "At Drivwon, we are committed to protecting your privacy and ensuring you have a positive experience on our website and when using our services. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and interact with our services." },
          { text: "Please read this Privacy Policy carefully. By accessing and using Drivwon's website and services, you acknowledge that you have read, understood, and agree to be bound by all the provisions of this Privacy Policy." },
          { text: "Information We Collect", style: "h2" },
          { text: "Personal Information", style: "h3" },
          { text: "We collect information you voluntarily provide when you contact us, request a quote, subscribe to our newsletter, or use our services. This may include your name, email address, phone number, company information, and project details." },
          { text: "Technical Information", style: "h3" },
          { text: "We automatically collect certain information about your device when you visit our website, including IP address, browser type, operating system, referral source, and pages visited. This information helps us understand how our website is used and improve your experience." },
          { text: "Cookies and Tracking", style: "h3" },
          { text: "We use cookies and similar tracking technologies to enhance your experience on our website. You can control cookie settings through your browser preferences. Some cookies are essential for website functionality, while others help us analyze usage patterns." },
          { text: "How We Use Your Information", style: "h2" },
          { text: "To provide and improve our services · To communicate with you about inquiries and projects · To send you newsletters and marketing communications (with your consent) · To analyze website usage and improve user experience · To comply with legal obligations and protect our rights · To develop new products and services." },
          { text: "Data Protection & Security", style: "h2" },
          { text: "We implement comprehensive security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, access controls, and regular security audits." },
          { text: "However, no method of transmission over the internet or electronic storage is completely secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee absolute security." },
          { text: "Third-Party Services", style: "h2" },
          { text: "Our website may contain links to third-party websites and services that are not operated by Drivwon. This Privacy Policy does not apply to third-party websites, and we are not responsible for their privacy practices. We encourage you to review the privacy policies of any third-party services before providing your information." },
          { text: "We may use third-party service providers to assist us in operating our website and conducting our business. These providers are contractually obligated to maintain the confidentiality of your information." },
          { text: "Your Privacy Rights", style: "h2" },
          { text: "Depending on your location, you may have certain rights regarding your personal information, including the right to access, correct, delete, or port your data. You may also have the right to opt-out of certain processing activities." },
          { text: "To exercise any of these rights, please contact us at hello@Drivwon.com. We will respond to your request within 30 days in accordance with applicable laws." },
          { text: "Questions About Privacy?", style: "h2" },
          { text: "If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us: info@drivwon.com · Geelong, VIC, Australia · We aim to respond to all privacy requests within 30 days." },
          { text: "Policy Updates", style: "h2" },
          { text: "We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of material changes by updating the “Last Updated” date at the top of this policy. Your continued use of our services after any modifications constitutes your acceptance of the updated Privacy Policy." },
        ]),
      ],
    },
  ];
}

async function main() {
  const images = await uploadImages();
  const pages = makePages(images);
  const siteSettings = {
    _id: "drivwon-seed-site-settings",
    _type: "siteSettings",
    siteName: "Drivwon",
    tagline: "Digital experiences that empower businesses.",
    logo: images.logo,
    email: "info@drivwon.com",
    phone: "0474 817 548",
    addressLocality: "Geelong",
    addressRegion: "Victoria",
    addressCountry: "AU",
    navigation: [
      { _key: "home", label: "Home", href: "/" },
      { _key: "about", label: "About", href: "/about" },
      { _key: "services", label: "Services", href: "/services" },
      { _key: "projects", label: "Projects", href: "/projects" },
      { _key: "blog", label: "Blog", href: "/blog" },
      { _key: "quote", label: "Get Quote", href: "/quotation" },
      { _key: "contact", label: "Contact", href: "/contact" },
    ],
    footerText: "Crafting digital experiences that transcend the ordinary. Based in Geelong, Australia, serving the globe.",
    footerServices: ["Branding & Design", "Web Development", "Mobile Applications", "Digital Marketing", "SEO Optimization", "AI Agents"].map((label, index) => ({ _key: `service-${index + 1}`, label, href: "/services" })),
    footerLinks: [
      { _key: "about", label: "About Us", href: "/about" },
      { _key: "contact", label: "Contact", href: "/contact" },
      { _key: "quote", label: "Get a Quote", href: "/quotation" },
      { _key: "privacy", label: "Privacy Policy", href: "/privacy-policy" },
    ],
  };

  const seedDocuments = [
    { ...siteSettings, _id: `drafts.${siteSettings._id}` },
    ...pages.map((page) => ({ ...page, _id: `drafts.${page._id}` })),
  ];
  for (const document of seedDocuments) {
    await client.createOrReplace(document as any);
    console.log(`Seeded draft: ${document._type} / ${document._id}`);
  }
  console.log(`Done. ${seedDocuments.length} CMS drafts created; none were published.`);
}

main().catch((error) => {
  console.error("Sanity content seed failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
