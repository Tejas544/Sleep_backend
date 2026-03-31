import sys
import json
import os

# 1. COMPLETELY MUTE TENSORFLOW SPAM BEFORE IMPORTING
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import numpy as np
import pandas as pd
from tensorflow.keras.models import load_model

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Missing arguments. Usage: predict.py <model_path> <csv_path>"}))
        sys.exit(0)

    model_path = sys.argv[1]
    csv_path = sys.argv[2]

    try:
        # Load Model
        model = load_model(model_path)
        num_classes = model.output_shape[-1]

        # Load and clean data
        df = pd.read_csv(csv_path)
        
        # Check for the exact column name 'HR'
        if 'HR' not in df.columns:
            raise ValueError(f"CSV must contain an 'HR' column. Found columns: {list(df.columns)}")
            
        hr_data = df['HR'].ffill().bfill().values
        hr_normalized = (hr_data - hr_data.mean()) / hr_data.std()

        WINDOW_SIZE = 640
        num_windows = len(hr_normalized) // WINDOW_SIZE
        if num_windows == 0:
            raise ValueError("Not enough data to form a single 32-second window.")
            
        windows = [hr_normalized[i*WINDOW_SIZE:(i+1)*WINDOW_SIZE] for i in range(num_windows)]

        X_test = np.array(windows).reshape(num_windows, WINDOW_SIZE, 1)
        predictions = model.predict(X_test, verbose=0)
        predicted_classes = np.argmax(predictions, axis=1)

        total_hours = (num_windows * 32) / 3600
        s1 = (total_hours / 8) * 100

        non_wake_count = np.sum(predicted_classes != 0)
        s2 = (non_wake_count / num_windows) * 100

        deep_sleep_count = np.sum((predicted_classes == 1) | (predicted_classes == 2) | (predicted_classes == 3))
        s3 = ((deep_sleep_count / num_windows) / 0.2) * 100 

        rem_sleep_count = np.sum(predicted_classes == 4)
        s4 = ((rem_sleep_count / num_windows) / 0.25) * 100 

        successive_diffs = np.diff(hr_data)
        rmssd = np.sqrt(np.mean(successive_diffs ** 2))
        s5 = (rmssd / 65) * 100 

        final_score = (0.35*s1) + (0.2*s2) + (0.15*s3) + (0.15*s4) + (0.15*s5)

        output = {
            "success": True,
            "metrics": {
                "durationScore": round(s1, 1),
                "efficiencyScore": round(s2, 1),
                "deepSleepScore": round(s3, 1),
                "remSleepScore": round(s4, 1),
                "hrvScore": round(s5, 1),
                "overallScore": round(final_score, 1)
            },
            "timeseries": predicted_classes.tolist()
        }
        
        print(json.dumps(output))

    except Exception as e:
        # 2. EXIT GRACEFULLY SO NODE.JS READS THIS JSON
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(0) 

if __name__ == "__main__":
    main()