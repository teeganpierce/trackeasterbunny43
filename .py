import csv
import json
import sys

from vincenty import vincenty
import progressbar
from configparser import ConfigParser
import constants as c
from Wikipedia import Wikipedia
from TZData import TZData
from TEBCCWeatherKitProvider import TEBCCWeatherKitProvider
from GeoNamesWrapper import GeoNamesWrapper
import os
from datetime import datetime, timedelta
import math
import glob
import time


# Higher level class that takes care of a lot of the compilation shtuff.
class Compiler:
    def __init__(self, tsv_infile, tsv_outfile, json_outfile, configfile):
        self.config = None
        self.tsv_infile = tsv_infile
        self.tsv_outfile = tsv_outfile
        self.json_outfile = json_outfile
        self.r = {"destinations": [], "generated": int(time.time())}
        self.route = self.r['destinations']
        self.configfile = configfile
        self.configparser = ConfigParser()
        self.configparser.read(self.configfile)

        self.errors = 0
        self.warnings = 0

        self.offset = self.configparser.getint("COMPILER", "starttime") - self.configparser.getint("COMPILER",
                                                                                                   "actualruntime")
        if os.getenv("CI_COMMIT_BRANCH") == "dev" and not self.configparser.getboolean("COMPILER", "override_auto_devstart"):
            # Automatically set the dev branch to get a run going at 1:59:55 AM
            # This is not done if we are forcing a dev branch run to happen at a specific time.
            # If it is before 1 AM, then we go back a day and start the run then
            nowdt = datetime.now()
            nowdt_sid = (nowdt.hour * 3600) + (nowdt.minute * 60) + nowdt.second
            startdt = nowdt.replace(hour=2, minute=0, second=0)
            if nowdt_sid < 6300:
                startdt = startdt - timedelta(days=1)
            self.offset = self.configparser.getint("COMPILER", "starttime") - math.floor(startdt.timestamp())
        elif os.getenv("CI_COMMIT_BRANCH") == "staging" and not self.configparser.getboolean("COMPILER", "override_auto_mainstart"):
            self.offset = 0
        elif os.getenv("CI_COMMIT_BRANCH") == "main" and not self.configparser.getboolean("COMPILER", "override_auto_mainstart"):
            # Similarly, this ensures that any route being compiled for production is done so at the intended time.
            self.offset = 0
            if self.configparser.getboolean("WEATHERKIT", "dryrun"):
                print("!!! HEY DINGUS !!!")
                print("DRY RUN IS ENABLED AND YOU'RE TRYING TO COMPILE A ROUTE TO PROD IN CI")
                print("THEREFORE COMPILATION IS STOPPING WITH ERROR CODE 69 AND YOU NEED TO CHECK FOR STUPID ERRORS")
                print("!!! HEY DINGUS !!!")
                sys.exit(69)

    # Method that loops through everything, fetches TZData/Wikipedia if requested, and yoinks out a JSON file.
    def compiler(self):
        with open(self.tsv_infile, encoding="utf-8") as inf:
            length = sum(1 for _ in inf)

        with open(self.tsv_infile, encoding="utf-8") as inf, open(self.tsv_outfile, "w", newline='', encoding="utf-8") as outf:
            tsv_reader = csv.reader(inf, delimiter="\t", quotechar='"')
            tsv_writer = csv.writer(outf, delimiter="\t", quotechar='"')
            index = 0
            tempcont = 0
            distance_travelled_km = 0
            distance_travelled_mi = 0

            progressbar.streams.wrap_stdout()
            progressbar.streams.wrap_stderr()

            bar_widgets = [progressbar.PercentageLabelBar(), ' ', progressbar.Counter(), f'/{length - 1} | ',
                           progressbar.Timer(), ' | ', progressbar.ETA()]
            bar = progressbar.ProgressBar(max_value=(length - 1), widgets=bar_widgets)

            wikipedia = Wikipedia()
            tzdata = TZData(self.configparser.getint("TZ", "processingtime"), self.configparser.get("TZ", "apikey"))
            wkp = TEBCCWeatherKitProvider()
            gnw = GeoNamesWrapper(self.configparser.get("GEONAMES", "username"))

            for row in tsv_reader:
                if tempcont == 0:
                    tempcont = 1
                    tsv_writer.writerow(row)
                    continue

                self.route.append({})
                self.route[index]["unixarrival_v2"] = int(row[c.COLUMN_UNIXARRIVAL_ARRIVAL]) - self.offset
                self.route[index]["unixarrival"] = int(row[c.COLUMN_UNIXARRIVAL]) - self.offset
                self.route[index]["unixdeparture"] = int(row[c.COLUMN_UNIXDEPARTURE]) - self.offset
                self.route[index]["city"] = row[c.COLUMN_CITY]
                self.route[index]["region"] = row[c.COLUMN_REGION]
                self.route[index]["countrycode"] = row[c.COLUMN_COUNTRYCODE]
                if self.configparser.getboolean("TOBCC", "tobcc_mode"):
                    self.route[index]["giftsdelivered"] = int(int(row[c.COLUMN_GIFTSDELIVERED]) / 5)
                    self.route[index]["cookieseaten"] = int(int(row[c.COLUMN_COOKIESEATEN]) / 5)
                    self.route[index]["stockingsstuffed"] = int(int(row[c.COLUMN_STOCKINGSSTUFFED]) / 5)
                    self.route[index]["milkdrank"] = int(int(row[c.COLUMN_MILKDRANK]) / 5)
                    self.route[index]["carrotseaten"] = int(int(row[c.COLUMN_CARROTSEATEN]) / 5)
                else:
                    self.route[index]["giftsdelivered"] = int(int(row[c.COLUMN_GIFTSDELIVERED]))
                    self.route[index]["cookieseaten"] = int(int(row[c.COLUMN_COOKIESEATEN]))
                    self.route[index]["stockingsstuffed"] = int(int(row[c.COLUMN_STOCKINGSSTUFFED]))
                    self.route[index]["milkdrank"] = int(int(row[c.COLUMN_MILKDRANK]))
                    self.route[index]["carrotseaten"] = int(int(row[c.COLUMN_CARROTSEATEN]))
                self.route[index]["lat"] = float(row[c.COLUMN_LATITUDE])
                self.route[index]["lng"] = float(row[c.COLUMN_LONGITUDE])
                self.route[index]["population"] = int(row[c.COLUMN_POPULATION])
                self.route[index]["population_year"] = str(row[c.COLUMN_POPULATIONYEAR])
                self.route[index]["elevation"] = int(row[c.COLUMN_ELEVATION])

                # Do Wikipedia processing here
                row[c.COLUMN_WIKIPEDIALINK] = row[c.COLUMN_WIKIPEDIALINK].replace("#Climate", "")
                self.route[index]["srclink"] = row[c.COLUMN_WIKIPEDIALINK]
                # Here's how this works. If Wikipedia is set to use, any empty description is automatically fetched.
                # If Wikipedia Use is on and force fetch is on, it'll get the description for any row.
                # This auto-includes regex parsing.

                # If cleanup is set to True (separate), then just a standard non-regexy parsing happens.
                if self.configparser.getboolean("WIKIPEDIA", "use"):
                    if row[c.COLUMN_WIKIPEDIADESCR] == "" or self.configparser.getboolean("WIKIPEDIA", "force_fetch"):
                        if row[c.COLUMN_WIKIPEDIALINK] != "":
                            row[c.COLUMN_WIKIPEDIADESCR] = wikipedia.fetch(row[c.COLUMN_WIKIPEDIALINK].split("/")[-1])
                            try:
                                row[c.COLUMN_WIKIPEDIADESCR] = wikipedia.regex_parse(row[c.COLUMN_WIKIPEDIADESCR])
                            except TimeoutError:
                                self.printer("WARNING", index, "Wikipedia regex timed out for this row.")
                                pass

                if self.configparser.getboolean("WIKIPEDIA", "cleanup"):
                    if row[c.COLUMN_WIKIPEDIALINK] != "":
                        row[c.COLUMN_WIKIPEDIADESCR] = wikipedia.general_parse(row[c.COLUMN_WIKIPEDIADESCR])

                self.route[index]["descr"] = row[c.COLUMN_WIKIPEDIADESCR]
                # Do Google TZ Processing here
                if self.configparser.getboolean("TZ", "use"):
                    if row[c.COLUMN_TIMEZONE] == "" or self.configparser.getboolean("TZ", "force_fetch"):
                        row[c.COLUMN_TIMEZONE] = tzdata.fetch(row[c.COLUMN_LATITUDE], row[c.COLUMN_LONGITUDE])

                self.route[index]["timezone"] = row[c.COLUMN_TIMEZONE]

                # Do Dark Sky processing here
                if self.route[index]["region"] != "pt":
                    weatherdata = wkp.request_tebcc(lat=self.route[index]["lat"],
                                                    lng=self.route[index]["lng"],
                                                    time=self.route[index]["unixarrival"],
                                                    dryrun=self.configparser.getboolean("WEATHERKIT", "dryrun"))
                    self.route[index]["weather"] = {
                        "tempC": weatherdata['temperature'],
                        "tempF": weatherdata['temperatureF'],
                        "summary": weatherdata['conditionCode'],
                        "icon": weatherdata['icon']
                    }
                else:
                    self.route[index]["weather"] = {
                        "tempC": 70,
                        "tempF": 20,
                        "summary": "Clear",
                        "icon": "wi-night-clear"
                    }

                # Do GeoNames parsing here (with a 1 second delay as to not trigger rate limits)
                if self.configparser.getboolean("GEONAMES", "use"):
                    if row[c.COLUMN_LOCALE] == "" or self.configparser.getboolean("GEONAMES", "force_fetch"):
                        row[c.COLUMN_LOCALE] = gnw.fetch(lat=self.route[index]["lat"],
                                                         lng=self.route[index]["lng"])

                self.route[index]["locale"] = row[c.COLUMN_LOCALE]
                if self.route[index]["locale"] == "None":
                    self.route[index]["locale"] = ""

                # Do vincenty equations here (no more round 2)
                try:
                    point1 = (float(self.route[index - 1]["lat"]),
                              float(self.route[index - 1]["lng"]))
                    point2 = (float(self.route[index]["lat"]),
                              float(self.route[index]["lng"]))
                    temp_travelled_km = vincenty(point1, point2)
                    temp_travelled_mi = vincenty(point1, point2, miles=True)
                    distance_travelled_km += temp_travelled_km
                    distance_travelled_mi += temp_travelled_mi
                    self.route[index]["distance-km"] = round(distance_travelled_km, 4)
                    self.route[index]["distance-mi"] = round(distance_travelled_mi, 4)
                except KeyError:
                    self.printer("WARNING", index, "Distance calculation failed for this row.")
                    self.route[index]["distance-km"] = round(distance_travelled_km, 4)
                    self.route[index]["distance-mi"] = round(distance_travelled_mi, 4)

                try:
                    point1 = (float(self.route[index - 1]["lat"]),
                              float(self.route[index - 1]["lng"]))
                    point2 = (float(self.route[index]["lat"]),
                              float(self.route[index]["lng"]))
                    speed_travelled_km = vincenty(point1, point2)
                    speed_travelled_mi = vincenty(point1, point2, miles=True)
                    delta = float(self.route[index]["unixarrival_v2"]) - float(self.route[index - 1]["unixdeparture"])
                    self.route[index - 1]["speed-kph"] = round((speed_travelled_km / delta) * 3600, 4)
                    self.route[index - 1]["speed-mph"] = round((speed_travelled_mi / delta) * 3600, 4)
                except (ZeroDivisionError, KeyError):
                    self.printer("WARNING", (index - 1), "Speed calculation failed for this row.")
                    self.route[index]["speed-kph"] = 0
                    self.route[index]["speed-mph"] = 0

                # And finish things off with writing the row.
                tsv_writer.writerow(row)
                index += 1
                bar.update(index)

        self.route[index - 1]["speed-kph"] = 0
        self.route[index - 1]["speed-mph"] = 0

        with open(self.json_outfile, "w", encoding="utf-8") as json_out:
            json.dump(self.r, json_out)

        # Update .env.development file
        now = datetime.now()
        now_str = now.strftime("%Y%m%d")
        with open("../.env.development", "a", encoding="utf-8") as dev_env:
            dev_env.write(f"\nREACT_APP_VERSION=v{now_str}") 

        for file in glob.glob("../.env*"):
            print(f"Found: {file}")
            if ".env.development.local" in file:
                continue

            with open(file, "a", encoding="utf-8") as f:
                f.write(f"\nREACT_APP_COMMIT={os.getenv('CI_COMMIT_SHORT_SHA')}")


        

    def printer(self, severity, row, message):
        print(f"{severity} - Row {row} - {message}")
        if severity == "ERROR":
            self.errors += 1
        elif severity == "WARNING":
            self.warnings += 1

    # Validator method validates the route.tsv file to ensure it's not goobed.
    def validator(self):
        with open(self.tsv_infile, encoding="utf-8") as fc:
            rd = csv.reader(fc, delimiter="\t", quotechar='"')
            index = 0
            tempcont = 0
            prev_gifts = 0
            prev_cookies = 0
            prev_stockings = 0
            prev_milk = 0
            prev_carrots = 0
            prev_timestamp_arrival = 0
            prev_timestamp = 0
            prev_timestamp_departure = 0
            prev_latitude = 0
            prev_longitude = 0

            for row in rd:
                if tempcont == 0:
                    tempcont = 1
                    continue

                if row[c.COLUMN_UNIXARRIVAL_ARRIVAL] == "":
                    self.printer("ERROR", index, "Arrival arrival timestamp is missing!")
                else:
                    try:
                        unixarrival_arrival = int(row[c.COLUMN_UNIXARRIVAL_ARRIVAL])
                        if prev_timestamp_arrival > unixarrival_arrival:
                            self.printer("ERROR", index, "Unix arrival arrival has gone backwards!")

                        prev_timestamp_arrival = unixarrival_arrival
                    except ValueError:
                        self.printer("ERROR", index, "Unix arrival arrival is an invalid type!")

                if row[c.COLUMN_UNIXARRIVAL] == "":
                    self.printer("ERROR", index, "Arrival timestamp is missing!")
                else:
                    try:
                        unixarrival = int(row[c.COLUMN_UNIXARRIVAL])
                        if prev_timestamp > unixarrival:
                            self.printer("ERROR", index, "Unix arrival has gone backwards!")

                        if not prev_timestamp - 600 <= unixarrival:
                            self.printer("WARNING", index, "Previous unix arrival has a diff of 10+ minutes")

                        prev_timestamp = unixarrival
                    except ValueError:
                        self.printer("ERROR", index, "Unix arrival is an invalid type!")

                if row[c.COLUMN_UNIXDEPARTURE] == "":
                    self.printer("ERROR", index, "Departure timestamp is missing!")
                else:
                    try:
                        unixdeparture = int(row[c.COLUMN_UNIXDEPARTURE])
                        if prev_timestamp_departure > unixdeparture:
                            self.printer("ERROR", index, "Unix departure has gone backwards!")

                        prev_timestamp_departure = unixdeparture
                    except ValueError:
                        self.printer("ERROR", index, "Unix departure is an invalid type!")

                if row[c.COLUMN_CITY] == "":
                    self.printer("ERROR", index, "City name is missing!")

                if row[c.COLUMN_REGION] == "":
                    self.printer("ERROR", index, "Region is missing!")

                if row[c.COLUMN_COUNTRYCODE] == "" and row[c.COLUMN_REGION] != "pt":
                    self.printer("ERROR", index, "Country code is missing for a non-pretracking stop!")

                if row[c.COLUMN_GIFTSDELIVERED] == "":
                    self.printer("ERROR", index, "Gifts delivered is missing!")
                else:
                    try:
                        int(row[c.COLUMN_GIFTSDELIVERED])
                        if prev_gifts > int(row[c.COLUMN_GIFTSDELIVERED]):
                            self.printer("ERROR", index, "Gifts delivered has decreased for this row!")

                        prev_gifts = int(row[c.COLUMN_GIFTSDELIVERED])
                    except ValueError:
                        self.printer("ERROR", index, "Gifts delivered is an invalid type!")
                
                if row[c.COLUMN_COOKIESEATEN] == "":
                    self.printer("ERROR", index, "Cookies eaten is missing!")
                else:
                    try:
                        int(row[c.COLUMN_COOKIESEATEN])
                        if prev_cookies > int(row[c.COLUMN_COOKIESEATEN]):
                            self.printer("ERROR", index, "Cookies eaten has decreased for this row!")

                        prev_cookies = int(row[c.COLUMN_COOKIESEATEN])
                    except ValueError:
                        self.printer("ERROR", index, "Cookies eaten is an invalid type!")

                if row[c.COLUMN_STOCKINGSSTUFFED] == "":
                    self.printer("ERROR", index, "Stockings stuffed is missing!")
                else:
                    try:
                        int(row[c.COLUMN_STOCKINGSSTUFFED])
                        if prev_stockings > int(row[c.COLUMN_STOCKINGSSTUFFED]):
                            self.printer("ERROR", index, "Stockings stuffed has decreased for this row!")

                        prev_stockings = int(row[c.COLUMN_STOCKINGSSTUFFED])
                    except ValueError:
                        self.printer("ERROR", index, "Stockings stuffed is an invalid type!")

                if row[c.COLUMN_MILKDRANK] == "":
                    self.printer("ERROR", index, "Milk Drank is missing!")
                else:
                    try:
                        int(row[c.COLUMN_MILKDRANK])
                        if prev_milk > int(row[c.COLUMN_MILKDRANK]):
                            self.printer("ERROR", index, "Milk Drank has decreased for this row!")

                        prev_milk = int(row[c.COLUMN_MILKDRANK])
                    except ValueError:
                        self.printer("ERROR", index, "Milk Drank is an invalid type!")

                if row[c.COLUMN_CARROTSEATEN] == "":
                    self.printer("ERROR", index, "Carrots eaten is missing!")
                else:
                    try:
                        int(row[c.COLUMN_CARROTSEATEN])
                        if prev_carrots > int(row[c.COLUMN_CARROTSEATEN]):
                            self.printer("ERROR", index, "Carrots eaten has decreased for this row!")

                        prev_carrots = int(row[c.COLUMN_CARROTSEATEN])
                    except ValueError:
                        self.printer("ERROR", index, "Carrotes eaten is an invalid type!")

                if row[c.COLUMN_LATITUDE] == "":
                    self.printer("ERROR", index, "Latitude is missing!")
                else:
                    try:
                        float(row[c.COLUMN_LATITUDE])
                        if abs(float(row[c.COLUMN_LATITUDE]) - prev_latitude) > 100:
                            self.printer("WARNING", index,
                                         "The latitude change between this and the last stop is abnormally high! (%s degrees)" % str(
                                             round(float(row[c.COLUMN_LATITUDE]), 2) - prev_latitude))

                        prev_latitude = float(row[c.COLUMN_LATITUDE])
                    except ValueError:
                        self.printer("ERROR", index, "Latitude is not a valid type!")

                if row[c.COLUMN_LONGITUDE] == "":
                    self.printer("ERROR", index, "Longitude is missing!")
                else:
                    try:
                        float(row[c.COLUMN_LONGITUDE])
                        if abs(float(row[c.COLUMN_LONGITUDE]) - prev_longitude) > 100:
                            self.printer("WARNING", index,
                                         "The longitude change between this and the last stop is abnormally high! (%s degrees)" % str(
                                             round(float(row[c.COLUMN_LONGITUDE]), 2) - prev_longitude))

                        prev_longitude = float(row[c.COLUMN_LONGITUDE])
                    except ValueError:
                        self.printer("ERROR", index, "Longitude is not a valid type!")

                if row[c.COLUMN_POPULATION] == "":
                    self.printer("ERROR", index, "Population number is missing!")
                else:
                    try:
                        int(row[c.COLUMN_POPULATION])
                    except ValueError:
                        self.printer("ERROR", index, "Population number is not a valid type!")

                if row[c.COLUMN_POPULATIONYEAR] == "":
                    self.printer("ERROR", index, "Population year is missing!")
                else:
                    try:
                        int(row[c.COLUMN_POPULATIONYEAR])
                    except ValueError:
                        self.printer("ERROR", index, "Population year is not a valid type!")

                    if row[c.COLUMN_POPULATIONYEAR] == "0" and row[c.COLUMN_REGION] != "pt":
                        self.printer("WARNING", index,
                                     "Population year is 0. The tracker will not show population year for this stop.")

                if row[c.COLUMN_ELEVATION] == "":
                    self.printer("ERROR", index, "Elevation is missing!")
                else:
                    try:
                        int(row[c.COLUMN_ELEVATION])
                    except ValueError:
                        self.printer("ERROR", index, "Elevation is not a valid type!")

                if row[c.COLUMN_TIMEZONE] == "" and row[c.COLUMN_CITY] != self.configparser.get("COMPILER",
                                                                                                "basestop_cityname") and not self.configparser.getboolean(
                        "TZ", "use"):
                    self.printer("ERROR", index, "Timezone is missing and fetching TZ data is off!")

                if row[c.COLUMN_WIKIPEDIALINK] == "" and row[c.COLUMN_REGION] != "pt" and row[
                    c.COLUMN_CITY] != self.configparser.get("COMPILER", "basestop_cityname"):
                    self.printer("ERROR", index, "Wikipedia link missing!")

                if row[c.COLUMN_WIKIPEDIADESCR] == "" and row[c.COLUMN_REGION] != "pt" and row[
                    c.COLUMN_CITY] != self.configparser.get("COMPILER",
                                                            "basestop_cityname") and not self.configparser.getboolean(
                        "WIKIPEDIA", "use"):
                    self.printer("ERROR", index, "Wikipedia description is missing and fetching Wikipedia "
                                                 "descriptions is off!")

                index = index + 1

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
        from WeatherKitProvider import WeatherKitProvider
