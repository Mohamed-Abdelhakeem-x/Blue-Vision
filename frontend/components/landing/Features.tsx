"use client";

import { motion } from "framer-motion";
import { ScanSearch, Waves, Users, Camera, ShieldCheck, UserPlus, Bot, FileDown } from "lucide-react";

const features = [
  {
    title: "AI Disease Detection",
    description: "Simply snap a photo of a Nile Tilapia, and our advanced AI instantly detects any signs of diseases, providing immediate treatment recommendations.",
    icon: ScanSearch,
  },
  {
    title: "Water Quality Analysis",
    description: "Automatically monitor and analyze your pond's water quality parameters from your connected sensors to ensure optimal environmental conditions for your Tilapia.",
    icon: Waves,
  },
  {
    title: "Community & Experts",
    description: "Join a network of fellow fish farmers. Share insights, get advice, and stay updated on the latest aquaculture practices.",
    icon: Users,
  },
  {
    title: "Automated Fish Counting",
    description: "Instantly and accurately count the number of fish in your ponds using our advanced computer vision models, saving you hours of manual labor.",
    icon: Camera,
  },
  {
    title: "Secure & Private",
    description: "Your farm data is securely stored and private. Only you have access to your pond's sensitive analytics and history.",
    icon: ShieldCheck,
  },
  {
    title: "Team Management",
    description: "Easily invite your farm managers to the platform. Delegate tasks, share data, and manage your fish farm operations collaboratively.",
    icon: UserPlus,
  },
  {
    title: "AI Chatbot",
    description: "Got a question about aquaculture? Use our intelligent chat for instant advice, best practices, and troubleshooting tips.",
    icon: Bot,
  },
  {
    title: "Download Reports",
    description: "Export comprehensive executive summaries of your current farm operations.",
    icon: FileDown,
  },
];

export default function Features() {
  return (
    <section className="py-24 bg-zinc-950 text-white relative">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Everything you need to run a <br className="hidden md:block" />
            <span className="text-blue-400">successful Tilapia farm</span>
          </h2>
          <p className="text-zinc-400 text-lg">
            Our platform provides a complete suite of tools designed specifically for Nile Tilapia aquaculture, helping you reduce risks and increase profits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[90rem] mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="group relative p-8 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-blue-400 mb-6 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
