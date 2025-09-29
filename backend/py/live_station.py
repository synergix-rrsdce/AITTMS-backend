import requests
import json

def fetch_live_station(source, destination, hours, api_key):
    url = f"https://irctc-api2.p.rapidapi.com/liveStation?source={source}&destination={destination}&hours={hours}"
    headers = {
        "x-rapidapi-host": "irctc-api2.p.rapidapi.com",
        "x-rapidapi-key": api_key
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        try:
            data = response.json()
            print(json.dumps(data, indent=2))
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
    source = "NDLS"  # Replace with source station code
    destination = "GKP"  # Replace with destination station code
    hours = 8  # Number of hours to look ahead
    api_key = "99dbfc7385mshfe1053cc098e482p176b2djsn588d21ba40d8"  # Replace with your RapidAPI key
    fetch_live_station(source, destination, hours, api_key)