import requests.exceptions
import traceback

class TEBCCWeatherKitProvider(WeatherKitProvider):
    def __init__(self, configfile: str = "config.ini", keyfile: str = "auth.p8"):
        super().__init__(configfile, keyfile)

    def request_tebcc(self, lat: float, lng: float, time: int, dryrun: bool):
        if dryrun:
            return {
                "temperature": 20,
                "temperatureF": 70,
                "conditionCode": "Clear",
                "icon": "wi-night-clear"
            }

        
        wkd = super().request(lat=lat, lng=lng, currentasof=super().unix_to_iso8601(time))

        current_data = wkd.get_currently()
        return {
            "temperatureF": int(super().c_to_f(current_data['temperature'])),
            "icon": super().translateicon_wicons_class(current_data['conditionCode'], context="night"),
            "conditionCode": super().translatecondcode_humantext(current_data['conditionCode'], "uppercase"),
            "temperature": int(current_data['temperature'])
        }
    
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
            import requests
import errno
import signal
from functools import wraps
import os
import regex as re


# Base class for Wikipedia compilation

def timeout(seconds=10, error_message=os.strerror(errno.ETIME)):
    def decorator(func):
        def _handle_timeout(signum, frame):
            raise TimeoutError(error_message)

        def wrapper(*args, **kwargs):
            signal.signal(signal.SIGALRM, _handle_timeout)
            signal.setitimer(signal.ITIMER_REAL, seconds)  # used timer instead of alarm
            try:
                result = func(*args, **kwargs)
            finally:
                signal.alarm(0)
            return result

        return wraps(func)(wrapper)

    return decorator


