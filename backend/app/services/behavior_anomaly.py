import os
import pickle
import collections
import cv2
import numpy as np

# Suppress tensorflow warnings before importing
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

try:
    from tensorflow.keras.applications import EfficientNetB0
    from tensorflow.keras.applications.efficientnet import preprocess_input
    from ultralytics import YOLO
except ImportError:
    pass # Handled gracefully if imports fail

# Constants
IMG_SIZE = (224, 224)
EFFICIENTNET_FEATURES = 1280
FEATURE_SIZE = EFFICIENTNET_FEATURES * 2 + 2
MIN_TRACK_FRAMES = 5
FRAME_SKIP = 2
VOTE_WINDOW = 3
DETECTION_CONF = 0.25
UPDATE_EVERY = 10

class BehaviorAnomalyDetector:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BehaviorAnomalyDetector, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance
        
    def __init__(self):
        if self.initialized:
            return
            
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        model_dir = os.path.join(base_dir, "model", "behavior_anomaly")
        
        self.yolo_model_path = os.path.join(model_dir, "best.pt")
        self.scaler_path = os.path.join(model_dir, "scaler.pkl")
        self.isoforest_path = os.path.join(model_dir, "isolation_forest.pkl")
        self.threshold_path = os.path.join(model_dir, "threshold.pkl")
        
        # We lazy load the models to prevent long startup times
        self.yolo_model = None
        self.effnet_model = None
        self.scaler = None
        self.iso_forest = None
        self.threshold = None
        
        self.initialized = True
        
    def _load_models(self):
        if self.yolo_model is not None:
            return
            
        self.yolo_model = YOLO(self.yolo_model_path)
        self.effnet_model = EfficientNetB0(
            weights="imagenet",
            include_top=False,
            pooling="avg"
        )
        
        with open(self.scaler_path, "rb") as f:
            self.scaler = pickle.load(f)
            
        with open(self.isoforest_path, "rb") as f:
            self.iso_forest = pickle.load(f)
            
        with open(self.threshold_path, "rb") as f:
            self.threshold = pickle.load(f)
            
    def _preprocess_crop(self, crop_bgr):
        img = cv2.resize(crop_bgr, IMG_SIZE)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = img.astype(np.float32)
        img = np.expand_dims(img, axis=0)
        img = preprocess_input(img)
        return img
        
    def _extract_features(self, crop_bgr):
        img = self._preprocess_crop(crop_bgr)
        features = self.effnet_model.predict(img, verbose=0)
        return features[0]
        
    def _compute_center(self, bbox):
        x1, y1, x2, y2 = bbox
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0
        return cx, cy
        
    def _compute_speeds(self, centers):
        if len(centers) < 2:
            return [0.0]
        speeds = []
        for i in range(1, len(centers)):
            dx = centers[i][0] - centers[i - 1][0]
            dy = centers[i][1] - centers[i - 1][1]
            speed = np.sqrt(dx ** 2 + dy ** 2)
            speeds.append(speed)
        return speeds
        
    def _build_feature_vector(self, feature_history, centers):
        feat_array = np.array(feature_history)
        mean_feat = np.mean(feat_array, axis=0)
        std_feat  = np.std(feat_array,  axis=0)
        speeds    = self._compute_speeds(centers)
        mean_spd  = np.mean(speeds)
        std_spd   = np.std(speeds)
        
        feature_vector = np.concatenate([
            mean_feat,
            std_feat,
            [mean_spd],
            [std_spd]
        ])
        return feature_vector
        
    def _get_crop(self, frame, bbox, margin=5):
        h, w = frame.shape[:2]
        x1, y1, x2, y2 = [int(v) for v in bbox]
        
        x1 = max(0, x1 - margin)
        y1 = max(0, y1 - margin)
        x2 = min(w, x2 + margin)
        y2 = min(h, y2 + margin)
        
        if x2 <= x1 or y2 <= y1:
            return None
        return frame[y1:y2, x1:x2]

    def predict_video(self, input_path: str, output_path: str):
        self._load_models()
        
        cap = cv2.VideoCapture(input_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        writer = cv2.VideoWriter(
            output_path,
            cv2.VideoWriter_fourcc(*"mp4v"),
            fps,
            (width, height)
        )
        
        track_features = {}
        track_centers = {}
        track_votes = collections.defaultdict(lambda: collections.deque(maxlen=VOTE_WINDOW))
        track_scores = {}
        track_counter = collections.defaultdict(int)
        
        frame_idx = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            if frame_idx % FRAME_SKIP != 0:
                writer.write(frame)
                frame_idx += 1
                continue
                
            results = self.yolo_model.track(
                frame,
                persist=True,
                tracker="bytetrack.yaml",
                conf=DETECTION_CONF,
                verbose=False,
            )
            
            boxes = results[0].boxes
            healthy = 0
            abnormal = 0
            
            if boxes is not None and boxes.id is not None:
                for box, tid in zip(boxes.xyxy, boxes.id):
                    tid = int(tid)
                    bbox = box.cpu().numpy()
                    crop = self._get_crop(frame, bbox)
                    
                    if crop is not None:
                        feat = self._extract_features(crop)
                        center = self._compute_center(bbox)
                        
                        track_features.setdefault(tid, []).append(feat)
                        track_centers.setdefault(tid, []).append(center)
                        track_counter[tid] += 1
                        
                        if (track_counter[tid] % UPDATE_EVERY == 0 and len(track_features[tid]) >= MIN_TRACK_FRAMES):
                            vec = self._build_feature_vector(track_features[tid], track_centers[tid])
                            score = self.iso_forest.score_samples(self.scaler.transform(vec.reshape(1, -1)))[0]
                            track_scores[tid] = score
                            track_votes[tid].append(score < self.threshold)
                            
                    votes = track_votes.get(tid)
                    if votes:
                        abnormal_flag = sum(votes) > len(votes) / 2
                        label = "Abnormal" if abnormal_flag else "Healthy"
                    else:
                        label = "Pending"
                        
                    color = (0,0,255) if label=="Abnormal" else (0,255,0) if label=="Healthy" else (0,255,255)
                    x1,y1,x2,y2 = map(int,bbox)
                    
                    cv2.rectangle(frame,(x1,y1),(x2,y2),color,2)
                    cv2.putText(frame, label, (x1,y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                    
                    if label=="Healthy":
                        healthy+=1
                    elif label=="Abnormal":
                        abnormal+=1
                        
            cv2.putText(frame, f"Healthy:{healthy}", (10,30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)
            cv2.putText(frame, f"Abnormal:{abnormal}", (10,60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,255), 2)
            writer.write(frame)
            frame_idx += 1
            
        cap.release()
        writer.release()
        
        final_prediction = "Healthy"
        abnormal_tracks = 0
        healthy_tracks = 0
        
        for tid, votes in track_votes.items():
            if len(votes)==0:
                continue
            if sum(votes) > len(votes)/2:
                abnormal_tracks += 1
            else:
                healthy_tracks += 1
                
        if abnormal_tracks > healthy_tracks:
            final_prediction = "Abnormal"
            
        return {
            "prediction": final_prediction,
            "healthy_tracks": healthy_tracks,
            "abnormal_tracks": abnormal_tracks,
            "output_video": output_path,
        }

# Singleton instance
detector = BehaviorAnomalyDetector()
