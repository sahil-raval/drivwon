import { lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SmoothScroll from "@/components/ui/SmoothScroll";
import CustomCursor from "@/components/ui/CustomCursor";
import PageTransition from "@/components/ui/PageTransition";
import ScrollToTop from "@/components/ui/ScrollToTop";
import Analytics from "@/features/analytics/Analytics";

const CmsPage = lazy(() => import("@/features/cms/CmsPage"));
const Home = lazy(() => import("@/pages/home"));
const About = lazy(() => import("@/pages/about"));
const Services = lazy(() => import("@/pages/services"));
const Contact = lazy(() => import("@/pages/contact"));
const Quotation = lazy(() => import("@/pages/quotation"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));
const Projects = lazy(() => import("@/pages/projects"));
const StudioPage = lazy(() => import("@/features/cms/Studio"));
const BlogIndex = lazy(() => import("@/features/blog/BlogIndex"));
const CategoryPage = lazy(() => import("@/features/blog/BlogIndex").then((module) => ({ default: module.CategoryPage })));
const AuthorPage = lazy(() => import("@/features/blog/BlogIndex").then((module) => ({ default: module.AuthorPage })));
const BlogArticle = lazy(() => import("@/features/blog/BlogArticle"));
const Workspace = lazy(() => import("@/features/admin/Workspace"));
const Chatbot = lazy(() => import("@/features/chatbot/Chatbot"));

/**
 * Every public route tries the CMS first. The hand-built pages are only a fallback
 * until a matching Sanity document (same slug) is published.
 */
const withFallback = (Fallback: React.ComponentType) => () => <CmsPage fallback={Fallback} />;
const HomeRoute = withFallback(Home);
const AboutRoute = withFallback(About);
const ServicesRoute = withFallback(Services);
const ContactRoute = withFallback(Contact);
const QuotationRoute = withFallback(Quotation);
const PrivacyRoute = withFallback(PrivacyPolicy);
const ProjectsRoute = withFallback(Projects);
const CmsOnlyRoute = () => <CmsPage />;

const privatePaths = ["/drivwon/der", "/dashboard", "/studio"];

function Router() {
  const [location] = useLocation();
  return (
    <PageTransition>
      <ScrollToTop />
      <Suspense fallback={<div className="min-h-screen bg-background" aria-label="Loading page" />}>
        <Switch>
          <Route path="/" component={HomeRoute} />
          <Route path="/about" component={AboutRoute} />
          <Route path="/services" component={ServicesRoute} />
          <Route path="/contact" component={ContactRoute} />
          <Route path="/quotation" component={QuotationRoute} />
          <Route path="/privacy-policy" component={PrivacyRoute} />
          <Route path="/projects" component={ProjectsRoute} />
          <Route path="/blog" component={BlogIndex} />
          <Route path="/blog/category/:slug" component={CategoryPage} />
          <Route path="/blog/:slug" component={BlogArticle} />
          <Route path="/authors/:slug" component={AuthorPage} />
          <Route path="/services/:slug" component={CmsOnlyRoute} />
          <Route path="/locations/:slug" component={CmsOnlyRoute} />
          <Route path="/projects/:slug" component={CmsOnlyRoute} />
          <Route path="/studio" component={StudioPage} />
          <Route path="/drivwon/der" component={Workspace} />
          <Route component={CmsOnlyRoute} />
        </Switch>
      </Suspense>
      {!privatePaths.includes(location) && <Suspense fallback={null}><Chatbot /></Suspense>}
    </PageTransition>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SmoothScroll>
          <CustomCursor />
          <Toaster />
          <Analytics />
          <Router />
        </SmoothScroll>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
