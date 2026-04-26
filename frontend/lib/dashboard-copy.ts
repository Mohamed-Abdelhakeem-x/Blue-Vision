import type {AppLocale} from "@/i18n/routing";

type CopyShape = {
  languageModal: {
    openAria: string;
    title: string;
    closeAria: string;
    current: string;
    names: Record<AppLocale, string>;
  };
  settings: {
    lead: string;
    themeTitle: string;
    themeDescription: string;
    themeHint: string;
    languageTitle: string;
    languageDescription: string;
  };
  sidebar: {
    dashboard: string;
    workspace: string;
    workflow: string;
    navigate: string;
    home: string;
    chat: string;
    community: string;
    notifications: string;
    profile: string;
    history: string;
    settings: string;
    historyTitle: string;
    historyDescription: string;
    logout: string;
  };
  scanHistory: {
    advancedSearch: string;
    hideFilters: string;
    allTime: string;
    domain: string;
    allDomains: string;
    status: string;
    allOutcomes: string;
    healthyOnly: string;
    needsAttention: string;
    minConfidence: string;
    anyConfidence: string;
    startDate: string;
    endDate: string;
    results: string;
    resetFilters: string;
    dismiss: string;
  };
  chatPage: {
    lead: string;
  };
  notifications: {
    lead: string;
    loading: string;
    empty: string;
    markRead: string;
  };
  profile: {
    lead: string;
    loading: string;
    roleLabel: string;
    posts: string;
    joined: string;
    usernamePlaceholder: string;
    farmer: string;
    expert: string;
    saveProfile: string;
    yourPosts: string;
    yourPostsDescription: string;
    noPosts: string;
    plant: string;
    disease: string;
    confidence: string;
    likes: string;
    comments: string;
  };
  community: {
    emptyTitle: string;
    emptyDescription: string;
    newPost: string;
    newPostDescription: string;
    chooseImage: string;
    titlePlaceholder: string;
    problemPlaceholder: string;
    normalizedLive: string;
    normalizedTypingHint: string;
    validationBoth: string;
    suggestionTitle: string;
    plant: string;
    disease: string;
    confidence: string;
    normalizedText: string;
    aiSuggestion: string;
    share: string;
    shareValidation: string;
    feedTitle: string;
    feedDescription: string;
    sortNewest: string;
    sortOldest: string;
    sortTop: string;
    commentsCount: string;
    details: string;
    likes: string;
    textLabel: string;
    manual: string;
    scan: string;
    commentsTitle: string;
    commentsDescription: string;
    noComments: string;
    replyTo: string;
    cancel: string;
    commentPlaceholder: string;
    replyPlaceholder: string;
    commentNormalizedHint: string;
    addComment: string;
    reply: string;
    save: string;
    edit: string;
    delete: string;
    loadMore: string;
    endOfFeed: string;
    signIn: string;
    loadingPostDetails: string;
  };
};

