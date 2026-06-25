"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Create Your Farm Profile",
    description: "Sign up and add details about your Nile Tilapia ponds, including dimensions, stocking density, and current water parameters."
  },
  {
    number: "02",
    title: "Upload Scans & Data",
    description: "Farm managers can take pictures of the fish and upload them directly to the platform. Meanwhile, connected sensors automatically stream real-time water quality readings to your dashboard."
  },
  {
    number: "03",
    title: "Get AI Insights",
    description: "Our advanced models instantly analyze the data, identifying potential diseases and suggesting actionable treatment plans."
  }
];

export default function HowItWorks() {
  return (
    <section className="py-24 bg-black text-white border-t border-zinc-900">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-16 max-w-7xl mx-auto">
          
          <div className="lg:w-1/2">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Simplifying Aquaculture <br />
              <span className="text-zinc-500">Step by Step</span>
            </h2>
            <p className="text-zinc-400 text-lg mb-8">
              We've designed Blue-Vision to be intuitive and straightforward, so you can focus less on complicated software and more on raising healthy Tilapia.
            </p>
          </div>

          <div className="lg:w-1/2 w-full space-y-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="flex gap-6"
              >
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl font-bold text-blue-400">
                    {step.number}
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
