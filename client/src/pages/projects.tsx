import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAudio } from "@/lib/audio";
import { ExternalLink, Github } from "lucide-react";
import psm from "@/assets/projects/psmfinance.webp";
import aprational from "@/assets/projects/aprational.webp";
import msm from "@/assets/projects/msm.webp";
import scrub from "@/assets/projects/Scrub.webp";
import varni from "@/assets/projects/Varni.webp";
import daytoday from "@/assets/projects/Daytoday.webp";

const projects = [
  {
    title: "Day To Day Deals",
    description: "A high-performance neural network visualization dashboard built with React and Three.js.",
    image: daytoday,
    tags: ["React", "Three.js", "Tailwind"],
    link: "https://daytodaydeals.com.au",
    github: "#"
  },
  {
    title: "Varni Diamonds",
    description: "Next-generation e-commerce platform with real-time stock tracking and AI recommendations.",
    image: varni,
    tags: ["Next.js", "Node.js", "Stripe"],
    link: "https://www.varnidiamonds.com.au",
    github: "#"
  },
  {
    title: "Scrub N Clean",
    description: "Decentralized identity management system with biometric authentication and blockchain security.",
    image: scrub,
    tags: ["Web3", "Solidity", "TypeScript"],
    link: "https://www.scrubnclean.com.au",
    github: "#"
  },
  {
    title: "MSM Logistics",
    description: "Decentralized identity management system with biometric authentication and blockchain security.",
    image: msm,
    tags: ["Web3", "Solidity", "TypeScript"],
    link: "https://www.msmtranslink.com",
    github: "#"
  },
  {
    title: "Aprational Energy",
    description: "Decentralized identity management system with biometric authentication and blockchain security.",
    image: aprational,
    tags: ["Web3", "Solidity", "TypeScript"],
    link: "#",
    github: "#"
  },
  {
    title: "PSM Finance",
    description: "Decentralized identity management system with biometric authentication and blockchain security.",
    image: psm,
    tags: ["Web3", "Solidity", "TypeScript"],
    link: "#",
    github: "#"
  }
  
];

export default function Projects() {
  const { playHover, playClick } = useAudio();

  return (
    <div className="min-h-screen bg-black text-white font-inter selection:bg-blue-500/30">
      <Navbar />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-20"
          >
            <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">Selected Projects </h1>
            <p className="text-xl text-muted-foreground">
               A showcase of digital excellence. Exploring the boundaries of web development and AI integration.
            </p>
          </div>
           
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onMouseEnter={playHover}
                className="group relative bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-500"
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={project.image}
                    alt={project.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                
                <div className="p-8">
                  <div className="flex gap-2 mb-4">
                    {project.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-space-grotesk text-white/60">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <h3 className="font-syne text-2xl font-bold mb-3 group-hover:text-blue-400 transition-colors">
                    {project.title}
                  </h3>
                  
                  <p className="font-space-grotesk text-white/40 mb-6 line-clamp-2">
                    {project.description}
                  </p>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={playClick}
                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors"
                      data-testid={`link-project-demo-${index}`}
                    >
                      <ExternalLink size={20} />
                    </button>
                    <button
                      onClick={playClick}
                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors"
                      data-testid={`link-project-github-${index}`}
                    >
                      <Github size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
