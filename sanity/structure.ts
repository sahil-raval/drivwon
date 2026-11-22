import type { StructureResolver } from "sanity/structure";
import {
  CogIcon, DocumentIcon, RocketIcon, EditIcon, UserIcon, TagIcon, WrenchIcon, MarkerIcon, CaseIcon, CommentIcon,
  HelpCircleIcon, EnvelopeIcon, BlockElementIcon, ArrowRightIcon, InboxIcon, TrendUpwardIcon,
} from "./lib/icons";

const leadStatuses = [
  ["new", "🆕 New"], ["contacted", "📞 Contacted"], ["qualified", "✅ Qualified"], ["proposal", "📄 Proposal sent"],
  ["won", "🏆 Won"], ["lost", "❌ Lost"], ["spam", "🗑 Spam"],
] as const;

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Drivwon")
    .items([
      S.listItem().title("Site settings").icon(CogIcon).child(S.document().schemaType("siteSettings").documentId("siteSettings").title("Site settings")),
      S.divider(),
      S.documentTypeListItem("page").title("Pages").icon(DocumentIcon),
      S.documentTypeListItem("landingPage").title("Landing pages").icon(RocketIcon),
      S.documentTypeListItem("service").title("Services").icon(WrenchIcon),
      S.documentTypeListItem("location").title("Locations").icon(MarkerIcon),
      S.documentTypeListItem("caseStudy").title("Case studies").icon(CaseIcon),
      S.divider(),
      S.listItem().title("Blog").icon(EditIcon).child(
        S.list().title("Blog").items([
          S.documentTypeListItem("post").title("Posts").icon(EditIcon),
          S.listItem().title("Drafts & scheduled").icon(EditIcon).child(S.documentList().title("Not live yet").filter('_type == "post" && (_id in path("drafts.**") || publishedAt > now())')),
          S.documentTypeListItem("category").title("Categories").icon(TagIcon),
          S.documentTypeListItem("author").title("Authors & team").icon(UserIcon),
        ]),
      ),
      S.documentTypeListItem("testimonial").title("Testimonials").icon(CommentIcon),
      S.documentTypeListItem("faq").title("FAQs & chatbot").icon(HelpCircleIcon),
      S.divider(),
      S.listItem().title("Leads").icon(InboxIcon).child(
        S.list().title("Leads").items([
          S.listItem().title("All leads").icon(InboxIcon).child(S.documentList().title("All leads").schemaType("lead").filter('_type == "lead"').defaultOrdering([{ field: "submittedAt", direction: "desc" }])),
          S.divider(),
          ...leadStatuses.map(([value, title]) =>
            S.listItem().id(`lead-${value}`).title(title).child(S.documentList().title(title).schemaType("lead").filter('_type == "lead" && coalesce(status, "new") == $status').params({ status: value }).defaultOrdering([{ field: "submittedAt", direction: "desc" }])),
          ),
          S.divider(),
          S.listItem().title("From paid ads").icon(TrendUpwardIcon).child(S.documentList().title("Paid ads").schemaType("lead").filter('_type == "lead" && channel in ["Paid search", "Paid social"]')),
          S.listItem().title("From Google organic").icon(TrendUpwardIcon).child(S.documentList().title("Organic search").schemaType("lead").filter('_type == "lead" && channel == "Organic search"')),
          S.listItem().title("From AI assistants").icon(TrendUpwardIcon).child(S.documentList().title("AI referrals").schemaType("lead").filter('_type == "lead" && channel == "AI assistant"')),
        ]),
      ),
      S.documentTypeListItem("leadForm").title("Lead forms").icon(EnvelopeIcon),
      S.divider(),
      S.documentTypeListItem("reusableSection").title("Saved sections").icon(BlockElementIcon),
      S.documentTypeListItem("redirect").title("Redirects").icon(ArrowRightIcon),
    ]);
