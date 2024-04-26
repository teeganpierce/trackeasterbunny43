import requests
import time


# Little wrapper class to take care of TZData fetching.
class TZData:
    def __init__(self, processing_time, api_key):
        self.processing_time = processing_time
        self.api_key = api_key

    def fetch(self, latitude, longitude):
        while True:
            r = requests.get(
                f"https://maps.googleapis.com/maps/api/timezone/json?location={latitude},{longitude}&timestamp={self.processing_time}&key={self.api_key}")
            r_json = r.json()
            try:
                return r_json['timeZoneId']
            except KeyError:
                print("TZ Data not found here. Retrying in 0.5s because of key prop issues...")
                time.sleep(0.5)
                continue
