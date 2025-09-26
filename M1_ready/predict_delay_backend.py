import joblib
import numpy as np
import pandas as pd

# Load model and encoders
def load_model_and_encoders():
    model = joblib.load('xgb_train_delay_model.pkl')
    le_station = joblib.load('le_station_encoder.pkl')
    le_train = joblib.load('le_train_encoder.pkl')
    le_day = joblib.load('le_day_encoder.pkl')
    # M1_ready\le_train_encoder.pkl
    return model, le_station, le_train, le_day

def time_to_minutes(t):
    try:
        if isinstance(t, str):
            t = t.strip().replace('PM', '').replace('AM', '').replace(' ', '')
            h, m = map(int, t.split(':'))
            return h * 60 + m
        return float(t)
    except:
        return np.nan

# Predict delay and arrival time
def predict_delay(station_name, train_id, day, scheduled_arrival, scheduled_departure, delay_till_now):
    model, le_station, le_train, le_day = load_model_and_encoders()
    station_enc = le_station.transform([station_name])[0]
    train_enc = le_train.transform([train_id])[0]
    day_enc = le_day.transform([day])[0]
    arr_min = time_to_minutes(scheduled_arrival)
    dep_min = time_to_minutes(scheduled_departure)
    input_vec = np.array([[station_enc, arr_min, arr_min + delay_till_now, delay_till_now, dep_min, dep_min + delay_till_now, delay_till_now, train_enc, day_enc]])
    pred_delay = model.predict(input_vec)[0]
    predicted_arrival_time_min = arr_min + pred_delay
    hours = int(predicted_arrival_time_min // 60)
    minutes = int(predicted_arrival_time_min % 60)
    predicted_arrival_time = f'{hours:02d}:{minutes:02d}'
    return pred_delay, predicted_arrival_time

if __name__ == "__main__":
    # Example usage
    station_name = input("Enter station name: ")
    train_id = input("Enter train id: ")
    day = input("Enter day (e.g., Mon): ")
    scheduled_arrival = input("Enter scheduled arrival time (HH:MM): ")
    scheduled_departure = input("Enter scheduled departure time (HH:MM): ")
    delay_till_now = float(input("Enter delay till now (in minutes): "))
    pred_delay, pred_arrival = predict_delay(station_name, train_id, day, scheduled_arrival, scheduled_departure, delay_till_now)
    print(f"Predicted delay (mins): {pred_delay:.2f}")
    print(f"Predicted arrival time: {pred_arrival}")
