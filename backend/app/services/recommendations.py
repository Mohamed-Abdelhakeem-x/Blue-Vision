DEFAULT_RECOMMENDATION = "\n".join([
    "Immediate: isolate the affected plant or row, remove heavily damaged leaves, and disinfect tools after handling.",
    "Next 7 days: reduce plant wetness, improve airflow, and use a plant-approved treatment selected from your local extension guidance.",
    "Monitor: re-check new growth every 48 to 72 hours and escalate if lesions continue to expand.",
])

LABEL_ALIASES: dict[str, tuple[str, ...]] = {
    "healthy": ("healthy",),
    "apple_scab": ("apple_scab", "apple___apple_scab"),
    "cedar_apple_rust": ("cedar_apple_rust", "cedarapple_rust"),
    "black_rot": ("black_rot", "blackrot"),
    "powdery_mildew": ("powdery_mildew", "powderymildew"),
    "early_blight": ("early_blight", "earlyblight"),
    "late_blight": ("late_blight", "lateblight"),
    "leaf_blight": ("leaf_blight", "leafblight"),
    "leaf_scorch": ("leaf_scorch", "leafscorch"),
    "leaf_mold": ("leaf_mold", "leafmold", "black_leaf_mold", "cercospora_leaf_mold"),
    "septoria_leaf_spot": ("septoria_leaf_spot", "septorialeafspot", "septoria"),
    "target_spot": ("target_spot", "targetspot"),
    "bacterial_spot": ("bacterial_spot", "bacterialspot"),
    "mosaic_virus": ("mosaic_virus", "tomato_mosaic_virus", "tomatomosaicvirus"),
    "yellow_leaf_curl_virus": (
        "yellow_leaf_curl_virus",
        "tomato_yellow_leaf_curl_virus",
        "yellowleafcurlvirus",
        "leafcurlvirus",
    ),
    "spider_mites": (
        "spider_mites",
        "spidermites",
        "two_spotted_spider_mite",
        "twospotted_spider_mite",
    ),
    "haunglongbing": ("haunglongbing", "huanglongbing", "citrus_greening"),
    "common_rust": ("common_rust", "commonrust"),
    "northern_leaf_blight": ("northern_leaf_blight", "northernleafblight"),
    "cercospora_leaf_spot": ("cercospora_leaf_spot", "gray_leaf_spot", "grayleafspot"),
    "esca": ("esca",),
}

