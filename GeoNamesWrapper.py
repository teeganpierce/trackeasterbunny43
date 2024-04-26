import requests
import time


class GeoNamesWrapper:
    def __init__(self, username):
        self.username = username

    def fetch(self, lat: float, lng: float):
        """
        Fetches the GeoNames country data for the specified latitude and longitude
        """
        url = f"http://api.geonames.org/countryCodeJSON?formatted=true&lat={lat}&lng={lng}&username={self.username}" \
              f"&style=full"
        r = requests.get(url)
        time.sleep(0.5)
        r_json = r.json()
        try:
            return r_json['languages'].split(",")[0]
        except KeyError:
            print("Failed to query GeoNames for this country name.")
            return "None"
