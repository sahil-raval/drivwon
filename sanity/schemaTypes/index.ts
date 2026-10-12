import { faq } from "./faq";
import { page } from "./page";
import { post } from "./post";
import { portableText } from "./objects/portableText";
import { seoObject } from "./objects/seo";
import { contentSections } from "./objects/contentSections";
import { siteSettings } from "./siteSettings";

export const schemaTypes = [siteSettings, page, post, faq, seoObject, portableText, ...contentSections];
