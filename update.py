# This script checks if we need to update MaxMind. I am so sorry about how disgusting this script is.
import requests
import os
import sys
import tarfile

print("Updating Geo API MaxMind database...")
r = requests.head("https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=&suffix=tar.gz")
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
r2 = requests.get("https://geoapi.owenthe.dev/api/v1/getDBdate")
remote_date = int(r2.text)
print(f"The DB version on our servers is {remote_date}")

if not remote_date < geoapi_current_date:
    print("MaxMind does not need updating.")
    os.system('echo "MAXMIND_UPLOAD_RUN=false" >> update.env')
    sys.exit()

print("MaxMind does need updating.")
print("Fetching .tar.gz file...")
r = requests.get("https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=&suffix=tar.gz")

print("Dumping to filesystem...")
with open(filename, "wb") as f:
    f.write(r.content)

print("Unzipping file...")
gc2tar = tarfile.open(filename)
gc2tar.extract(f"{filename.split('.')[0]}/GeoLite2-City.mmdb", "./")
os.rename(f"./{filename.split('.')[0]}/GeoLite2-City.mmdb", "./GeoLite2-City.mmdb")

print("Informing server of new database date...")
r = requests.post(f"https://geoapi.easterbunnylive.net/api/v1/postDBdate?dbdate={str(geoapi_current_date)}&key=")
print(r.text)
print("Setting variables for MaxMind Upload stage to run...")
os.system('echo "MAXMIND_UPLOAD_RUN=true" >> update.env')
print("Done!")
