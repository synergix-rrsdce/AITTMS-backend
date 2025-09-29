import requests
import json

# curl --request GET \
#   --url 'https://irctc-api2.p.rapidapi.com/trainSchedule?trainNumber=12321' \
#   --header 'x-rapidapi-host: irctc-api2.p.rapidapi.com' \
#   --header 'x-rapidapi-key: 99dbfc7385mshfe1053cc098e482p176b2djsn588d21ba40d8'

def fetch_train_schedule(train_number, api_key):
    url = f"https://irctc-api2.p.rapidapi.com/trainSchedule?trainNumber={train_number}"
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
    # Example usage
    train_number = "12321"  # Replace with actual train number
    api_key = "99dbfc7385mshfe1053cc098e482p176b2djsn588d21ba40d8"  # Replace with your RapidAPI key
    fetch_train_schedule(train_number, api_key)