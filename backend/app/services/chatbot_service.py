"""LLM-powered bilingual chatbot service for agricultural expert advice."""

import asyncio
import json
import re
import sqlite3
from pathlib import Path
from typing import Any, AsyncGenerator, Literal
import httpx

from app.services.language_utils import detect_language
from app.services.recommendations import recommendation_for_label


class ChatbotService:
    """Bilingual chatbot providing expert agricultural advice."""

    ARABIC_PLANT_ALIASES: dict[str, list[str]] = {
        "Tomato": ["طماطم", "بندورة"],
        "Potato": ["بطاطس", "بطاطا"],
        "Apple": ["تفاح"],
        "Grape": ["عنب"],
        "Corn maize": ["ذرة", "ذره"],
        "Pepper bell": ["فلفل", "فلفل رومي"],
        "Orange": ["برتقال", "موالح"],
        "Strawberry": ["فراولة"],
        "Peach": ["خوخ"],
    }

    ARABIC_DISEASE_HINTS: dict[str, list[str]] = {
        "late blight": ["لفحة متأخرة", "لفحه متاخره", "عفن طماطم", "عفن البطاطس", "عفن متأخر"],
        "early blight": ["لفحة مبكرة", "لفحه مبكره"],
        "leaf mold": ["عفن ورقي", "عفن الأوراق", "عفن الاوراق"],
        "gray mold": ["العفن الرمادي", "عفن رمادي", "العفن الرمادى", "عفن الرمادي", "gray mold", "grey mold", "botrytis"],
        "black rot": ["عفن أسود", "عفن اسود"],
        "powdery mildew": ["بياض دقيقي", "البياض الدقيقي"],
        "bacterial spot": ["بقعة بكتيرية", "بقع بكتيرية", "بقعه بكتيريه"],
        "healthy": ["سليم", "النبات سليم"],
    }
    
    def __init__(
        self,
        model_name: str = "qwen2.5:1.5b",
        glossary_path: str | None = None,
        base_url: str = "http://localhost:11434",
        auto_pull_model: bool = True,
        pull_timeout_seconds: int = 900,
    ):
        """Initialize the chatbot service.
        
        Args:
            model_name: Name of the Ollama model to use (default: qwen2.5:1.5b)
            glossary_path: Path to botanical glossary JSON file
            base_url: Ollama API base URL
        """
        self.model_name = model_name
        self.base_url = base_url
        self.auto_pull_model = auto_pull_model
        self.pull_timeout_seconds = pull_timeout_seconds
        self.glossary = self._load_glossary(glossary_path)
        self.chatbot_knowledge = self._load_chatbot_knowledge()
        self.knowledge = self._build_knowledge_index()
        self.http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=45.0, write=15.0, pool=5.0)
        )
        self._model_ready = False
        self._ensure_lock = asyncio.Lock()

    @staticmethod
    def _normalize_lookup_text(value: str) -> str:
        cleaned = (value or "").strip().lower()
        cleaned = cleaned.replace("___", " ")
        cleaned = re.sub(r"[_(),-]+", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned.strip()

    @classmethod
    def _extract_label_parts(cls, label: str) -> tuple[str, str]:
        raw = (label or "").strip()
        if "___" in raw:
            plant_raw, disease_raw = raw.split("___", 1)
        else:
            plant_raw, disease_raw = "", raw

        plant = re.sub(r"[_(),]+", " ", plant_raw).strip()
        disease = re.sub(r"[_(),]+", " ", disease_raw).strip()
        disease = re.sub(r"\s+", " ", disease).strip(" _")
        plant = re.sub(r"\s+", " ", plant).strip(" _")
        return plant, disease

    def _build_knowledge_index(self) -> dict[str, dict[str, str]]:
        index: dict[str, dict[str, str]] = {}

        for row in self.chatbot_knowledge:
            plant = str(row.get("plant", "Plant"))
            disease = str(row.get("disease", "Unknown disease"))
            entry = {
                "label": str(row.get("id", disease)),
                "plant": plant,
                "plant_ar": str(row.get("plant_ar", plant)),
                "disease": disease,
                "disease_ar": str(row.get("disease_ar", disease)),
                "summary_ar": str(row.get("summary_ar", "")),
                "treatment_ar": "\n".join(str(item) for item in row.get("treatment_ar", [])),
                "prevention_ar": "\n".join(str(item) for item in row.get("prevention_ar", [])),
                "treatment": "\n".join(str(item) for item in row.get("treatment_ar", [])) or recommendation_for_label(disease),
            }
            self._store_entry_variants(index, entry)
            aliases = row.get("aliases", [])
            if isinstance(aliases, list):
                for alias in aliases:
                    key = self._normalize_lookup_text(str(alias))
                    if key:
                        index[key] = entry

        classes_path = Path(__file__).parent.parent / "model" / "classes.json"
        if not classes_path.exists():
            classes_path = Path(__file__).parent.parent.parent / "model" / "classes.json"

        labels: list[str] = []
        if classes_path.exists():
            try:
                labels = json.loads(classes_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                labels = []

        for label in labels:
            plant, disease = self._extract_label_parts(label)
            treatment = recommendation_for_label(label)
            entry = {
                "label": label,
                "plant": plant or "Plant",
                "disease": disease or label,
                "treatment": treatment,
            }
            keys = {
                self._normalize_lookup_text(label),
                self._normalize_lookup_text(disease),
                self._normalize_lookup_text(f"{plant} {disease}"),
            }
            for key in keys:
                if key:
                    index[key] = entry

        for disease_name, data in self.glossary.get("diseases", {}).items():
            key = self._normalize_lookup_text(disease_name)
            existing = index.get(key, {})
            entry = {
                "label": existing.get("label", disease_name),
                "plant": existing.get("plant", "Plant"),
                "disease": disease_name,
                "treatment": existing.get("treatment", recommendation_for_label(disease_name)),
                "description_en": data.get("en_description", ""),
                "description_ar": data.get("ar_description", ""),
                "translation_ar": data.get("ar", ""),
            }
            index[key] = entry
            translation_key = self._normalize_lookup_text(data.get("ar", ""))
            if translation_key:
                index[translation_key] = entry

        self._add_project_database_entries(index)
        self._add_alias_entries(index)

        tomato_mold_entry = index.get(self._normalize_lookup_text("tomato mold"))
        if tomato_mold_entry:
            index[self._normalize_lookup_text("عفن طماطم")] = tomato_mold_entry
            index[self._normalize_lookup_text("عفن في الطماطم")] = tomato_mold_entry

        return index

    def _add_project_database_entries(self, index: dict[str, dict[str, str]]) -> None:
        db_path = Path(__file__).parent.parent.parent / "plantify.db"
        if not db_path.exists():
            return

        try:
            conn = sqlite3.connect(str(db_path))
            conn.row_factory = sqlite3.Row
        except sqlite3.Error:
            return

        try:
            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT disease_type, plant_family, severity_hint, treatment_recommendation
                FROM plant_metadata
                """
            )
            for row in cursor.fetchall():
                label = row["disease_type"]
                plant, disease = self._extract_label_parts(label)
                entry = {
                    "label": label,
                    "plant": plant or row["plant_family"] or "Plant",
                    "disease": disease or label,
                    "treatment": row["treatment_recommendation"] or recommendation_for_label(label),
                    "severity_hint": row["severity_hint"] or "medium",
                }
                self._store_entry_variants(index, entry)

            cursor.execute(
                """
                SELECT disease_type, recommendation
                FROM scan_history
                WHERE recommendation IS NOT NULL
                ORDER BY created_at DESC
                LIMIT 50
                """
            )
            for row in cursor.fetchall():
                recommendation = (row["recommendation"] or "").strip()
                if len(recommendation) < 24:
                    continue
                label = row["disease_type"]
                plant, disease = self._extract_label_parts(label)
                existing = index.get(self._normalize_lookup_text(label), {})
                entry = {
                    "label": label,
                    "plant": existing.get("plant", plant or "Plant"),
                    "disease": existing.get("disease", disease or label),
                    "treatment": recommendation,
                    "severity_hint": existing.get("severity_hint", "medium"),
                    "description_en": existing.get("description_en", ""),
                    "description_ar": existing.get("description_ar", ""),
                    "translation_ar": existing.get("translation_ar", existing.get("disease", disease or label)),
                }
                self._store_entry_variants(index, entry)
        except sqlite3.Error:
            return
        finally:
            conn.close()

    def _store_entry_variants(self, index: dict[str, dict[str, str]], entry: dict[str, str]) -> None:
        label = entry.get("label", "")
        disease = entry.get("disease", "")
        plant = entry.get("plant", "")
        keys = {
            self._normalize_lookup_text(label),
            self._normalize_lookup_text(disease),
            self._normalize_lookup_text(f"{plant} {disease}"),
        }
        translation_ar = entry.get("translation_ar", "")
        if translation_ar:
            keys.add(self._normalize_lookup_text(translation_ar))
        for key in keys:
            if key:
                existing = index.get(key)
                if existing and existing.get("disease_ar"):
                    continue
                index[key] = entry

    def _add_alias_entries(self, index: dict[str, dict[str, str]]) -> None:
        for disease_hint, aliases in self.ARABIC_DISEASE_HINTS.items():
            target = index.get(self._normalize_lookup_text(disease_hint))
            if not target and disease_hint == "gray mold":
                target = index.get(self._normalize_lookup_text("leaf mold"))
            if not target:
                continue
            for alias in aliases:
                key = self._normalize_lookup_text(alias)
                if key:
                    index[key] = target

    @staticmethod
    def _is_fast_path_message(message: str) -> bool:
        normalized = (message or "").strip().lower()
        if not normalized:
            return False
        return normalized in {
            "hello",
            "hi",
            "hey",
            "test",
            "testing",
            "مرحبا",
            "اهلا",
            "أهلا",
            "اختبار",
            "تجربة",
        }

    @staticmethod
    def _fast_path_response(language: Literal["en", "ar"]) -> str:
        if language == "ar":
            return (
                "مرحباً! أنا خبير Plantify الزراعي. "
                "أرسل اسم المرض أو صورة الفحص وسأعطيك خطوات عملية سريعة للعلاج والوقاية."
            )
        return (
            "Hello! I am your Plantify Agri Expert. "
            "Share a disease name or scan result and I will provide concise treatment and prevention steps."
        )

    @staticmethod
    def _small_talk_response(message: str, language: Literal["en", "ar"]) -> str | None:
        normalized = (message or "").strip().lower()
        if not normalized:
            return None

        if normalized in {"thanks", "thank you", "شكرا", "شكراً", "متشكر", "تسلم"}:
            return "العفو، ابعت اسم النبات أو الأعراض وسأساعدك خطوة بخطوة." if language == "ar" else "You are welcome. Send the plant name or symptoms and I will help step by step."
        if normalized in {"how are you", "عامل ايه", "عامل اي", "اخبارك", "كيف حالك"}:
            return "أنا جاهز أساعدك. قل لي اسم النبات أو المشكلة التي ظهرت عندك." if language == "ar" else "I am ready to help. Tell me the plant name or the problem you see."
        if normalized in {"من انت", "مين انت", "who are you"}:
            return "أنا مساعد Plantify الزراعي. أساعدك في فهم أمراض النبات والآفات وخطوات العلاج والوقاية." if language == "ar" else "I am the Plantify agriculture assistant. I help with plant diseases, pests, treatment, and prevention."
        return None

    @staticmethod
    def _fallback_response(language: Literal["en", "ar"]) -> str:
        if language == "ar":
            return (
                "الخدمة بطيئة حالياً أو غير متاحة مؤقتاً. "
                "جرّب بعد قليل، أو اذكر اسم المرض مباشرة لأعطيك إرشادات عامة."
            )
        return (
            "The AI service is currently slow or temporarily unavailable. "
            "Please retry in a moment, or share the disease name for general guidance."
        )

    def _candidate_base_urls(self) -> list[str]:
        candidates = [self.base_url.strip()]
        if "localhost:11434" not in candidates:
            candidates.append("http://localhost:11434")
        if "127.0.0.1:11434" not in candidates:
            candidates.append("http://127.0.0.1:11434")
        return [candidate for candidate in candidates if candidate]

    async def ensure_model_ready(self) -> None:
        """Ensure Ollama is reachable and the configured model is available."""
        if self._model_ready:
            return

        async with self._ensure_lock:
            if self._model_ready:
                return

            tags = await self._list_model_tags()
            if not self._has_model_tag(tags):
                if not self.auto_pull_model:
                    raise RuntimeError(
                        f"Chatbot model '{self.model_name}' is not available and auto-pull is disabled"
                    )
                await self._pull_model()

            self._model_ready = True

    async def _list_model_tags(self) -> list[str]:
        last_error: Exception | None = None
        for candidate in self._candidate_base_urls():
            try:
                response = await self.http_client.get(f"{candidate}/api/tags", timeout=20.0)
                response.raise_for_status()
                payload = response.json()
                models = payload.get("models", [])
                tags: list[str] = []
                for item in models:
                    name = item.get("name") if isinstance(item, dict) else None
                    if isinstance(name, str) and name.strip():
                        tags.append(name.strip())
                self.base_url = candidate
                return tags
            except Exception as exc:  # pragma: no cover - network fallback
                last_error = exc
        if last_error:
            raise last_error
        return []

    def _has_model_tag(self, tags: list[str]) -> bool:
        target = self.model_name.strip()
        if not target:
            return False
        return any(tag == target or tag.startswith(f"{target}:") for tag in tags)

    async def _pull_model(self) -> None:
        last_error: Exception | None = None
        for candidate in self._candidate_base_urls():
            try:
                async with self.http_client.stream(
                    "POST",
                    f"{candidate}/api/pull",
                    json={"name": self.model_name, "stream": True},
                    timeout=self.pull_timeout_seconds,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        error_message = data.get("error")
                        if isinstance(error_message, str) and error_message.strip():
                            raise RuntimeError(f"Failed to pull chatbot model '{self.model_name}': {error_message}")
                self.base_url = candidate
                break
            except Exception as exc:  # pragma: no cover - network fallback
                last_error = exc
        else:
            if last_error:
                raise last_error

        # Confirm availability after pull.
        tags = await self._list_model_tags()
        if not self._has_model_tag(tags):
            raise RuntimeError(f"Chatbot model '{self.model_name}' was pulled but is still unavailable")
    
    def _load_glossary(self, glossary_path: str | None = None) -> dict:
        """Load the botanical glossary."""
        if glossary_path is None:
            glossary_path = Path(__file__).parent.parent / "data" / "botanical_glossary.json"
        
        if Path(glossary_path).exists():
            return json.loads(Path(glossary_path).read_text(encoding="utf-8"))
        return {}

    def _load_chatbot_knowledge(self) -> list[dict[str, Any]]:
        knowledge_path = Path(__file__).parent.parent / "data" / "chatbot_knowledge.json"
        if not knowledge_path.exists():
            return []
        try:
            payload = json.loads(knowledge_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return []
        entries = payload.get("entries", [])
        return entries if isinstance(entries, list) else []
    
    def _build_system_prompt(self, language: Literal["en", "ar"]) -> str:
        """Build system prompt for the specified language."""
        if language == "ar":
            return """أنت خبير زراعي متخصص يساعد المزارعين والعاملين في الزراعة على فهم وعلاج أمراض النبات.

مهامك:
- توفير معلومات دقيقة وموثوقة عن أمراض النبات والآفات الزراعية
- شرح أسباب الأمراض وطرق الوقاية والعلاج
- تقديم نصائح عملية لتحسين صحة المحصول
- الاستجابة بوضوح وسهولة مع تجنب التعقيد غير الضروري
- استخدام المصطلحات الزراعية الصحيحة بالعربية

تجنب:
- المعلومات غير الدقيقة أو المضللة
- التوصيات الضارة أو الخطرة
- الخروج عن موضوع الزراعة

أجب بالعربية دائماً."""
        
        else:  # English
            return """You are an expert agronomist helping farmers and agricultural workers understand and treat plant diseases.

Your roles:
- Provide accurate and reliable information about plant diseases and agricultural pests
- Explain disease causes, prevention methods, and treatment options
- Offer practical advice for improving crop health
- Respond clearly and simply, avoiding unnecessary complexity
- Use proper botanical and agricultural terminology

Avoid:
- Inaccurate or misleading information
- Harmful or dangerous recommendations
- Straying from agricultural topics

Always respond in English."""
    
    def _add_context(self, query: str, language: Literal["en", "ar"]) -> str:
        """Add botanical context to the query."""
        context = ""
        
        # Add glossary context if available
        if self.glossary:
            glossary_str = json.dumps(self.glossary, ensure_ascii=False, indent=2)
            context += f"\n\nBotanical Reference:\n{glossary_str}"
        
        return f"{context}\n\nUser Question: {query}"

    def _find_knowledge_entry(self, message: str, scan_context: dict[str, Any] | None = None) -> dict[str, str] | None:
        candidates: list[str] = []
        if scan_context:
            for key in ("disease_name", "disease", "disease_type", "plant_name"):
                value = scan_context.get(key)
                if isinstance(value, str) and value.strip():
                    candidates.append(value)
            plant_name = scan_context.get("plant_name")
            disease_name = scan_context.get("disease_name") or scan_context.get("disease") or scan_context.get("disease_type")
            if isinstance(plant_name, str) and isinstance(disease_name, str):
                candidates.append(f"{plant_name} {disease_name}")

        candidates.append(message)

        normalized_message = self._normalize_lookup_text(message)
        for key, entry in self.knowledge.items():
            if key and key in normalized_message:
                return entry

        for candidate in candidates:
            normalized = self._normalize_lookup_text(candidate)
            if not normalized:
                continue
            if normalized in self.knowledge:
                return self.knowledge[normalized]
        heuristic = self._heuristic_entry_for_message(message)
        if heuristic:
            return heuristic
        return None

    def _heuristic_entry_for_message(self, message: str) -> dict[str, str] | None:
        normalized = self._normalize_lookup_text(message)
        if not normalized:
            return None

        mentions_tomato = any(alias in normalized for alias in self.ARABIC_PLANT_ALIASES["Tomato"]) or "tomato" in normalized
        mentions_potato = any(alias in normalized for alias in self.ARABIC_PLANT_ALIASES["Potato"]) or "potato" in normalized
        mentions_rot = any(token in normalized for token in ["عفن", "تعفن", "rot", "mold"])
        mentions_blight = any(token in normalized for token in ["لفحة", "لفحه", "blight"])
        mentions_spots = any(token in normalized for token in ["بقع", "بقعة", "بقعه", "spots", "spot"])

        if mentions_tomato and mentions_rot and not mentions_blight:
            return self.knowledge.get(self._normalize_lookup_text("tomato mold")) or self.knowledge.get(self._normalize_lookup_text("عفن طماطم"))

        if mentions_tomato and mentions_blight:
            return self.knowledge.get(self._normalize_lookup_text("late blight")) or self.knowledge.get(self._normalize_lookup_text("early blight"))

        if mentions_potato and (mentions_rot or mentions_blight):
            return self.knowledge.get(self._normalize_lookup_text("late blight"))

        if mentions_tomato and mentions_spots:
            return self.knowledge.get(self._normalize_lookup_text("bacterial spot")) or self.knowledge.get(self._normalize_lookup_text("early blight"))

        return None

    def _general_guidance_response(self, language: Literal["en", "ar"], message: str) -> str | None:
        normalized = self._normalize_lookup_text(message)
        if not normalized:
            return None

        asks_for_help = any(token in normalized for token in [
            "حل", "مشكله", "مشكلة", "علاج", "اعمل ايه", "ايه الحل", "what", "help", "treat", "treatment", "solution"
        ])
        if not asks_for_help:
            if any(token in normalized for token in ["اصفرار", "أصفر", "اصفر", "yellow", "ذبول", "ذابل", "wilt", "عفن", "بقع", "spots"]):
                asks_for_help = True
            else:
                return None

        has_mold = any(token in normalized for token in ["عفن", "mold", "rot"])
        has_gray = any(token in normalized for token in ["رمادي", "رمادى", "gray", "grey"])
        has_blight = any(token in normalized for token in ["لفحة", "لفحه", "blight"])
        has_spots = any(token in normalized for token in ["بقعة", "بقعه", "بقع", "spot", "spots"])

        if language == "ar":
            if has_mold and has_gray:
                return "\n".join([
                    "التشخيص الأقرب: عفن رمادي أو إصابة فطرية قريبة منه.",
                    "الخطة المقترحة:",
                    "فورًا: اعزل الأجزاء المصابة، وأزل الأوراق أو الثمار التي عليها عفن واضح، وعقّم المقص أو الأدوات بعد كل استخدام.",
                    "خلال 7 أيام: قلل الرطوبة حول النبات، امنع بلل الأوراق لوقت طويل، حسّن التهوية، واستخدم مبيدًا فطريًا مسجلًا للمحصول إذا كان مسموحًا في الإرشاد المحلي.",
                    "المتابعة: راقب النمو الجديد يوميًا، وإذا استمر انتشار العفن أو ظهر زغب رمادي جديد فالحالة تحتاج تدخل أسرع.",
                    "إذا أرسلت اسم النبات أو صورة أوضح، أقدر أحدد لك العلاج الأقرب من بيانات المشروع."
                ])
            if has_blight:
                return "\n".join([
                    "التشخيص الأقرب: لفحة أو إصابة فطرية على الأوراق.",
                    "الخطة المقترحة:",
                    "فورًا: أزل الأوراق المصابة بشدة وتجنب رش الماء على المجموع الخضري.",
                    "خلال 7 أيام: اسقِ من أسفل، حسّن التهوية، وطبّق مبيدًا مناسبًا للمحصول إذا كانت الإصابة مستمرة.",
                    "المتابعة: راقب هل البقع تصعد إلى الأوراق الجديدة أو الساق.",
                    "إذا كتبت اسم النبات أو أرسلت صورة، سأعطيك علاجًا أدق."
                ])
            if has_spots:
                return "\n".join([
                    "التشخيص الأقرب: بقع مرضية على الأوراق وقد تكون فطرية أو بكتيرية.",
                    "الخطة المقترحة:",
                    "فورًا: أزل الأوراق الأكثر إصابة وتجنب لمس النباتات وهي مبللة.",
                    "خلال 7 أيام: خفف الرطوبة، حسّن التهوية، وراجع مبيدًا مناسبًا حسب نوع المحصول.",
                    "المتابعة: راقب شكل البقع الجديدة وهل تتسع بسرعة.",
                    "إذا ذكرت اسم النبات، أستطيع تضييق الاحتمالات من داتا المشروع."
                ])
            return "\n".join([
                "أقدر أساعدك، لكن الاسم الحالي غير كافٍ لتشخيص دقيق.",
                "اكتب اسم النبات والأعراض الأساسية مثل: عفن، بقع، اصفرار، ذبول، أو أرسل صورة.",
                "وسأرد عليك بخطوات علاج أوضح من بيانات المشروع."
            ])

        if has_mold and has_gray:
            return "\n".join([
                "Closest diagnosis: gray mold or a similar fungal infection.",
                "Recommended plan:",
                "Immediate: isolate affected tissue, remove visibly infected leaves or fruit, and disinfect tools after each cut.",
                "Next 7 days: reduce humidity, avoid prolonged leaf wetness, improve airflow, and use a crop-labeled fungicide if local guidance allows it.",
                "Monitor: check new growth daily and escalate if fresh gray fuzzy growth appears.",
                "Send the plant name or a photo and I can narrow it down using the project data."
            ])
        return None

    def _knowledge_response(self, language: Literal["en", "ar"], message: str, scan_context: dict[str, Any] | None = None) -> str | None:
        entry = self._find_knowledge_entry(message, scan_context)
        if not entry:
            return None

        plant_name = scan_context.get("plant_name") if isinstance(scan_context, dict) else None
        plant_name = plant_name if isinstance(plant_name, str) and plant_name.strip() else entry.get("plant", "Plant")
        disease_name = entry.get("disease", "Unknown disease")
        confidence = scan_context.get("confidence") if isinstance(scan_context, dict) else None
        confidence_text = ""
        if isinstance(confidence, (int, float)):
            confidence_text = f"{float(confidence) * 100:.1f}%"

        treatment = entry.get("treatment", recommendation_for_label(disease_name))
        description_en = entry.get("description_en", "")
        description_ar = entry.get("description_ar", "")
        translation_ar = entry.get("translation_ar", disease_name)

        if language == "ar":
            lines = [
                f"النبات: {plant_name}",
                f"التشخيص الأقرب: {translation_ar or disease_name}",
            ]
            if confidence_text:
                lines.append(f"نسبة الثقة: {confidence_text}")
            if description_ar:
                lines.append(f"الوصف: {description_ar}")
            lines.extend([
                "الخطة المقترحة:",
                treatment,
                "لو تريد، ابعت صورة أو اكتب الأعراض بالتفصيل وسأعطيك خطوات أدق."
            ])
            return "\n".join(lines)

        lines = [
            f"Plant: {plant_name}",
            f"Likely diagnosis: {disease_name}",
        ]
        if confidence_text:
            lines.append(f"Confidence: {confidence_text}")
        if description_en:
            lines.append(f"Description: {description_en}")
        lines.extend([
            "Recommended plan:",
            treatment,
            "If you want, send a photo or describe the symptoms and I can narrow it down further."
        ])
        return "\n".join(lines)
    
    def _knowledge_response(self, language: Literal["en", "ar"], message: str, scan_context: dict[str, Any] | None = None) -> str | None:
        entry = self._find_knowledge_entry(message, scan_context)
        if not entry:
            return None

        plant_name = scan_context.get("plant_name") if isinstance(scan_context, dict) else None
        plant_name = plant_name if isinstance(plant_name, str) and plant_name.strip() else entry.get("plant", "Plant")
        disease_name = entry.get("disease", "Unknown disease")
        confidence = scan_context.get("confidence") if isinstance(scan_context, dict) else None
        confidence_text = ""
        if isinstance(confidence, (int, float)):
            confidence_text = f"{float(confidence) * 100:.1f}%"

        treatment = entry.get("treatment", recommendation_for_label(disease_name))
        description_en = entry.get("description_en", "")
        description_ar = entry.get("description_ar", "")
        translation_ar = entry.get("disease_ar") or entry.get("translation_ar", disease_name)
        plant_name_ar = entry.get("plant_ar", plant_name)
        summary_ar = entry.get("summary_ar", "")
        treatment_ar = entry.get("treatment_ar", "")
        prevention_ar = entry.get("prevention_ar", "")

        if language == "ar":
            lines = [
                f"النبات: {plant_name_ar or plant_name}",
                f"التشخيص الأقرب: {translation_ar or disease_name}",
            ]
            if confidence_text:
                lines.append(f"نسبة الثقة: {confidence_text}")
            if summary_ar:
                lines.append(f"الوصف: {summary_ar}")
            elif description_ar:
                lines.append(f"الوصف: {description_ar}")
            lines.extend([
                "الخطة المقترحة:",
                treatment_ar or treatment,
            ])
            if prevention_ar:
                lines.extend([
                    "الوقاية:",
                    prevention_ar,
                ])
            lines.append("لو تريد، ابعت صورة أو اكتب الأعراض بالتفصيل وسأعطيك خطوات أدق.")
            return "\n".join(lines)

        lines = [
            f"Plant: {plant_name}",
            f"Likely diagnosis: {disease_name}",
        ]
        if confidence_text:
            lines.append(f"Confidence: {confidence_text}")
        if description_en:
            lines.append(f"Description: {description_en}")
        lines.extend([
            "Recommended plan:",
            treatment,
            "If you want, send a photo or describe the symptoms and I can narrow it down further."
        ])
        return "\n".join(lines)

    async def chat_stream(
        self,
        message: str,
        scan_context: dict | None = None,
        conversation_history: list[dict] | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a chatbot response in the user's language.
        
        Args:
            message: User message
            scan_context: Optional recent scan data (disease_name, confidence, etc.)
            conversation_history: Previous messages for context
            
        Yields:
            Streamed response chunks
        """
        # Detect user language
        language = detect_language(message)

        small_talk = self._small_talk_response(message, language)
        if small_talk:
            yield small_talk
            return

        if self._is_fast_path_message(message):
            yield self._fast_path_response(language)
            return

        knowledge_response = self._knowledge_response(language, message, scan_context)
        if knowledge_response:
            yield knowledge_response
            return

        general_response = self._general_guidance_response(language, message)
        if general_response:
            yield general_response
            return

        try:
            await self.ensure_model_ready()
        except Exception:
            fallback = self._knowledge_response(language, message, scan_context)
            yield fallback or self._general_guidance_response(language, message) or self._fallback_response(language)
            return
        
        # Build context-aware query
        enhanced_query = message
        if scan_context:
            disease = scan_context.get("disease_name", "")
            confidence = scan_context.get("confidence", 0)
            if language == "ar":
                enhanced_query += f"\n\n[السياق الأخير: مرض '{disease}' بدرجة ثقة {confidence:.1%}]"
            else:
                enhanced_query += f"\n\n[Recent context: disease '{disease}' with {confidence:.1%} confidence]"
        
        # Build system prompt
        system_prompt = self._build_system_prompt(language)
        
        # Prepare messages for Ollama with a short rolling conversation window.
        messages = [{"role": "system", "content": system_prompt}]
        if conversation_history:
            for item in conversation_history[-8:]:
                if not isinstance(item, dict):
                    continue
                role = str(item.get("role", "")).strip().lower()
                content = str(item.get("content", "")).strip()
                if role not in {"user", "assistant"} or not content:
                    continue
                messages.append({"role": role, "content": content[:2000]})
        messages.append({"role": "user", "content": enhanced_query})
        
        # Stream the response from Ollama
        try:
            streamed = False
            for candidate in self._candidate_base_urls():
                try:
                    async with self.http_client.stream(
                        "POST",
                        f"{candidate}/api/chat",
                        json={
                            "model": self.model_name,
                            "messages": messages,
                            "stream": True,
                            "options": {
                                "temperature": 0.4,
                                "num_predict": 180,
                            },
                        },
                    ) as response:
                        response.raise_for_status()
                        self.base_url = candidate
                        async for line in response.aiter_lines():
                            if line and line.startswith('{"'):
                                try:
                                    data = json.loads(line)
                                    if "message" in data and "content" in data["message"]:
                                        chunk = data["message"]["content"]
                                        if chunk:
                                            yield chunk
                                            streamed = True
                                except json.JSONDecodeError:
                                    continue
                    if streamed:
                        return
                except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPError):
                    continue

            fallback = self._knowledge_response(language, message, scan_context)
            if fallback:
                yield fallback
                return
            general_response = self._general_guidance_response(language, message)
            if general_response:
                yield general_response
                return

        except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPError):
            fallback = self._knowledge_response(language, message, scan_context)
            yield fallback or self._general_guidance_response(language, message) or self._fallback_response(language)
        except Exception:
            fallback = self._knowledge_response(language, message, scan_context)
            yield fallback or self._general_guidance_response(language, message) or self._fallback_response(language)
    
    async def chat(
        self,
        message: str,
        scan_context: dict | None = None,
        conversation_history: list[dict] | None = None,
    ) -> str:
        """Get a complete chatbot response (non-streaming).
        
        Args:
            message: User message
            scan_context: Optional recent scan data
            
        Returns:
            Complete response
        """
        response = ""
        async for chunk in self.chat_stream(message, scan_context, conversation_history):
            response += chunk
        return response
    
    def get_glossary_term(
        self,
        term: str,
        language: Literal["en", "ar"] = "en"
    ) -> dict | None:
        """Look up a botanical term in the glossary.
        
        Args:
            term: Term to look up
            language: Language for response
            
        Returns:
            Term information or None if not found
        """
        if not self.glossary:
            return None
        
        # Search diseases
        for disease, data in self.glossary.get("diseases", {}).items():
            if disease.lower() == term.lower():
                if language == "ar":
                    return {
                        "term": disease,
                        "translation": data.get("ar", ""),
                        "description": data.get("ar_description", "")
                    }
                else:
                    return {
                        "term": disease,
                        "translation": data.get("ar", ""),
                        "description": data.get("en_description", "")
                    }
        
        # Search agronomic terms
        for term_name, data in self.glossary.get("agronomic_terms", {}).items():
            if term_name.lower() == term.lower():
                if language == "ar":
                    return {
                        "term": term_name,
                        "translation": data.get("ar", ""),
                        "description": data.get("description", "")
                    }
                else:
                    return {
                        "term": term_name,
                        "translation": data.get("ar", ""),
                        "description": data.get("description", "")
                    }
        
        return None