class Wikipedia:
    def __init__(self, regex_timeout=1, fetch_timeout=10, sentences=4):
        self.regex_timeout = regex_timeout
        self.fetch_timeout = fetch_timeout
        self.sentences = sentences

        self.replacelist = [" (listen)", " [note 1]", " [note 2]", " [note 3]", " [note 4]",
                       " [note 5]", " [note 6]", " [note 7]", " [note 8]", " [note 9]",
                       " [note 10]", "[note 1]", "[note 2]", "[note 3]", "[note 4]",
                       "[note 5]", "[note 6]", "[note 7]", "[note 8]", "[note 9]", "[note 10]",
                       "[Note 1]", "[Note 2]", "[Note 3]", "[1]", "[2]", "[3]", "[4]", "[5]",
                       "[6]", "[7]", "[8]", "[9]", "[10]", "[11]", "[12]", "[13]", "[14]",
                       "[15]", "[16]", "[17]", "[18]", "[19]", "[20]", "[21]", "[22]", "[23]",
                       "[24]", "[25]", "[26]", "[27]", "[28]", "[29]", "[30]", "[a]", "[b]",
                       "[c]", "[d]", "[e]", "[f]", "[g]", "[h]", "[i]", "[j]", "[k]", "[l]",
                       "[m]", "[n]", "[o]", "[p]", "[q]", "[r]", "[s]", "[t]", "[u]", "[v]",
                       "[w]", "[x]", "[y]", "[z]", "[citation needed]", "listen"]

    def fetch(self, title):
        r = requests.get(
            f"https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles={title}&formatversion=2&exsentences={self.sentences}&exlimit=1&exintro=1&explaintext=1")
        r_json = r.json()
        try:
            return r_json['query']['pages'][0]['extract']
        except KeyError:
            print("Failed to query Wikipedia for this title.")
            return ""

    @timeout(2)
    def regex_parse(self, description):
        '''
        Specialized Regex parsing method due to the slim chances of regex timeouts
        :param description: Wikipedia description
        :return: (hopefully) regex'd filtered description
        '''
        regex_lookfor = [":", ";", "[", "]", "listen", "pronounced", "pronunciation", "( ", "ə"]
        try:
            matches = re.findall('\((?<=\()(?:[^()]*|\([^)]*\))*\)', description, timeout=1)
            try:
                for match in matches:
                    for lookfor in regex_lookfor:
                        if match.find(lookfor) != -1:
                            description = description.replace(match, "")
                            break
            except TypeError:
                print("Error with regex matches.")
        except TimeoutError:
            print("Regex failure for this city.")

        return description

    def general_parse(self, description):
        '''
        General get rid of crud in Wikipedia descriptions to make it look nicer method
        :param description: Wikipedia description
        :return: Filtered description
        '''
        # At some point we should have a dictionary that lists the key then value, then just start inline replacing it in a loop
        description = description.replace("\n", "")
        description = description.replace("(listen)", "listen")
        description = re.sub(r"([.])([A-Z])", r"\1 \2", description)
        description = description.replace("listen", "")
        description = description.replace("U. S.", "U.S.")
        description = description.replace("D. C.", "D.C.")
        description = description.replace("A. C.", "A.C.")
        description = description.replace("  ", " ")
        description = description.replace(" , ", ", ")
        description = description.replace(" . ", ". ")
        description = description.replace(" ", "")
        description = description.replace("()", "")
        description = description.replace("( )", "")
        description = description.replace(" .", ".")
        description = description.replace("  ", " ")
        description = description.replace(" ,", ",")
        description = description.replace("( ", "(")
        description = description.replace("(,", "(")

        for item in self.replacelist:
            description = description.replace(item, "")

        description = description.replace("km2", "km²")
        description = description.replace("km^2", "km²")
        description = description.replace("mi2", "mi²")
        description = description.replace("mi^2", "mi²")
        description = description.replace("square miles", "mi²")
        description = description.replace("square kilometers", "km²")
        description = description.replace("square kilometres", "km²")
        description = description.replace("sq mi", "mi²")

        if description.endswith(".") is False:
            description = description + "."
        description = description.replace(". .", ".")
        description = description.replace(" , ", ", ")
        description = description.replace("  ", " ")
        description = description.replace(" .", ".")
        if description == ".":
            description = ""

        description = description.replace("..", ".")
        return description
    from Compiler import Compiler
