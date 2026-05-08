"""Service for parsing fish health labels into fish species and health status."""


def parse_fish_label(label: str) -> tuple[str, str]:
    """
    Parse a health label in the format 'FishSpecies___HealthStatus' into components.
    
    Args:
        label: Label string like "NileTilapia___healthy" or "NileTilapia___Streptococcus"
    
    Returns:
        Tuple of (fish_species, health_status)
    """
    if "___" not in label:
        return label, label
    
    parts = label.split("___", 1)
    fish_species = parts[0].replace("_", " ").replace("(", "").replace(")", "")
    health_status = parts[1].replace("_", " ")
    
    return fish_species.strip(), health_status.strip()
