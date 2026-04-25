"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SonarPulse } from "@/components/sonar-pulse";
import { ThemeLanguageSwitcher } from "@/components/theme-language-switcher";
import { 
  Plant, 
  Zap, 
  BarChart3, 
} from "lucide-react";
import { useState } from "react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

export function PlantifyShowcase() {
  const locale = useLocale();
  const isRTL = locale === "ar";
  const [selectedDisease, setSelectedDisease] = useState("Apple Scab");

  const diseases = [
    { name: "Apple Scab", confidence: 0.92, status: "critical" },
    { name: "Plant Rust", confidence: 0.78, status: "warning" },
    { name: "Powdery Mildew", confidence: 0.65, status: "warning" },
    { name: "Healthy", confidence: 0.95, status: "success" },
  ];

  const features = [
    {
      icon: Plant,
      title: isRTL ? "الكشف الدقيق" : "Accurate Detection",
      desc: isRTL ? "تحديد أمراض النبات برقة 92%" : "Identify plant diseases at 92% accuracy",
    },
    {
      icon: Zap,
      title: isRTL ? "معالجة فورية" : "Instant Processing",
      desc: isRTL ? "الحصول على النتائج في أقل من ثانية" : "Get results in less than a second",
    },
    {
      icon: BarChart3,
      title: isRTL ? "تحليلات متقدمة" : "Advanced Analytics",
      desc: isRTL ? "تتبع صحة المحاصيل على مدار الوقت" : "Track plant health over time",
    },
  ];

  return (
    <div 
      className="min-h-screen bg-plantify-bg text-plantify-text transition-colors duration-300"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <header className="border-b border-plantify-border sticky top-0 z-40 bg-plantify-bg/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.h1
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold text-accent"
          >
            Plantify
          </motion.h1>
          <ThemeLanguageSwitcher />
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Main Title */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h2 className="text-5xl font-bold leading-tight">
              {isRTL
                ? "الزراعة الذكية مع تقنية الذكاء الاصطناعي"
                : "Smart Agriculture Powered by AI"}
            </h2>
            <p className="text-xl text-plantify-text/70 max-w-2xl">
              {isRTL
                ? "كشف أمراض النبات وعلاجها باستخدام تقنية الذكاء الاصطناعي المتقدمة والخبراء الزراعيين"
                : "Detect and treat plant diseases with advanced AI technology and agricultural experts"}
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex gap-4 flex-wrap"
          >
            <Button
              size="lg"
              className="px-8 py-3 text-lg font-semibold"
            >
              {isRTL ? "ابدأ الآن" : "Get Started"}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="px-8 py-3 text-lg font-semibold"
            >
              {isRTL ? "اعرف المزيد" : "Learn More"}
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-3 gap-6"
        >
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div key={i} variants={itemVariants}>
                <Card interactive className="h-full">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-accent" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-plantify-text/70">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Disease Detection Demo */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="space-y-8"
        >
          <motion.div variants={itemVariants}>
            <h3 className="text-3xl font-bold mb-2">
              {isRTL ? "كشف الأمراض" : "Disease Detection"}
            </h3>
            <p className="text-plantify-text/70">
              {isRTL
                ? "استخدم النموذج المتقدم لتحديد أمراض النبات برقة عالية"
                : "Use our advanced model to identify plant diseases with high accuracy"}
            </p>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-8">
              <div className="grid md:grid-cols-3 gap-8">
                {/* Scanner */}
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="h-40 w-40 rounded-full bg-accent/5 flex items-center justify-center">
                    <SonarPulse size={120} duration={2} intensity={0.6} />
                  </div>
                  <Button variant="secondary">
                    {isRTL ? "رفع صورة" : "Upload Image"}
                  </Button>
                </div>

                {/* Results */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg mb-4">
                    {isRTL ? "النتائج" : "Results"}
                  </h4>
                  <AnimatePresence mode="wait">
                    {diseases.map((disease, i) => (
                      <motion.div
                        key={disease.name}
                        initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => setSelectedDisease(disease.name)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                          selectedDisease === disease.name
                            ? "border-accent bg-accent/10 shadow-cobalt"
                            : "border-plantify-border hover:border-accent/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{disease.name}</span>
                          <Badge
                            variant={
                              disease.status === "success"
                                ? "success"
                                : disease.status === "critical"
                                  ? "error"
                                  : "warning"
                            }
                          >
                            {(disease.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">
                    {isRTL ? "التفاصيل" : "Details"}
                  </h4>
                  <motion.div
                    key={selectedDisease}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="p-4 rounded-lg bg-plantify-secondary/50 border border-plantify-border">
                      <p className="text-sm text-plantify-text/70 mb-2">
                        {isRTL ? "الأعراض" : "Symptoms"}
                      </p>
                      <p className="font-medium">
                        {isRTL
                          ? "بقع بنية مع هالات خفيفة على الأوراق"
                          : "Brown spots with light halos on leaves"}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                      <p className="text-sm text-plantify-text/70 mb-2">
                        {isRTL ? "العلاج الموصى به" : "Recommended Treatment"}
                      </p>
                      <p className="font-medium text-accent">
                        {isRTL
                          ? "رش مبيد الفطريات كل 7-10 أيام"
                          : "Apply fungicide every 7-10 days"}
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </section>

      {/* Bilingual Content Example */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="space-y-8"
        >
          <motion.h3 variants={itemVariants} className="text-3xl font-bold">
            {isRTL ? "دعم اللغات المتعددة" : "Multi-Language Support"}
          </motion.h3>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                flag: "🌍",
                title: isRTL ? "اللغة الإنجليزية" : "English",
                text: isRTL
                  ? "واجهة كاملة باللغة الإنجليزية"
                  : "Complete interface in English",
              },
              {
                flag: "🇸🇦",
                title: isRTL ? "اللغة العربية" : "Arabic",
                text: isRTL
                  ? "واجهة كاملة باللغة العربية مع دعم RTL"
                  : "Complete interface in Arabic with RTL support",
              },
            ].map((item, i) => (
              <motion.div key={i} variants={itemVariants}>
                <Card interactive>
                  <CardHeader>
                    <div className="text-4xl mb-2">{item.flag}</div>
                    <CardTitle>{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-plantify-text/70">{item.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

    </div>
  );
}