import sys

compiler = Compiler(tsv_infile="route.tsv", tsv_outfile="route_compiled.tsv", json_outfile="route.json",
                    configfile="config.ini")
compiler.validator()
print(f"{compiler.warnings} warnings and {compiler.errors} errors were detected during validation checks.")
if compiler.errors == 0:
    print("If you are not aware of any warnings listed, please stop compilation and fix them.")
    print("Otherwise, compilation will continue.")
    compiler.compiler()
else:
    print("Due to errors found in the data, compilation cannot proceed. Please fix the errors and retry compilation.")
    sys.exit(1)
    # List of column number constants to be used across the compiler.
COLUMN_DRINTERNAL = 0
COLUMN_UNIXARRIVAL_ARRIVAL = 1
COLUMN_UNIXARRIVAL = 2
COLUMN_UNIXDEPARTURE = 3
COLUMN_PRETTYARRIVAL = 4
COLUMN_CITY = 5
COLUMN_REGION = 6
COLUMN_COUNTRYCODE = 7
COLUMN_LOCALE = 8
COLUMN_GIFTSDELIVERED = 9
COLUMN_COOKIESEATEN = 10
COLUMN_STOCKINGSSTUFFED = 11
COLUMN_MILKDRANK = 12
COLUMN_CARROTSEATEN = 13
COLUMN_LATITUDE = 14
COLUMN_LONGITUDE = 15
COLUMN_POPULATION = 16
COLUMN_POPULATIONYEAR = 17
COLUMN_ELEVATION = 19
COLUMN_ARRIVALSTOPPAGE = 19
COLUMN_TIMEZONE = 20
COLUMN_WIKIPEDIALINK = 21
COLUMN_WIKIPEDIADESCR = 22
import requests
import os
import sys
import tarfile
print("Updating Geo API MaxMind database...")

