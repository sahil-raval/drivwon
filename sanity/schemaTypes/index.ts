import { entity, formField, keyValue, link, navItem, openingHours, sectionSettings, video } from "./objects/basics";
import { portableText } from "./objects/portableText";
import { seoObject } from "./objects/seo";
import { sectionTypes } from "./sections";
import { siteSettings } from "./documents/siteSettings";
import { faq, landingPage, leadForm, page, redirect, reusableSection } from "./documents/pages";
import { author, caseStudy, category, lead, location, post, service, testimonial } from "./documents/content";

export const schemaTypes = [
  // documents
  siteSettings, page, landingPage, post, author, category, service, location, caseStudy, testimonial, faq, leadForm, lead, reusableSection, redirect,
  // objects
  seoObject, portableText, link, sectionSettings, video, navItem, openingHours, entity, keyValue, formField,
  ...sectionTypes,
];

/** Only one of these may exist. */
export const singletonTypes = new Set(["siteSettings"]);
/** Created by the website, never by hand (their IDs must stay private). */
export const systemTypes = new Set(["lead"]);