const copy: Record<AppLocale, CopyShape> = {
  en: {
    languageModal: {
      openAria: "Open language selector",
      title: "Select Language",
      closeAria: "Close language selector",
      current: "Current",
      names: {en: "English", zh: "Chinese", hi: "Hindi", es: "Spanish", ar: "Arabic"}
    },
    settings: {
      lead: "Settings",
      themeTitle: "Theme",
      themeDescription: "Switch between light and dark modes for the desktop and mobile dashboards.",
      themeHint: "Toggle your current color theme",
      languageTitle: "Language",
      languageDescription: "Choose the language used across the BlueVision dashboard and aquaculture tools."
    },
    sidebar: {
      dashboard: "Dashboard",
      workspace: "Workspace",
      workflow: "Workflow",
      navigate: "Navigate",
      home: "Home",
      chat: "Chat",
      community: "Community",
      notifications: "Notifications",
      profile: "Profile",
      history: "History",
      settings: "Settings",
      historyTitle: "History",
      historyDescription: "Review prior fish health detections, confidence scores, and treatment actions.",
      logout: "Logout"
    },
    scanHistory: {
      advancedSearch: "Advanced search",
      hideFilters: "Hide filters",
      allTime: "All time",
      domain: "Domain",
      allDomains: "All domains",
      status: "Status",
      allOutcomes: "All outcomes",
      healthyOnly: "Healthy only",
      needsAttention: "Needs attention",
      minConfidence: "Min confidence",
      anyConfidence: "Any confidence",
      startDate: "Start date",
      endDate: "End date",
      results: "results",
      resetFilters: "Reset filters",
      dismiss: "Dismiss notification"
    },
    chatPage: {
      lead: "Advisor Live"
    },
    notifications: {
      lead: "Notifications",
      loading: "Loading notifications...",
      empty: "No notifications yet.",
      markRead: "Mark as read"
    },
    profile: {
      lead: "Profile",
      loading: "Loading profile...",
      roleLabel: "Role",
      posts: "Posts",
      joined: "Joined",
      usernamePlaceholder: "User name",
      farmer: "Farmer",
      expert: "Expert",
      saveProfile: "Save profile",
      yourPosts: "Your Posts",
      yourPostsDescription: "A profile-style list of the posts you published.",
      noPosts: "No posts yet.",
      plant: "Fish",
      disease: "Disease",
      confidence: "Confidence",
      likes: "likes",
      comments: "comments"
    },
    community: {
      emptyTitle: "No posts yet",
      emptyDescription: "Create the first community post or wait for fish scans to appear here.",
      newPost: "New Post",
      newPostDescription: "Give your post a title, write the description, upload an image, and share with the community.",
      chooseImage: "Choose fish image",
      titlePlaceholder: "Write a catchy title...",
      problemPlaceholder: "Write the description here...",
      normalizedLive: "Normalized live",
      normalizedTypingHint: "Text is normalized live while you type.",
      validationBoth: "You need to add both image and problem text first.",
      suggestionTitle: "AI suggestion before share",
      plant: "Fish",
      disease: "Disease",
      confidence: "Confidence",
      normalizedText: "Normalized text",
      aiSuggestion: "AI Suggestion",
      share: "Share",
      shareValidation: "Run AI Suggestion first before sharing the post.",
      feedTitle: "Feed",
      feedDescription: "Fish health cases shared from scans and manual community posts.",
      sortNewest: "Newest",
      sortOldest: "Oldest",
      sortTop: "Top",
      commentsCount: "comments",
      details: "Details",
      likes: "Likes",
      textLabel: "Text",
      manual: "manual",
      scan: "scan",
      commentsTitle: "Comments",
      commentsDescription: "Like, reply, sort, and highlight expert answers.",
      noComments: "No comments yet. Be the first to comment.",
      replyTo: "Replying to",
      cancel: "Cancel",
      commentPlaceholder: "Write a comment...",
      replyPlaceholder: "Reply to {name}...",
      commentNormalizedHint: "Comments are normalized live while you type.",
      addComment: "Add comment",
      reply: "Reply",
      save: "Save",
      edit: "Edit",
      delete: "Delete",
      loadMore: "Load more",
      endOfFeed: "You reached the end of the feed.",
      signIn: "Please sign in to view the community feed.",
      loadingPostDetails: "Loading post details..."
    }
  },
  ar: {
    languageModal: {
      openAria: "افتح اختيار اللغة",
      title: "اختر اللغة",
      closeAria: "أغلق اختيار اللغة",
      current: "اللغة الحالية",
      names: {en: "English", zh: "中文", hi: "हिन्दी", es: "Español", ar: "العربية"}
    },
    settings: {
      lead: "الإعدادات",
      themeTitle: "المظهر",
      themeDescription: "بدّل بين الوضع الفاتح والداكن في الويب والموبايل.",
      themeHint: "غيّر ألوان الواجهة الحالية",
      languageTitle: "اللغة",
      languageDescription: "اختر اللغة المستخدمة في لوحة BlueVision وأدوات الحقل."
    },
    sidebar: {
      dashboard: "لوحة التحكم",
      workspace: "مساحة العمل",
      workflow: "سير العمل",
      navigate: "التنقل",
      home: "الرئيسية",
      chat: "الدردشة",
      community: "المجتمع",
      notifications: "الإشعارات",
      profile: "الملف الشخصي",
      history: "السجل",
      settings: "الإعدادات",
      historyTitle: "السجل",
      historyDescription: "راجع الفحوصات السابقة والثقة والإجراءات بدون مغادرة مساحة العمل.",
      logout: "تسجيل الخروج"
    },
    scanHistory: {
      advancedSearch: "بحث متقدم",
      hideFilters: "إخفاء الفلاتر",
      allTime: "كل الفترات",
      domain: "النطاق",
      allDomains: "كل النطاقات",
      status: "الحالة",
      allOutcomes: "كل النتائج",
      healthyOnly: "السليم فقط",
      needsAttention: "يحتاج متابعة",
      minConfidence: "أقل ثقة",
      anyConfidence: "أي نسبة ثقة",
      startDate: "تاريخ البداية",
      endDate: "تاريخ النهاية",
      results: "نتيجة",
      resetFilters: "إعادة ضبط الفلاتر",
      dismiss: "إغلاق الإشعار"
    },
    chatPage: {
      lead: "المستشار المباشر"
    },
    notifications: {
      lead: "الإشعارات",
      loading: "جاري تحميل الإشعارات...",
      empty: "لا توجد إشعارات بعد.",
      markRead: "تحديد كمقروء"
    },
    profile: {
      lead: "الملف الشخصي",
      loading: "جاري تحميل الملف الشخصي...",
      roleLabel: "الدور",
      posts: "المنشورات",
      joined: "تاريخ الانضمام",
      usernamePlaceholder: "اسم المستخدم",
      farmer: "فلاح",
      expert: "خبير",
      saveProfile: "حفظ الملف الشخصي",
      yourPosts: "منشوراتك",
      yourPostsDescription: "عرض شبيه بالبروفايل لكل المنشورات التي نشرتها.",
      noPosts: "لا توجد منشورات بعد.",
      plant: "النبات",
      disease: "المرض",
      confidence: "الثقة",
      likes: "إعجاب",
      comments: "تعليق"
    },
    community: {
      emptyTitle: "لا توجد منشورات بعد",
      emptyDescription: "أنشئ أول منشور مجتمعي أو انتظر ظهور نتائج الفحص هنا.",
      newPost: "منشور جديد",
      newPostDescription: "أعطِ منشورك عنواناً، واكتب الوصف، وارفع الصورة وشاركها مع المجتمع.",
      chooseImage: "اختر صورة السمكة",
      titlePlaceholder: "اكتب عنواناً جذاباً...",
      problemPlaceholder: "اكتب الوصف هنا...",
      normalizedLive: "النص بعد التنسيق",
      normalizedTypingHint: "يتم تنسيق النص تلقائيًا أثناء الكتابة.",
      validationBoth: "يجب إضافة الصورة والنص أولًا.",
      suggestionTitle: "اقتراح الذكاء الاصطناعي قبل النشر",
      plant: "النبات",
      disease: "المرض",
      confidence: "الثقة",
      normalizedText: "النص بعد التصحيح",
      aiSuggestion: "اقتراح AI",
      share: "نشر",
      shareValidation: "شغّل اقتراح الذكاء الاصطناعي أولًا قبل النشر.",
      feedTitle: "المنشورات",
      feedDescription: "حالات نباتية من الفحوصات والمنشورات اليدوية.",
      sortNewest: "الأحدث",
      sortOldest: "الأقدم",
      sortTop: "الأعلى",
      commentsCount: "تعليق",
      details: "التفاصيل",
      likes: "إعجاب",
      textLabel: "النص",
      manual: "يدوي",
      scan: "فحص",
      commentsTitle: "التعليقات",
      commentsDescription: "إعجاب، ردود، ترتيب، وتمييز ردود الخبراء.",
      noComments: "لا توجد تعليقات بعد. كن أول من يعلق.",
      replyTo: "جارٍ الرد على",
      cancel: "إلغاء",
      commentPlaceholder: "اكتب تعليقًا...",
      replyPlaceholder: "اكتب ردًا على {name}...",
      commentNormalizedHint: "يتم تنسيق التعليقات أثناء الكتابة.",
      addComment: "إضافة تعليق",
      reply: "رد",
      save: "حفظ",
      edit: "تعديل",
      delete: "حذف",
      loadMore: "تحميل المزيد",
      endOfFeed: "وصلت إلى نهاية المنشورات.",
      signIn: "يرجى تسجيل الدخول لعرض المجتمع.",
      loadingPostDetails: "جاري تحميل تفاصيل المنشور..."
    }
  },
  es: {
    languageModal: {
      openAria: "Abrir selector de idioma",
      title: "Seleccionar idioma",
      closeAria: "Cerrar selector de idioma",
      current: "Actual",
      names: {en: "English", zh: "中文", hi: "हिन्दी", es: "Español", ar: "العربية"}
    },
    settings: {
      lead: "Configuración",
      themeTitle: "Tema",
      themeDescription: "Cambia entre modo claro y oscuro en paneles web y móviles.",
      themeHint: "Cambiar el tema actual",
      languageTitle: "Idioma",
      languageDescription: "Elige el idioma usado en el panel de BlueVision y las herramientas de campo."
    },
    sidebar: {
      dashboard: "Panel",
      workspace: "Espacio de trabajo",
      workflow: "Flujo",
      navigate: "Navegar",
      home: "Inicio",
      chat: "Chat",
      community: "Comunidad",
      notifications: "Notificaciones",
      profile: "Perfil",
      history: "Historial",
      settings: "Configuración",
      historyTitle: "Historial",
      historyDescription: "Revisa detecciones previas, confianza e historial de acciones sin salir del flujo.",
      logout: "Cerrar sesión"
    },
    scanHistory: {
      advancedSearch: "Búsqueda avanzada",
      hideFilters: "Ocultar filtros",
      allTime: "Todo el tiempo",
      domain: "Dominio",
      allDomains: "Todos los dominios",
      status: "Estado",
      allOutcomes: "Todos los resultados",
      healthyOnly: "Solo saludables",
      needsAttention: "Necesita atención",
      minConfidence: "Confianza mínima",
      anyConfidence: "Cualquier confianza",
      startDate: "Fecha inicial",
      endDate: "Fecha final",
      results: "resultados",
      resetFilters: "Restablecer filtros",
      dismiss: "Descartar notificación"
    },
    chatPage: {
      lead: "Asesor en vivo"
    },
    notifications: {
      lead: "Notificaciones",
      loading: "Cargando notificaciones...",
      empty: "Aún no hay notificaciones.",
      markRead: "Marcar como leída"
    },
    profile: {
      lead: "Perfil",
      loading: "Cargando perfil...",
      roleLabel: "Rol",
      posts: "Publicaciones",
      joined: "Registro",
      usernamePlaceholder: "Nombre de usuario",
      farmer: "Agricultor",
      expert: "Experto",
      saveProfile: "Guardar perfil",
      yourPosts: "Tus publicaciones",
      yourPostsDescription: "Una lista estilo perfil de las publicaciones que compartiste.",
      noPosts: "Aún no hay publicaciones.",
      plant: "Planta",
      disease: "Enfermedad",
      confidence: "Confianza",
      likes: "me gusta",
      comments: "comentarios"
    },
    community: {
      emptyTitle: "Aún no hay publicaciones",
      emptyDescription: "Crea la primera publicación de la comunidad o espera a que aparezcan escaneos aquí.",
      newPost: "Nueva publicación",
      newPostDescription: "Ponle un título a tu publicación, escribe la descripción, sube una imagen y compártela con la comunidad.",
      chooseImage: "Elegir imagen de pez",
      titlePlaceholder: "Escribe un título atractivo...",
      problemPlaceholder: "Escribe la descripción aquí...",
      normalizedLive: "Texto normalizado",
      normalizedTypingHint: "El texto se normaliza mientras escribes.",
      validationBoth: "Debes agregar la imagen y el texto primero.",
      suggestionTitle: "Sugerencia de IA antes de compartir",
      plant: "Planta",
      disease: "Enfermedad",
      confidence: "Confianza",
      normalizedText: "Texto normalizado",
      aiSuggestion: "Sugerencia IA",
      share: "Compartir",
      shareValidation: "Primero ejecuta la sugerencia de IA antes de publicar.",
      feedTitle: "Feed",
      feedDescription: "Casos de plantas compartidos desde escaneos y publicaciones manuales.",
      sortNewest: "Más reciente",
      sortOldest: "Más antiguo",
      sortTop: "Top",
      commentsCount: "comentarios",
      details: "Detalles",
      likes: "Me gusta",
      textLabel: "Texto",
      manual: "manual",
      scan: "escaneo",
      commentsTitle: "Comentarios",
      commentsDescription: "Dar me gusta, responder, ordenar y destacar respuestas de expertos.",
      noComments: "Aún no hay comentarios. Sé el primero en comentar.",
      replyTo: "Respondiendo a",
      cancel: "Cancelar",
      commentPlaceholder: "Escribe un comentario...",
      replyPlaceholder: "Responder a {name}...",
      commentNormalizedHint: "Los comentarios se normalizan mientras escribes.",
      addComment: "Agregar comentario",
      reply: "Responder",
      save: "Guardar",
      edit: "Editar",
      delete: "Eliminar",
      loadMore: "Cargar más",
      endOfFeed: "Llegaste al final del feed.",
      signIn: "Inicia sesión para ver la comunidad.",
      loadingPostDetails: "Cargando detalles de la publicación..."
    }
  },
  hi: {
    languageModal: {
      openAria: "भाषा चयन खोलें",
      title: "भाषा चुनें",
      closeAria: "भाषा चयन बंद करें",
      current: "वर्तमान",
      names: {en: "English", zh: "中文", hi: "हिन्दी", es: "Español", ar: "العربية"}
    },
    settings: {
      lead: "सेटिंग्स",
      themeTitle: "थीम",
      themeDescription: "वेब और मोबाइल डैशबोर्ड के लिए लाइट और डार्क मोड के बीच बदलें।",
      themeHint: "अपनी वर्तमान थीम बदलें",
      languageTitle: "भाषा",
      languageDescription: "BlueVision डैशबोर्ड और फील्ड टूल्स में उपयोग की जाने वाली भाषा चुनें।"
    },
    sidebar: {
      dashboard: "डैशबोर्ड",
      workspace: "कार्यस्थान",
      workflow: "कार्यप्रवाह",
      navigate: "नेविगेट",
      home: "मुख्य",
      chat: "चैट",
      community: "समुदाय",
      notifications: "सूचनाएं",
      profile: "प्रोफ़ाइल",
      history: "इतिहास",
      settings: "सेटिंग्स",
      historyTitle: "इतिहास",
      historyDescription: "वर्कफ़्लो छोड़े बिना पुराने डिटेक्शन, कॉन्फिडेंस और कार्रवाई इतिहास देखें।",
      logout: "लॉगआउट"
    },
    scanHistory: {
      advancedSearch: "उन्नत खोज",
      hideFilters: "फ़िल्टर छिपाएँ",
      allTime: "सभी समय",
      domain: "डोमेन",
      allDomains: "सभी डोमेन",
      status: "स्थिति",
      allOutcomes: "सभी परिणाम",
      healthyOnly: "केवल स्वस्थ",
      needsAttention: "ध्यान आवश्यक",
      minConfidence: "न्यूनतम विश्वास",
      anyConfidence: "कोई भी विश्वास",
      startDate: "आरंभ तिथि",
      endDate: "समाप्ति तिथि",
      results: "परिणाम",
      resetFilters: "फ़िल्टर रीसेट करें",
      dismiss: "सूचना बंद करें"
    },
    chatPage: {
      lead: "लाइव सलाहकार"
    },
    notifications: {
      lead: "सूचनाएं",
      loading: "सूचनाएं लोड हो रही हैं...",
      empty: "अभी कोई सूचना नहीं है।",
      markRead: "पढ़ा हुआ चिह्नित करें"
    },
    profile: {
      lead: "प्रोफ़ाइल",
      loading: "प्रोफ़ाइल लोड हो रही है...",
      roleLabel: "भूमिका",
      posts: "पोस्ट",
      joined: "शामिल हुए",
      usernamePlaceholder: "यूज़र नाम",
      farmer: "किसान",
      expert: "विशेषज्ञ",
      saveProfile: "प्रोफ़ाइल सहेजें",
      yourPosts: "आपकी पोस्ट",
      yourPostsDescription: "आपके प्रकाशित पोस्ट की प्रोफ़ाइल-शैली सूची।",
      noPosts: "अभी कोई पोस्ट नहीं है।",
      plant: "पौधा",
      disease: "रोग",
      confidence: "विश्वास",
      likes: "लाइक",
      comments: "कमेंट"
    },
    community: {
      emptyTitle: "अभी कोई पोस्ट नहीं है",
      emptyDescription: "पहली कम्युनिटी पोस्ट बनाएं या स्कैन के यहाँ दिखने का इंतज़ार करें।",
      newPost: "नई पोस्ट",
      newPostDescription: "अपनी पोस्ट को एक शीर्षक दें, विवरण लिखें, एक छवि अपलोड करें और समुदाय के साथ साझा करें।",
      chooseImage: "मछली की छवि चुनें",
      titlePlaceholder: "एक आकर्षक शीर्षक लिखें...",
      problemPlaceholder: "यहाँ विवरण लिखें...",
      normalizedLive: "सामान्यीकृत पाठ",
      normalizedTypingHint: "टाइप करते समय पाठ सामान्यीकृत होता है।",
      validationBoth: "पहले छवि और समस्या दोनों जोड़ें।",
      suggestionTitle: "शेयर करने से पहले AI सुझाव",
      plant: "पौधा",
      disease: "रोग",
      confidence: "विश्वास",
      normalizedText: "सामान्यीकृत पाठ",
      aiSuggestion: "AI सुझाव",
      share: "शेयर करें",
      shareValidation: "पोस्ट शेयर करने से पहले AI सुझाव चलाएँ।",
      feedTitle: "फीड",
      feedDescription: "स्कैन और मैनुअल कम्युनिटी पोस्ट से साझा पौधों के केस।",
      sortNewest: "नवीनतम",
      sortOldest: "सबसे पुराना",
      sortTop: "शीर्ष",
      commentsCount: "कमेंट",
      details: "विवरण",
      likes: "लाइक",
      textLabel: "पाठ",
      manual: "मैनुअल",
      scan: "स्कैन",
      commentsTitle: "कमेंट्स",
      commentsDescription: "लाइक करें, जवाब दें, क्रम बदलें और विशेषज्ञ उत्तरों को हाइलाइट करें।",
      noComments: "अभी कोई कमेंट नहीं है। पहला कमेंट करें।",
      replyTo: "उत्तर दिया जा रहा है",
      cancel: "रद्द करें",
      commentPlaceholder: "कमेंट लिखें...",
      replyPlaceholder: "{name} को उत्तर दें...",
      commentNormalizedHint: "टाइप करते समय कमेंट सामान्यीकृत होते हैं।",
      addComment: "कमेंट जोड़ें",
      reply: "उत्तर",
      save: "सहेजें",
      edit: "संपादित करें",
      delete: "हटाएँ",
      loadMore: "और लोड करें",
      endOfFeed: "आप फीड के अंत तक पहुँच गए हैं।",
      signIn: "कम्युनिटी देखने के लिए साइन इन करें।",
      loadingPostDetails: "पोस्ट विवरण लोड हो रहे हैं..."
    }
  },
  zh: {
    languageModal: {
      openAria: "打开语言选择器",
      title: "选择语言",
      closeAria: "关闭语言选择器",
      current: "当前",
      names: {en: "English", zh: "中文", hi: "हिन्दी", es: "Español", ar: "العربية"}
    },
    settings: {
      lead: "设置",
      themeTitle: "主题",
      themeDescription: "在桌面和移动端仪表板之间切换浅色与深色模式。",
      themeHint: "切换当前颜色主题",
      languageTitle: "语言",
      languageDescription: "选择 BlueVision 仪表板和田间工具使用的语言。"
    },
    sidebar: {
      dashboard: "仪表板",
      workspace: "工作区",
      workflow: "工作流",
      navigate: "导航",
      home: "主页",
      chat: "聊天",
      community: "社区",
      notifications: "通知",
      profile: "个人资料",
      history: "历史",
      settings: "设置",
      historyTitle: "历史",
      historyDescription: "无需离开工作流即可查看以往检测、置信度和处理记录。",
      logout: "退出登录"
    },
    scanHistory: {
      advancedSearch: "高级搜索",
      hideFilters: "隐藏筛选",
      allTime: "全部时间",
      domain: "领域",
      allDomains: "全部领域",
      status: "状态",
      allOutcomes: "全部结果",
      healthyOnly: "仅健康",
      needsAttention: "需要关注",
      minConfidence: "最低置信度",
      anyConfidence: "任意置信度",
      startDate: "开始日期",
      endDate: "结束日期",
      results: "条结果",
      resetFilters: "重置筛选",
      dismiss: "关闭通知"
    },
    chatPage: {
      lead: "实时顾问"
    },
    notifications: {
      lead: "通知",
      loading: "正在加载通知...",
      empty: "还没有通知。",
      markRead: "标记为已读"
    },
    profile: {
      lead: "个人资料",
      loading: "正在加载个人资料...",
      roleLabel: "角色",
      posts: "帖子",
      joined: "加入时间",
      usernamePlaceholder: "用户名",
      farmer: "农民",
      expert: "专家",
      saveProfile: "保存资料",
      yourPosts: "你的帖子",
      yourPostsDescription: "以个人主页样式展示你发布的所有帖子。",
      noPosts: "还没有帖子。",
      plant: "植物",
      disease: "病害",
      confidence: "置信度",
      likes: "点赞",
      comments: "评论"
    },
    community: {
      emptyTitle: "还没有帖子",
      emptyDescription: "创建第一条社区帖子，或等待扫描结果显示在这里。",
      newPost: "新帖子",
      newPostDescription: "为你的帖子添加标题，填写描述，上传图片，并与社区分享。",
      chooseImage: "选择鱼类图片",
      titlePlaceholder: "写一个吸引人的标题...",
      problemPlaceholder: "在这里输入描述...",
      normalizedLive: "实时规范化",
      normalizedTypingHint: "输入时会实时规范化文本。",
      validationBoth: "请先添加图片和问题文本。",
      suggestionTitle: "分享前的 AI 建议",
      plant: "植物",
      disease: "病害",
      confidence: "置信度",
      normalizedText: "规范化文本",
      aiSuggestion: "AI 建议",
      share: "分享",
      shareValidation: "请先运行 AI 建议后再发布帖子。",
      feedTitle: "动态",
      feedDescription: "来自扫描和手动社区帖子的植物案例。",
      sortNewest: "最新",
      sortOldest: "最旧",
      sortTop: "热门",
      commentsCount: "评论",
      details: "详情",
      likes: "点赞",
      textLabel: "文本",
      manual: "手动",
      scan: "扫描",
      commentsTitle: "评论",
      commentsDescription: "点赞、回复、排序，并突出显示专家回复。",
      noComments: "还没有评论。成为第一个评论的人。",
      replyTo: "正在回复",
      cancel: "取消",
      commentPlaceholder: "写一条评论...",
      replyPlaceholder: "回复 {name}...",
      commentNormalizedHint: "评论在输入时会实时规范化。",
      addComment: "添加评论",
      reply: "回复",
      save: "保存",
      edit: "编辑",
      delete: "删除",
      loadMore: "加载更多",
      endOfFeed: "你已经到达动态底部。",
      signIn: "请先登录以查看社区。",
      loadingPostDetails: "正在加载帖子详情..."
    }
  }
};

export function getDashboardCopy(locale: AppLocale): CopyShape {
  return copy[locale] ?? copy.en;
}
