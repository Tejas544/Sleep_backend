import sys
import os
import json
import numpy as np
import pandas as pd
from scipy.signal import butter, filtfilt, find_peaks

# Mute TensorFlow spam
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
from tensorflow.keras.models import load_model

def process_raw_radar(df):
    """Handles DSP: Raw Radar -> Continuous HR & RMSSD"""
    # Standardize column names
    df.columns = df.columns.str.strip().str.lower()
    if 'time' not in df.columns or 'data' not in df.columns:
        raise ValueError("Raw CSV must contain 'time' and 'data' columns.")

    t = df['time'].values
    x_raw = df['data'].values

    # Sampling Frequency
    fs = 1 / np.mean(np.diff(t))
    
    # Remove DC Offset & Bandpass Filter (0.8 - 2.0 Hz)
    x = x_raw - np.mean(x_raw)
    low = 0.8 / (fs / 2)
    high = 2.0 / (fs / 2)
    b, a = butter(4, [low, high], btype='band')
    heart = filtfilt(b, a, x)

    # Ignore first 3 seconds for filter settling
    mask_valid = t > 3
    t_valid = t[mask_valid]
    heart_valid = heart[mask_valid]

    # Peak Detection (Heartbeats) using MAD
    peaks, _ = find_peaks(
        heart_valid,
        distance=fs*0.5,
        prominence=np.median(np.abs(heart_valid)) * 1.5
    )
    peak_times = t_valid[peaks]

    # Instantaneous Heart Rate
    rr_intervals_sec = np.diff(peak_times)
    instant_hr = 60.0 / rr_intervals_sec
    hr_times = peak_times[1:]

    # Interpolate to continuous signal matching original time array
    hr_continuous = np.interp(t, hr_times, instant_hr)
    
    # Artifact Rejection (Replace impossible values with NaN, then forward/back fill)
    hr_continuous[(hr_continuous < 45) | (hr_continuous > 140)] = np.nan
    hr_series = pd.Series(hr_continuous).ffill().bfill()
    
    # Smooth the trend (3-second window)
    window_size = int(fs * 3)
    if window_size > 0:
        hr_series = hr_series.rolling(window=window_size, center=True).mean().bfill().ffill()

    # Calculate True Clinical RMSSD
    rr_intervals_ms = rr_intervals_sec * 1000
    valid_rr = rr_intervals_ms[(rr_intervals_ms >= 400) & (rr_intervals_ms <= 1500)]
    rr_diff = np.diff(valid_rr)
    valid_diff = rr_diff[np.abs(rr_diff) < 500] # Reject ectopic jumps > 500ms
    
    rmssd = np.sqrt(np.mean(valid_diff**2)) if len(valid_diff) > 0 else 0

    return hr_series.values, rmssd

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Missing arguments."}))
        sys.exit(0)

    model_path = sys.argv[1]
    csv_path = sys.argv[2]

    try:
        # 1. Load Model & Raw Data
        model = load_model(model_path)
        df = pd.read_csv(csv_path)

        # 2. Digital Signal Processing (Extract HR and RMSSD in RAM)
        hr_data, true_rmssd = process_raw_radar(df)

        # 3. Normalize for Keras Model
        hr_normalized = (hr_data - hr_data.mean()) / hr_data.std()

        # 4. Windowing (Assuming model wants 640 inputs per inference)
        WINDOW_SIZE = 640
        num_windows = len(hr_normalized) // WINDOW_SIZE
        if num_windows == 0:
            raise ValueError("Not enough data to form a single window.")
            
        windows = [hr_normalized[i*WINDOW_SIZE:(i+1)*WINDOW_SIZE] for i in range(num_windows)]

        # 5. ML Inference
        X_test = np.array(windows).reshape(num_windows, WINDOW_SIZE, 1)
        predictions = model.predict(X_test, verbose=0)
        predicted_classes = np.argmax(predictions, axis=1)

        # 6. Scoring Metrics
        total_hours = (num_windows * 32) / 3600
        s1 = (total_hours / 8) * 100

        non_wake_count = np.sum(predicted_classes != 0)
        s2 = (non_wake_count / num_windows) * 100

        deep_sleep_count = np.sum((predicted_classes == 1) | (predicted_classes == 2) | (predicted_classes == 3))
        s3 = ((deep_sleep_count / num_windows) / 0.2) * 100 

        rem_sleep_count = np.sum(predicted_classes == 4)
        s4 = ((rem_sleep_count / num_windows) / 0.25) * 100 

        # HRV Score using the new, medically accurate RMSSD
        s5 = (true_rmssd / 65) * 100 

        final_score = (0.35*s1) + (0.2*s2) + (0.15*s3) + (0.15*s4) + (0.15*s5)

        # 7. Output to Node.js
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
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(0)

if __name__ == "__main__":
    main()