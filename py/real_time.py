import requests
from bs4 import BeautifulSoup
import re
import sys


def get_live_location(train_name_no):
    url = f"https://www.railmitra.com/live-train-running-status/{train_name_no}"
    headers = {
        "User-Agent": "Mozilla/5.0"
    }
    resp = requests.get(url, headers=headers)
    soup = BeautifulSoup(resp.text, "html.parser")
    wells = soup.find_all('div', class_='well well-sm')
    for well in wells:
        if well.find(class_='ind-flash'):
            text = well.get_text(separator=" ", strip=True)
            
            # Regex and split logic to extract fields
            m = re.match(r"([A-Z\s]+)-\s*\((\w+)\)\s+(\d+) kms \| PF # ([^ ]+) Day (\d+) ~ ([^ ]+) ([0-9:]+) ([0-9:]+) ([0-9:]+) ([0-9:]+) (Delayed by [^ ]+|Right Time)", text)
            if m:
                def add_delay_to_time(time_str, delay_str):
                    import re
                    if not time_str or not delay_str:
                        return time_str
                    # Extract delay in minutes
                    delay_min = 0
                    delay_match = re.search(r'(\d+)', delay_str)
                    if delay_match:
                        delay_min = int(delay_match.group(1))
                    # Parse time_str (HH:MM)
                    try:
                        h, m = map(int, time_str.split(':'))
                        total_min = h * 60 + m + delay_min
                        new_h = (total_min // 60) % 24
                        new_m = total_min % 60
                        return f"{new_h:02d}:{new_m:02d}"
                    except Exception:
                        return time_str

                delay_val = m.group(11)
                d = {
                    'station_name': m.group(1).strip(),
                    'station_code': m.group(2),
                    'distance': m.group(3),
                    'platform': m.group(4),
                    'day': m.group(5),
                    'date': m.group(6),
                    'exp_arrival': m.group(7),
                    'real_arrival': add_delay_to_time(m.group(8), delay_val),
                    'exp_departure': m.group(9),
                    'real_departure': add_delay_to_time(m.group(10), delay_val),
                    'delay': delay_val
                }
                return d
            # Fallback: try to split by known tokens if regex fails
            parts = text.split()
            try:
                idx1 = parts.index('-')
                idx2 = parts.index('|')
                idx3 = parts.index('Day')
                idx4 = parts.index('~')
                d = {
                    'station_name': ' '.join(parts[:idx1]),
                    'station_code': parts[idx1+1][1:-1],
                    'distance': parts[idx1+2],
                    'platform': parts[idx2+2],
                    'day': parts[idx3+1],
                    'date': parts[idx4+1],
                    'exp_arrival': parts[idx4+2],
                    'real_arrival': parts[idx4+3],
                    'exp_departure': parts[idx4+4],
                    'real_departure': parts[idx4+5],
                    'delay': ' '.join(parts[idx4+6:])
                }
                return d
            except Exception:
                return {'raw': text}
    return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        train_name_no = sys.argv[1]
    else:
        train_name_no ="bgp-jyg-exp-15553"  # Default value
    result = get_live_location(train_name_no)
    print(result)