TREATMENT_MAP: dict[str, str] = {
    "healthy": "\n".join([
        "Immediate: no disease signal is dominant; keep the plant in production and avoid unnecessary chemical treatment.",
        "Next 7 days: maintain even irrigation, good airflow, and balanced nutrition to avoid stress-related outbreaks.",
        "Monitor: inspect new leaves weekly for spotting, yellowing, mildew, or insect feeding.",
    ]),
    "apple_scab": "\n".join([
        "Immediate: remove fallen leaves and heavily infected foliage because apple scab overwinters in debris.",
        "Next 7 days: prune dense interior growth and apply a labeled protectant fungicide before or during wet periods.",
        "Monitor: watch fresh leaves and fruit for new olive-brown lesions after rainfall events.",
    ]),
    "cedar_apple_rust": "\n".join([
        "Immediate: remove badly infected leaves when feasible and reduce nearby alternate host pressure such as juniper galls.",
        "Next 7 days: protect new apple growth with a locally approved rust fungicide during active wet weather.",
        "Monitor: look for bright orange lesions and renewed spore activity after rain.",
    ]),
    "black_rot": "\n".join([
        "Immediate: prune infected shoots, fruit, and leaves well below visible symptoms and sanitize tools between cuts.",
        "Next 7 days: improve canopy ventilation and maintain a preventive fungicide program if weather remains humid.",
        "Monitor: inspect clusters and foliage twice weekly for expanding dark lesions or mummified fruit.",
    ]),
    "powdery_mildew": "\n".join([
        "Immediate: remove the most infected leaves and reduce shaded, stagnant canopy zones.",
        "Next 7 days: avoid excess nitrogen, avoid overhead irrigation, and apply sulfur or potassium bicarbonate where label-approved.",
        "Monitor: check new shoots for white powdery growth because fresh tissue is most vulnerable.",
    ]),
    "early_blight": "\n".join([
        "Immediate: remove the lowest infected leaves to limit spore splash from soil onto healthy tissue.",
        "Next 7 days: mulch exposed soil, water at the base, and begin or tighten a labeled protectant fungicide schedule.",
        "Monitor: track concentric ring lesions on older leaves and any upward movement through the canopy.",
    ]),
    "late_blight": "\n".join([
        "Immediate: isolate affected plant quickly and remove aggressively infected tissue because late blight can spread fast in cool, wet conditions.",
        "Next 7 days: avoid overhead watering and apply a late-blight-labeled fungicide immediately if local guidance recommends it.",
        "Monitor: inspect surrounding plant daily for water-soaked lesions, stem infections, and rapid canopy collapse.",
    ]),
    "leaf_blight": "\n".join([
        "Immediate: remove heavily blighted leaves and clear infected residue from the growing area.",
        "Next 7 days: improve airflow, keep foliage dry, and use a plant-labeled fungicide if disease pressure remains active.",
        "Monitor: check whether lesions are coalescing and reducing photosynthetic area on new leaves.",
    ]),
    "leaf_scorch": "\n".join([
        "Immediate: remove badly scorched leaves only if they are no longer supporting the plant and correct visible water stress.",
        "Next 7 days: stabilize irrigation and review salinity, heat exposure, and root-zone stress.",
        "Monitor: follow plant edge necrosis on new growth to distinguish stress from infectious spread.",
    ]),
    "leaf_mold": "\n".join([
        "Immediate: remove infected tomato leaves and lower humidity around the plant canopy.",
        "Next 7 days: improve greenhouse or field airflow and apply a tomato-labeled fungicide if humidity remains high.",
        "Monitor: watch the undersides of leaves for olive-brown mold and new chlorotic patches.",
    ]),
    "septoria_leaf_spot": "\n".join([
        "Immediate: prune infected lower tomato leaves and discard debris away from the plant.",
        "Next 7 days: keep irrigation off foliage, mulch bare soil, and maintain a preventive fungicide interval if needed.",
        "Monitor: check for small circular lesions with dark borders moving upward through the canopy.",
    ]),
    "target_spot": "\n".join([
        "Immediate: remove the most affected leaves and reduce canopy wetness.",
        "Next 7 days: strengthen airflow and use a labeled fungicide program suited to tomato target spot pressure.",
        "Monitor: watch for enlarging target-like lesions on leaves and fruit shoulders.",
    ]),
    "bacterial_spot": "\n".join([
        "Immediate: remove the worst infected tissue and avoid handling plant while foliage is wet.",
        "Next 7 days: reduce splash, sanitize tools, and apply copper-based bactericide only where local label guidance supports it.",
        "Monitor: inspect new leaves and fruit for greasy dark lesions and secondary spread after storms.",
    ]),
    "mosaic_virus": "\n".join([
        "Immediate: rogue severely affected plant because viral infections do not recover and can spread mechanically.",
        "Next 7 days: sanitize hands, stakes, and tools frequently and control insect vectors where relevant.",
        "Monitor: watch nearby plant for mottling, distortion, and stunting on new growth.",
    ]),
    "yellow_leaf_curl_virus": "\n".join([
        "Immediate: remove the most affected tomato plant if infection is widespread and suppress whitefly pressure immediately.",
        "Next 7 days: deploy vector control, reflective mulch where practical, and protect healthy plant from reinfestation.",
        "Monitor: check upper leaves for curling, chlorosis, and reduced vigor across adjacent rows.",
    ]),
    "spider_mites": "\n".join([
        "Immediate: isolate hot spots and wash plant undersides if infestation is still light.",
        "Next 7 days: raise humidity where plant-safe, reduce dust stress, and use a labeled miticide or biological control strategy.",
        "Monitor: inspect underside webbing and stippling every 2 to 3 days until pressure drops.",
    ]),
    "haunglongbing": "\n".join([
        "Immediate: flag the citrus tree for expert follow-up because HLB is systemic and high-risk.",
        "Next 7 days: remove confirmed trees according to local agricultural authority guidance and intensify psyllid control.",
        "Monitor: inspect neighboring citrus for blotchy mottle, lopsided fruit, and canopy thinning.",
    ]),
    "common_rust": "\n".join([
        "Immediate: keep the plant under observation; many corn rust infections are manageable when pressure is low.",
        "Next 7 days: protect upper canopy leaves with a labeled fungicide only if disease is moving upward and growth stage justifies treatment.",
        "Monitor: follow pustule density on the ear plant and leaves above it.",
    ]),
    "northern_leaf_blight": "\n".join([
        "Immediate: note affected fields and prioritize scouting in humid blocks with dense canopies.",
        "Next 7 days: apply a labeled corn fungicide if lesions are advancing toward the upper canopy before grain fill.",
        "Monitor: watch for long cigar-shaped lesions and rapid spread after dew-heavy mornings.",
    ]),
    "cercospora_leaf_spot": "\n".join([
        "Immediate: remove or mark heavily affected leaves and reduce prolonged plant wetness where possible.",
        "Next 7 days: strengthen airflow and apply a plant-labeled fungicide if new lesions continue to appear.",
        "Monitor: track lesion density and any gray-center spotting on recent growth.",
    ]),
    "esca": "\n".join([
        "Immediate: mark symptomatic vines and avoid spreading infected pruning debris within the block.",
        "Next 7 days: prune during dry conditions, disinfect tools, and review trunk disease management practices.",
        "Monitor: watch for tiger-striping, cane dieback, and recurring vine decline.",
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
