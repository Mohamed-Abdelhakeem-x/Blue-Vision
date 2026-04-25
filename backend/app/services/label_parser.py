"""Service for parsing plant disease labels into plant name and disease type."""


def parse_disease_label(label: str) -> tuple[str, str]:
    """
    Parse a disease label in the format 'PlantName___DiseaseType' into components.
    
    Args:
        label: Label string like "Apple___healthy" or "Tomato___Late_blight"
    
    Returns:
        Tuple of (plant_name, disease_type)
    """
    if "___" not in label:
        return label, label
    
    parts = label.split("___", 1)
    plant_name = parts[0].replace("_", " ").replace("(", "").replace(")", "")
    disease_type = parts[1].replace("_", " ")
    
    return plant_name.strip(), disease_type.strip()
