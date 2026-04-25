function collapseSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function detectArabic(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}

export function normalizeUserText(text: string, field: "body" | "plant_name" = "body") {
  let value = (text ?? "").normalize("NFKC");
  value = value.replace(/_/g, " ").replace(/،/g, ", ").replace(/؛/g, "; ").replace(/\?/g, "? ").replace(/؟/g, "؟ ");
  value = collapseSpaces(value);

  if (!value) {
    return "";
  }

  if (detectArabic(value)) {
    value = value
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/ـ/g, "");
    return collapseSpaces(value);
  }

  value = value.replace(/\s*([,;:.!?])\s*/g, "$1 ");
  value = collapseSpaces(value);

  if (field === "plant_name") {
    return value.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}
