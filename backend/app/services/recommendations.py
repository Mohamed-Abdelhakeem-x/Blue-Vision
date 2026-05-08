DEFAULT_RECOMMENDATION = "\n".join([
    "Immediate: Isolate affected fish if possible and check key water quality parameters (ammonia, nitrite, pH, temperature, and dissolved oxygen).",
    "Next 7 days: Monitor feeding behavior and mortality rates closely. Avoid overfeeding to prevent further water quality degradation.",
    "Monitor: Consult with an aquaculture veterinarian if mortality increases or symptoms spread to other ponds.",
])

LABEL_ALIASES: dict[str, tuple[str, ...]] = {
    "healthy": ("healthy", "normal"),
    "streptococcus": ("streptococcus", "strep", "streptococcosis"),
    "aeromonas": ("aeromonas", "motile_aeromonas_septicemia", "mas"),
    "columnaris": ("columnaris", "cotton_wool_disease"),
    "tilapia_lake_virus": ("tilapia_lake_virus", "tilv"),
}

TREATMENT_MAP: dict[str, str] = {
    "healthy": "\n".join([
        "Immediate: Fish appear healthy with no dominant disease signals.",
        "Next 7 days: Maintain standard feeding protocols and regular water quality testing.",
        "Monitor: Keep observing for any sudden changes in swimming behavior or appetite.",
    ]),
    "streptococcus": "\n".join([
        "Immediate: Reduce feeding and lower water temperature if possible to slow bacterial growth.",
        "Next 7 days: Apply vet-prescribed antibiotics through medicated feed if mortality is rising.",
        "Monitor: Watch for exophthalmia (pop-eye) and erratic swimming (spinning). Remove dead fish immediately.",
    ]),
    "aeromonas": "\n".join([
        "Immediate: Check for high organic loads and reduce stocking density stress. Aeromonas is often secondary to poor water quality.",
        "Next 7 days: Improve water exchange and aeration. Apply approved antibacterial treatments if lesions are severe.",
        "Monitor: Look for hemorrhagic septicemia (red sores) and ulcerations on the skin.",
    ]),
    "columnaris": "\n".join([
        "Immediate: Improve water quality and reduce temperature/handling stress.",
        "Next 7 days: Treat with approved bath treatments (like potassium permanganate or salt) per veterinary guidance.",
        "Monitor: Check gills and skin for yellowish-brown necrotic patches or 'cotton-wool' like growths.",
    ]),
    "tilapia_lake_virus": "\n".join([
        "Immediate: Implement strict biosecurity measures. Do not move fish or equipment between ponds.",
        "Next 7 days: There is no specific treatment for TiLV. Focus on supportive care and reducing stress. Isolate the pond.",
        "Monitor: Watch for lethargy, skin erosions, and high mortality rates.",
    ]),
}


def recommendation_for_label(label: str) -> str:
    normalized = (
        label.lower()
        .replace("___", "_")
        .replace("-", "_")
        .replace(" ", "_")
        .replace("(", "")
        .replace(")", "")
    )

    if "healthy" in normalized:
        return TREATMENT_MAP["healthy"]

    for canonical_key, aliases in LABEL_ALIASES.items():
        if canonical_key == "healthy":
            continue
        if any(alias in normalized for alias in aliases):
            return TREATMENT_MAP[canonical_key]

    return DEFAULT_RECOMMENDATION
