# Weather data fetcher for Bararuni Junction, Bihar using Open-Meteo API

import requests

def fetch_weather():
    url = "https://api.open-meteo.com/v1/forecast?latitude=25.471222&longitude=85.977745&current_weather=true&hourly=temperature_2m,relativehumidity_2m,precipitation"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        current = data.get("current_weather", {})
        hourly = data.get("hourly", {})
        time_now = current.get("time")
        # Find the index for the current time in hourly data
        idx = hourly.get("time", []).index(time_now) if time_now in hourly.get("time", []) else 0
        temperature = current.get("temperature", "N/A")
        humidity = hourly.get("relativehumidity_2m", ["N/A"])[idx] if "relativehumidity_2m" in hourly else "N/A"
        precipitation = hourly.get("precipitation", ["N/A"])[idx] if "precipitation" in hourly else "N/A"
        return {
            "temperature": temperature,
            "humidity": humidity,
            "precipitation": precipitation
        }
    else:
        return {"error": "Unable to fetch data from Open-Meteo API."}

if __name__ == "__main__":
    weather_data = fetch_weather()
    print(weather_data)