import {routing, type AppLocale} from "@/i18n/routing";

const STATIC_LOCALE = (process.env.NEXT_PUBLIC_STATIC_LOCALE ?? routing.defaultLocale) as AppLocale;

const contentByLocale: Record<string, {title: string; updated: string; sections: Array<{heading: string; body: string}>}> = {
  en: {
    title: "Privacy Policy",
    updated: "Last updated: March 28, 2026",
    sections: [
      {heading: "Data We Collect", body: "We collect account profile data, authentication events, and scan metadata required to deliver diagnostics and maintain platform security."},
      {heading: "How We Use Data", body: "Data is used to authenticate users, provide disease analysis, improve model performance, and monitor reliability and abuse prevention controls."},
      {heading: "Data Sharing", body: "We do not sell personal data. Data may be shared with infrastructure providers solely for hosting, security, and service delivery under contractual safeguards."},
      {heading: "Security Controls", body: "BlueVision applies technical and organizational controls including access restriction, request tracing, and abuse protection to reduce unauthorized access risk."},
      {heading: "Retention", body: "Account and scan records are retained while your account is active or as required for operational, legal, and security obligations."},
      {heading: "Your Rights", body: "You may request access, correction, portability, or deletion of your personal data, subject to legal and security requirements."},
      {heading: "Contact", body: "For privacy questions or requests, contact BlueVision support through the official platform support channel."}
    ]
  },
  es: {
    title: "Política de Privacidad",
    updated: "Última actualización: 28 de marzo de 2026",
    sections: [
      {heading: "Datos que recopilamos", body: "Recopilamos datos de perfil, eventos de autenticación y metadatos de escaneo necesarios para diagnósticos y seguridad."},
      {heading: "Cómo usamos los datos", body: "Los datos se usan para autenticar, analizar enfermedades, mejorar modelos y monitorear confiabilidad y abuso."},
      {heading: "Compartición de datos", body: "No vendemos datos personales. Solo compartimos con proveedores de infraestructura para alojamiento, seguridad y operación bajo controles contractuales."},
      {heading: "Controles de seguridad", body: "BlueVision aplica controles técnicos y organizativos para reducir accesos no autorizados y uso indebido."},
      {heading: "Retención", body: "Los registros se conservan mientras la cuenta esté activa o por obligaciones legales y de seguridad."},
      {heading: "Sus derechos", body: "Puede solicitar acceso, corrección, portabilidad o eliminación de datos, sujeto a requisitos legales y de seguridad."},
      {heading: "Contacto", body: "Para consultas de privacidad, contacte al soporte oficial de BlueVision."}
    ]
  },
  hi: {
    title: "गोपनीयता नीति",
    updated: "अंतिम अपडेट: 28 मार्च 2026",
    sections: [
      {heading: "हम कौन-सा डेटा एकत्र करते हैं", body: "हम प्रोफाइल डेटा, लॉगिन इवेंट और स्कैन मेटाडेटा एकत्र करते हैं ताकि निदान और सुरक्षा प्रदान की जा सके।"},
      {heading: "डेटा का उपयोग", body: "डेटा का उपयोग प्रमाणीकरण, रोग विश्लेषण, मॉडल सुधार और विश्वसनीयता/दुरुपयोग मॉनिटरिंग के लिए किया जाता है।"},
      {heading: "डेटा साझा करना", body: "हम व्यक्तिगत डेटा नहीं बेचते। डेटा केवल होस्टिंग, सुरक्षा और सेवा संचालन के लिए बुनियादी ढांचा प्रदाताओं के साथ साझा किया जा सकता है।"},
      {heading: "सुरक्षा नियंत्रण", body: "BlueVision अनधिकृत पहुंच जोखिम कम करने के लिए तकनीकी और संगठनात्मक सुरक्षा नियंत्रण लागू करता है।"},
      {heading: "संग्रहण अवधि", body: "डेटा आपकी खाता सक्रियता या कानूनी/सुरक्षा आवश्यकताओं के अनुसार रखा जाता है।"},
      {heading: "आपके अधिकार", body: "आप एक्सेस, सुधार, पोर्टेबिलिटी या हटाने का अनुरोध कर सकते हैं, कानूनी व सुरक्षा शर्तों के अधीन।"},
      {heading: "संपर्क", body: "गोपनीयता से जुड़े प्रश्नों के लिए BlueVision सपोर्ट से संपर्क करें।"}
    ]
  },
  zh: {
    title: "隐私政策",
    updated: "最后更新：2026年3月28日",
    sections: [
      {heading: "我们收集的数据", body: "我们收集账户资料、认证事件和扫描元数据，以提供诊断与平台安全。"},
      {heading: "数据用途", body: "数据用于用户认证、病害分析、模型优化，以及可靠性和滥用防护监控。"},
      {heading: "数据共享", body: "我们不出售个人数据。数据仅会在托管、安全和服务交付所必需范围内与基础设施供应商共享。"},
      {heading: "安全控制", body: "BlueVision 采用技术与组织控制，包括访问限制与请求追踪，以降低未授权访问风险。"},
      {heading: "保存期限", body: "在账户有效期内或为满足运营、法律与安全要求时保留相关记录。"},
      {heading: "您的权利", body: "在符合法律和安全要求前提下，您可申请访问、更正、可携带或删除个人数据。"},
      {heading: "联系我们", body: "如有隐私相关问题，请通过 BlueVision 官方支持渠道联系。"}
    ]
  },
  ar: {
    title: "سياسة الخصوصية",
    updated: "آخر تحديث: 28 مارس 2026",
    sections: [
      {heading: "البيانات التي نجمعها", body: "نجمع بيانات الحساب وأحداث تسجيل الدخول وبيانات المسح اللازمة لتقديم التشخيص وتأمين المنصة."},
      {heading: "كيفية استخدام البيانات", body: "تستخدم البيانات للمصادقة، وتحليل الأمراض، وتحسين النموذج، ومراقبة الاعتمادية ومنع إساءة الاستخدام."},
      {heading: "مشاركة البيانات", body: "لا نبيع البيانات الشخصية. قد تتم مشاركة البيانات مع مزودي البنية التحتية فقط لأغراض الاستضافة والأمان وتشغيل الخدمة."},
      {heading: "ضوابط الأمان", body: "تطبق BlueVision ضوابط تقنية وتنظيمية مثل تقييد الوصول وتتبع الطلبات للحد من مخاطر الوصول غير المصرح به."},
      {heading: "الاحتفاظ بالبيانات", body: "يتم الاحتفاظ بالسجلات طوال فترة نشاط الحساب أو حسب المتطلبات القانونية والأمنية."},
      {heading: "حقوقك", body: "يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو نقلها أو حذفها، وفق المتطلبات القانونية والأمنية."},
      {heading: "التواصل", body: "للاستفسارات المتعلقة بالخصوصية، تواصل مع دعم BlueVision عبر القنوات الرسمية."}
    ]
  }
};

export default async function PrivacyPage() {
  const locale = routing.locales.includes(STATIC_LOCALE) ? STATIC_LOCALE : routing.defaultLocale;
  const content = contentByLocale[locale] ?? contentByLocale.en;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 md:px-8">
      <h1 className="text-3xl font-semibold text-[var(--text-primary)]">{content.title}</h1>
      <p className="mt-2 text-sm text-[var(--text-tertiary)]">{content.updated}</p>
      <div className="mt-8 space-y-6">
        {content.sections.map((section) => (
          <section key={section.heading} className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{section.heading}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{section.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
