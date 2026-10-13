import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Code, Palette, Smartphone, Globe, Rocket, BarChart } from "lucide-react";
import { Link } from "wouter";
import TextReveal from "@/components/ui/TextReveal";
import { useAudio } from "@/lib/audio";

const services = [
  {
    icon: <Palette className="w-8 h-8 text-primary" />,
    title: "Branding & Design",
    description: "Visual identities that leave a lasting impression. Logos, guidelines, and UI/UX design."
  },
  {
    icon: <Globe className="w-8 h-8 text-primary" />,
    title: "Web Development",
    description: "Cutting-edge websites using React, Next.js, and Webflow. Fast, secure, and scalable."
  },
  {
    icon: <Smartphone className="w-8 h-8 text-primary" />,
    title: "Mobile Apps",
    description: "Native and cross-platform mobile applications for iOS and Android."
  },
  {
    icon: <Rocket className="w-8 h-8 text-primary" />,
    title: "Digital Marketing",
    description: "Strategic campaigns that drive growth, engagement, and conversion."
  },
  {
    icon: <Code className="w-8 h-8 text-primary" />,
    title: "Custom Software",
    description: "Tailored software solutions to streamline your business operations."
  },
  {
    icon: <BarChart className="w-8 h-8 text-primary" />,
    title: "SEO & Analytics",
    description: "Data-driven strategies to improve visibility and rank higher on search engines."
  }
];

export default function Home() {
  const { playHover, playClick } = useAudio();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,.18),transparent_65%)]">
          <div className="absolute inset-x-0 top-1/4 mx-auto h-56 w-56 rounded-full bg-primary/15 blur-[100px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-background" />
        </div>
        <div className="container relative z-10 px-6 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl mx-auto text-center"
          >
            <h1 className="text-5xl md:text-8xl font-display font-bold leading-tight mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
              <TextReveal text="Future Proof Digital Experiences" />
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-light leading-relaxed">
              We are Drivwon. A creative tech agency based in Australia, building the next generation of web and mobile interfaces.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/quotation">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 h-12 text-lg transition-transform hover:scale-105 active:scale-95"
                  onMouseEnter={playHover}
                  onClick={playClick}
                >
                  Start a Project
                </Button>
              </Link>
              <Link href="/services">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="rounded-full px-8 h-12 text-lg border-white/20 hover:bg-white/10 transition-transform hover:scale-105 active:scale-95"
                  onMouseEnter={playHover}
                  onClick={playClick}
                >
                  Explore Services
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30"
        >
          <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-white/50 to-transparent"></div>
        </motion.div>
      </section>

      {/* Services Section */}
      <section className="py-32 bg-black relative">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20">
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
                <TextReveal text="Our Expertise" delay={0.2} />
              </h2>
              <p className="text-muted-foreground">Comprehensive digital solutions tailored for ambitious brands.</p>
            </div>
            <Link href="/services">
              <Button 
                variant="link" 
                className="text-primary group text-lg p-0"
                onMouseEnter={playHover}
                onClick={playClick}
              >
                View all services <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2 cursor-none"
                onMouseEnter={playHover}
              >
                <div className="mb-6 p-4 rounded-full bg-white/5 w-fit group-hover:bg-primary/20 transition-colors">
                  {service.icon}
                </div>
                <h3 className="text-2xl font-display font-bold mb-3">{service.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5"></div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h2 className="text-5xl md:text-7xl font-display font-bold mb-8">
            <TextReveal text="Ready to transform?" />
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Let's build something extraordinary together. From concept to launch, we are your partners in digital innovation.
          </p>
          <Link href="/contact">
            <Button 
              size="lg" 
              className="bg-white text-black hover:bg-white/90 rounded-full px-10 h-14 text-lg font-bold transition-transform hover:scale-105 active:scale-95"
              onMouseEnter={playHover}
              onClick={playClick}
            >
              Let's Talk
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
