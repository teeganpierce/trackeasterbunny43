import requests


class DarkSkyProvider:
    def __init__(self, dryrun, apikey):
        self.dryrun = dryrun
        self.apikey = apikey
        self.weatherjson = {}

    def fetch(self, latitude, longitude, unixarrival, cityname):
        if not self.dryrun:
            weatherdata = requests.get(
                f"https://api.darksky.net/forecast/{self.apikey}/{latitude},{longitude},{unixarrival}?exclude=minutely,hourly,daily")
            self.weatherjson = weatherdata.json()
            self.weatherjson = self.weatherjson["currently"]
            tempF = self.weatherjson["temperature"]
            self.weatherjson["temperatureC"] = (tempF - 32) * (5 / 9)

            if self.weatherjson["summary"] == "Humid" and self.weatherjson["icon"] == "clear-night":
                self.weatherjson["summary"] = "Clear"
            elif self.weatherjson["summary"] == "Humid" and self.weatherjson["icon"] == "clear-day":
                self.weatherjson["summary"] = "Sunny"

            summary = self.weatherjson["summary"]
            summary = summary.replace("Humid and ", "").replace(" and Humid", "").replace("Possible ", "")
            self.weatherjson["summary"] = summary
        else:
            if cityname == "International Space Station":
                self.weatherjson = {"temperature": -250,
                                    "temperatureC": (-250 - 32) * (5 / 9),
                                    "summary": "Very Cold",
                                    "icon": "clear-night"
                                    }
            else:
                self.weatherjson = {"temperature": 70,
                                    "temperatureC": 20,
                                    "summary": "Clear",
                                    "icon": "clear-night"
                                    }
