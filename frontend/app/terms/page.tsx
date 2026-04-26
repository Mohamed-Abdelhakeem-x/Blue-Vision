import {routing, type AppLocale} from "@/i18n/routing";

const STATIC_LOCALE = (process.env.NEXT_PUBLIC_STATIC_LOCALE ?? routing.defaultLocale) as AppLocale;

const contentByLocale: Record<string, {title: string; updated: string; sections: Array<{heading: string; body: string}>}> = {
  en: {
    title: "Terms of Service",
    updated: "Last updated: March 28, 2026",
    sections: [
      {heading: "Service Scope", body: "BlueVision provides AI-assisted plant diagnostics and recommendations. Outputs are decision-support guidance and do not replace professional agronomic judgment."},
      {heading: "Account Responsibilities", body: "You are responsible for account credentials, lawful usage, and accuracy of submitted data. Unauthorized access attempts are prohibited."},
      {heading: "Acceptable Use", body: "You agree not to abuse API capacity, bypass security controls, or use the service for unlawful or harmful activity."},
      {heading: "Service Availability", body: "We may update, suspend, or modify parts of the service for maintenance, security, or operational needs."},
      {heading: "Intellectual Property", body: "Platform code, branding, and service content remain property of BlueVision and its licensors unless otherwise stated."},
      {heading: "Liability", body: "BlueVision is provided as-is to the fullest extent allowed by law. Operational continuity and model output can vary by input quality and environmental factors."},
      {heading: "Termination", body: "Accounts may be suspended or terminated for policy violations, security risk, or unlawful use."}
    ]
  },
  es: {
    title: "Términos de Servicio",
    updated: "Última actualización: 28 de marzo de 2026",
    sections: [
      {heading: "Alcance del servicio", body: "BlueVision ofrece diagnósticos asistidos por IA y recomendaciones. Los resultados son apoyo para decisiones, no sustituyen criterio profesional."},
      {heading: "Responsabilidades de la cuenta", body: "Usted es responsable de sus credenciales, uso legal y veracidad de los datos enviados."},
      {heading: "Uso aceptable", body: "No se permite abusar de la capacidad de la API, eludir controles de seguridad ni usar el servicio con fines ilícitos."},
      {heading: "Disponibilidad del servicio", body: "Podemos actualizar, suspender o modificar partes del servicio por mantenimiento, seguridad u operación."},
      {heading: "Propiedad intelectual", body: "El código, marca y contenido de la plataforma pertenecen a BlueVision y sus licenciantes, salvo indicación contraria."},
      {heading: "Responsabilidad", body: "BlueVision se ofrece tal cual, en la máxima medida permitida por la ley."},
      {heading: "Terminación", body: "Las cuentas pueden ser suspendidas o terminadas por violaciones de políticas o uso ilícito."}
    ]
  },
  hi: {
    title: "सेवा की शर्तें",
    updated: "अंतिम अपडेट: 28 मार्च 2026",
    sections: [
      {heading: "सेवा का दायरा", body: "BlueVision एआई-सहायता प्राप्त फसल निदान और सुझाव प्रदान करता है। यह निर्णय-सहायक है, पेशेवर सलाह का विकल्प नहीं।"},
      {heading: "खाता जिम्मेदारियाँ", body: "आप अपने खाते की सुरक्षा, वैध उपयोग और भेजे गए डेटा की शुद्धता के लिए जिम्मेदार हैं।"},
      {heading: "स्वीकार्य उपयोग", body: "एपीआई का दुरुपयोग, सुरक्षा नियंत्रणों को बायपास करना या अवैध उपयोग प्रतिबंधित है।"},
      {heading: "सेवा उपलब्धता", body: "रखरखाव, सुरक्षा या संचालन कारणों से सेवा के कुछ हिस्से बदले या अस्थायी रूप से रोके जा सकते हैं।"},
      {heading: "बौद्धिक संपदा", body: "प्लेटफ़ॉर्म कोड, ब्रांड और सामग्री BlueVision तथा उसके लाइसेंसधारकों की संपत्ति हैं।"},
      {heading: "दायित्व", body: "कानून द्वारा अनुमत सीमा तक सेवा 'जैसी है' आधार पर प्रदान की जाती है।"},
      {heading: "समापन", body: "नीति उल्लंघन, सुरक्षा जोखिम या अवैध उपयोग पर खाता निलंबित या समाप्त किया जा सकता है।"}
    ]
  },
  zh: {
    title: "服务条款",
    updated: "最后更新：2026年3月28日",
    sections: [
      {heading: "服务范围", body: "BlueVision 提供 AI 辅助的作物诊断与建议。结果仅用于决策支持，不替代专业农学判断。"},
      {heading: "账户责任", body: "您需对账户凭据安全、合法使用及提交数据的准确性负责。"},
      {heading: "可接受使用", body: "禁止滥用 API 能力、绕过安全控制或将服务用于违法/有害活动。"},
      {heading: "服务可用性", body: "出于维护、安全或运营需要，我们可能更新、暂停或调整部分服务。"},
      {heading: "知识产权", body: "除非另有说明，平台代码、品牌与内容归 BlueVision 及其许可方所有。"},
      {heading: "责任限制", body: "在法律允许范围内，BlueVision 按“现状”提供。"},
      {heading: "终止", body: "若发生违规、非法使用或安全风险，账户可能被暂停或终止。"}
    ]
  },
  ar: {
    title: "شروط الخدمة",
    updated: "آخر تحديث: 28 مارس 2026",
    sections: [
      {heading: "نطاق الخدمة", body: "تقدم BlueVision تشخيصاً وتوصيات مدعومة بالذكاء الاصطناعي. المخرجات داعمة للقرار ولا تستبدل الحكم الزراعي المهني."},
      {heading: "مسؤوليات الحساب", body: "أنت مسؤول عن حماية بيانات الدخول والاستخدام القانوني ودقة البيانات المرسلة."},
      {heading: "الاستخدام المقبول", body: "يُحظر إساءة استخدام قدرات الـ API أو تجاوز ضوابط الأمان أو استخدام الخدمة بشكل غير قانوني."},
      {heading: "توفر الخدمة", body: "قد نقوم بتحديث أو تعليق أو تعديل أجزاء من الخدمة لأغراض الصيانة أو الأمان أو التشغيل."},
      {heading: "الملكية الفكرية", body: "تظل الشفرة والعلامة التجارية ومحتوى المنصة ملكاً لـ BlueVision والجهات المرخصة لها ما لم ينص على خلاف ذلك."},
      {heading: "المسؤولية", body: "تُقدَّم BlueVision كما هي ضمن الحدود التي يسمح بها القانون."},
      {heading: "إنهاء الخدمة", body: "قد يتم تعليق أو إنهاء الحساب عند مخالفة السياسات أو الاستخدام غير القانوني أو وجود مخاطر أمنية."}
    ]
  }
};

export default async function TermsPage() {
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
