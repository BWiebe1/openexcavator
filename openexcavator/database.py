"""
Created on Oct 19, 2017

@author: ionut
"""

import sqlite3


def get_config():
    """Return dict of key-value from config table"""
    conn = sqlite3.connect("openexcavator.db")
    cursor = conn.cursor()
    cursor.execute("SELECT key,value FROM config")
    config = {}
    rows = cursor.fetchall()
    for row in rows:
        config[row[0]] = row[1]
    conn.close()
    return config


def set_config(data):
    """
    Store configuration using key-value pairs in config table
    :param data: dict of key-value pairs
    """
    conn = sqlite3.connect("openexcavator.db")
    cursor = conn.cursor()
    config = get_config()
    for key, value in config.items():
        if data[key] is None:
            continue
        if str(value) != str(data[key]):
            cursor.execute("UPDATE config SET value=? WHERE key=?", (data[key], key))
            conn.commit()
    conn.close()


def create_structure():
    """Create database and config table if it does not exist"""
    conn = sqlite3.connect("openexcavator.db")
    cursor = conn.cursor()
    cursor.execute("""CREATE TABLE IF NOT EXISTS config(id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT, value TEXT,CONSTRAINT config_unique_key UNIQUE(key))""")
    conn.commit()
    conn.close()


def populate_config():
    """Populate configuration table with default values"""
    conn = sqlite3.connect("openexcavator.db")
    query = "INSERT INTO config(key, value) VALUES(?, ?)"
    data = [
        ("wifi_ssid", ""),
        ("wifi_psk", ""),
        ("gps_host", "127.0.0.1"),
        ("gps_port", "9000"),
        ("imu_host", "127.0.0.1"),
        ("imu_port", "7000"),
        ("start_altitude", "700"),
        ("stop_altitude", "800"),
        ("antenna_height", "10"),
        ("safety_depth", "690"),
        ("safety_height", "810"),
        ("output_port", "3000"),
        ("path", """{
            "type": "FeatureCollection",
            "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
                                                                                            
            "features": [
            { "type": "Feature", "properties": { "antenna height": 2.000000, "lateral rms": 0.003500, "name": "Point SW", "projected mean": "-112.703825456 52.3176660209 799.042152941", "rms": "0.00126915901344 0.0032847809571 0.00523463521128", "sample count": 17.000000, "solution status": "FLOAT" }, "geometry": { "type": "Point", "coordinates": [ -112.704198, 52.317718, 799.042152941176596 ] } },
            { "type": "Feature", "properties": { "antenna height": 2.000000, "lateral rms": 0.000100, "name": "Point 2", "projected mean": "-112.703831819 52.3176664518 799.3206125", "rms": "0.000142642689639 -3.20164952526e-11 0.000164207555928", "sample count": 8.000000, "solution status": "FIX" }, "geometry": { "type": "Point", "coordinates": [ -112.703082, 52.317827, 799.320612499999925 ] } }
            ]
            }""")
    ]
    cursor = conn.cursor()
    for item in data:
        try:
            cursor.execute(query, item)
            conn.commit()
        except sqlite3.IntegrityError as exc:
            print("cannot insert items %s: %s" % (item[0], exc))
    conn.close()


if __name__ == "__main__":
    create_structure()
    populate_config()
