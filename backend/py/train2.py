import requests
import json

def fetch_live_train(train_number, api_key, start_day=1):
    url = f"https://irctc-api2.p.rapidapi.com/liveTrain?trainNumber={train_number}&startDay={start_day}"
    headers = {
        "x-rapidapi-host": "irctc-api2.p.rapidapi.com",
        "x-rapidapi-key": api_key
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        try:
            data = response.json()
            # Find BJU station info in live status
            bju_info = None
            for stop in data.get("data", {}).get("route", []):
                if stop.get("station_code") == "BJU":
                    bju_info = stop
                    break
            if bju_info:
                print("BJU Station Live Info:")
                print(json.dumps(bju_info, indent=2))
            else:
                print("BJU station not found in this train's live route.")
            return data
        except Exception as e:
            print("Error parsing JSON:", e)
            print(response.text)
            return None
    else:
        print(f"Failed to fetch data. Status code: {response.status_code}")
        print(response.text)
        return None

if __name__ == "__main__":
    train_number = "11123"  # Replace with actual train number
    api_key = "99dbfc7385mshfe1053cc098e482p176b2djsn588d21ba40d8"  # Replace with your RapidAPI key
    fetch_live_train(train_number, api_key, start_day=1)