# Make sure you put your license key in this file for it to work right.
license_key = ""
postDBdate_key = ""

if license_key == "":
    print("!! FAIL !!")
    print("A license key was not specified for MaxMind. Please specify a license key before running this script.")
    sys.exit(1)

if postDBdate_key == "":
    print("!! FAIL !!")
    print("A post DB date endpoint key was not specified. Please specify a key before running this script.")
    sys.exit(1)

r = requests.head(f"https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key={license_key}suffix=tar.gz")
content_disp = str(r.headers['content-disposition'])
filename = content_disp.split("filename=")[1]
# And here begins the truly, truly, truly most stupid way to update the file.
content_disp_split = content_disp.split("_")
content_disp_split = content_disp_split[1].split(".")[0]
# And now we convert it to an int...
geoapi_current_date = int(content_disp_split)
print(f"MaxMind is reporting the latest GeoCity2 database date is {geoapi_current_date}")
print("Checking version on our servers...")
# Now let's get the remote version...
# Make sure you update the URL here with your correct URL.
r2 = requests.get("https://geoapi.owenthe.dev/api/v1/getDBdate")
remote_date = int(r2.text)
print(f"The DB version on our servers is {remote_date}")

if not remote_date < geoapi_current_date:
    print("MaxMind does not need updating.")
    os.system('echo "MAXMIND_UPLOAD_RUN=false" >> update.env')
    sys.exit()

print("MaxMind does need updating.")
print("Fetching .tar.gz file...")
r = requests.get(f"https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key={license_key}&suffix=tar.gz")
print("Dumping to filesystem...")
with open(filename, "wb") as f:
    f.write(r.content)
print("Unzipping file...")
gc2tar = tarfile.open(filename)
gc2tar.extract(f"{filename.split('.')[0]}/GeoLite2-City.mmdb", "./")
os.rename(f"./{filename.split('.')[0]}/GeoLite2-City.mmdb", "./GeoLite2-City.mmdb")
print("Informing server of new database date...")
r = requests.post(f"https://geoapi.easterbunny.cc/api/v1/postDBdate?dbdate={str(geoapi_current_date)}&key={postDBdate_key}")
print(r.text)
print("Setting variables for MaxMind Upload stage to run...")
os.system('echo "MAXMIND_UPLOAD_RUN=true" >> update.env')
print("Done!")