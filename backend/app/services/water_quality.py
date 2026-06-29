import pickle
import numpy as np
import datetime
import os
import warnings

# Suppress sklearn warnings about feature names when predicting without dataframe
warnings.filterwarnings("ignore", category=UserWarning)

class WaterQualityAnalyzer:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(WaterQualityAnalyzer, cls).__new__(cls)
            cls._instance._load_model()
        return cls._instance

    def _load_model(self):
        # Locate the model inside backend/model/fish_water_quality/model.pkl
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # current_dir is backend/app/services, so go up to backend/
        model_path = os.path.join(current_dir, "..", "..", "model", "fish_water_quality", "model.pkl")
        
        try:
            with open(model_path, "rb") as f:
                self._model = pickle.load(f)
        except Exception as e:
            print(f"Failed to load Water Quality model: {e}")
            self._model = None

    def analyze(self, do: float, temp: float, ph: float) -> str:
        if self._model is None:
            # Fallback if model fails to load
            return "Stable"

        now = datetime.datetime.now()

        # The model requires exactly 23 features in this order:
        # 1. Average Fish Weight (g) 
        # 2. Survival Rate (%)
        # 3. Disease Occurrence (Cases)
        # 4. Temperature (°C) 
        # 5. Dissolved Oxygen (mg/L) 
        # 6. pH 
        # 7. Turbidity (NTU)
        # 8. Month_Num
        # 9. Oxygenation Interventions
        # 10. Corrective Interventions
        # 11. Average Temperature (°C) 
        # 12. High Temperature (°C) 
        # 13. Low Temperature (°C) 
        # 14. Precipitation (inches) 
        # 15. day
        # 16. hour
        # 17. oxigeno_scaled
        # 18. ph (duplicate/same as ph)
        # 19. turbidez
        # 20. Oxygenation Automatic
        # 21. Corrective Measures
        # 22. Thermal Risk Index
        # 23. Low Oxygen Alert

        features = np.array([[
            500.0,            # Average Fish Weight (g) default
            95.0,             # Survival Rate default
            0.0,              # Disease Occurrence default
            float(temp),      # Temperature (°C)
            float(do),        # Dissolved Oxygen (mg/L)
            float(ph),        # pH
            10.0,             # Turbidity (NTU) default
            now.month,        # Month_Num
            0.0,              # Oxygenation Interventions
            0.0,              # Corrective Interventions
            float(temp),      # Average Temperature
            float(temp) + 2.0,# High Temperature
            float(temp) - 2.0,# Low Temperature
            0.0,              # Precipitation
            now.day,          # day
            now.hour,         # hour
            float(do) / 20.0, # oxigeno_scaled (assuming scaled to 20 max)
            float(ph),        # ph
            10.0,             # turbidez (same as turbidity)
            1.0,              # Oxygenation Automatic (Yes=1)
            0.0,              # Corrective Measures (No=0)
            0.0,              # Thermal Risk Index (Normal=0)
            0.0               # Low Oxygen Alert (Safe=0)
        ]])

        prediction = self._model.predict(features)
        
        # Based on label_map: {"0": "At Risk", "1": "Stable"}
        if prediction[0] == 0:
            return "At Risk"
        else:
            return "Stable"

water_quality_analyzer = WaterQualityAnalyzer()
