import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import SmoothScroll from "@/components/ui/SmoothScroll";
import CustomCursor from "@/components/ui/CustomCursor";
import PageTransition from "@/components/ui/PageTransition";
import { useAudio } from "@/lib/audio";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollToTop from "@/components/ui/ScrollToTop";
import { useLocation, useRoute } from "wouter";

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
const BlogArticle = lazy(() => import("@/features/blog/BlogArticle"));
const Workspace = lazy(() => import("@/features/admin/Workspace"));
const Chatbot = lazy(() => import("@/features/chatbot/Chatbot"));

const HomeFallback = () => <Home />;
const AboutFallback = () => <About />;
const ServicesFallback = () => <Services />;
const ContactFallback = () => <Contact />;
const QuotationFallback = () => <Quotation />;
const PrivacyPolicyFallback = () => <PrivacyPolicy />;
const ProjectsFallback = () => <Projects />;

function Router() {
  const [location] = useLocation();
  return (
    <PageTransition>
      <ScrollToTop />
      <Suspense fallback={<div className="min-h-screen bg-background" aria-label="Loading page" />}>
        <Switch>
          <Route path="/" component={() => <CmsPage slug="home" fallback={HomeFallback} />} />
          <Route path="/about" component={() => <CmsPage slug="about" fallback={AboutFallback} />} />
          <Route path="/services" component={() => <CmsPage slug="services" fallback={ServicesFallback} />} />
          <Route path="/contact" component={() => <CmsPage slug="contact" fallback={ContactFallback} />} />
          <Route path="/quotation" component={() => <CmsPage slug="quotation" fallback={QuotationFallback} />} />
          <Route path="/privacy-policy" component={() => <CmsPage slug="privacy-policy" fallback={PrivacyPolicyFallback} />} />
          <Route path="/projects" component={() => <CmsPage slug="projects" fallback={ProjectsFallback} />} />
          <Route path="/blog" component={BlogIndex} />
          <Route path="/blog/:slug" component={BlogArticle} />
          <Route path="/studio" component={StudioPage} />
          <Route path="/drivwon/der" component={Workspace} />
          <Route path="/:slug" component={CmsLandingRoute} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
      {location !== "/drivwon/der" && location !== "/dashboard" && location !== "/studio" && <Suspense fallback={null}><Chatbot /></Suspense>}
    </PageTransition>
  );
}

function CmsLandingRoute() {
  const [matched, params] = useRoute("/:slug");
  const slug = params?.slug ?? "";
  return matched ? <CmsPage slug={slug} /> : <NotFound />;
}

function SoundController() {
  const [location] = useLocation();
  const { toggleMute, isMuted } = useAudio();
  if (location === "/drivwon/der") return null;
  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed bottom-6 right-6 z-50 rounded-full w-12 h-12 bg-black/50 backdrop-blur-md border-white/10 hover:bg-white/10 text-white"
      onClick={toggleMute}
    >
      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
    </Button>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>

        <SmoothScroll>
          <CustomCursor />
          <Toaster />
          <SoundController />
          <Router />
        </SmoothScroll>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
