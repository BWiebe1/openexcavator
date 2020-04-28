"""
Created on Apr 15, 2019

@author: ionut
"""

import logging
import threading
import time
import utm
from collections import deque

from reach.gps import ReachGPS
from reach.imu import ReachIMU
from rotate import get_new_position_rpy


class DataManager(threading.Thread):
    """Collect GPS and IMU data and merge it with offset position calculation"""

    def __init__(self, config, data_queue):
        super().__init__()
        self.config = config
        self.gps_queue = deque(maxlen=1)
        self.gps_client = ReachGPS(config["gps_host"], int(config["gps_port"]), self.gps_queue)
        self.gps_client.start()
        self.imu_queue = deque(maxlen=1)
        self.imu_client = ReachIMU(config["imu_host"], int(config["imu_port"]), self.imu_queue)
        self.imu_client.start()
        self.data_queue = data_queue
        self.utm_zone = {"num": None, "letter": None}
        self.antenna_height = float(self.config["antenna_height"])
        self.running = False
        self.daemon = True

    def run(self):
        self.running = True
        while self.running:
            data = {"utm_zone": self.utm_zone}
            try:
                data.update(self.gps_queue[-1])
                data.update(self.imu_queue[-1])
                if "lat" in data and "lng" in data:
                    if not self.utm_zone["num"]:
                        aux = utm.from_latlon(data["lat"], data["lng"])
                        self.utm_zone["num"] = aux[2]
                        self.utm_zone["letter"] = aux[3]
                    if "roll" in data and "pitch" in data and "yaw" in data:
                        aux = get_new_position_rpy(data["lng"], data["lat"], data["alt"], self.antenna_height,
                                                   data["roll"], data["pitch"], data["yaw"], self.utm_zone)
                        data.update({
                            "_lng": data["lng"],
                            "_lat": data["lat"],
                            "_alt": data["alt"]
                        })
                        data.update({
                            "lng": aux[0],
                            "lat": aux[1],
                            "alt": aux[2]
                        })
                self.data_queue.append(data)
            except (ValueError, IndexError) as exc:
                data["err"] = "%s" % exc
                time.sleep(1)
                continue
            # check inter-thread latency
            if "ts" in data and "imu_time" in data:
                try:
                    delta = data["ts"].timestamp() - data["imu_time"]
                    data["delta"] = delta
                    if delta > 0.5:
                        logging.info("stopping IMU thread due to latency %s", delta)
                        self.imu_client.disconnect_source()
                        time.sleep(1)
                    elif delta < -0.5:  # 500 ms
                        logging.info("stopping GPS thread due to latency %s", delta)
                        self.gps_client.disconnect_source()
                        time.sleep(1)

                except Exception as exc:
                    logging.warning("cannot determine inter-thread latency: %s", exc)
                    self.gps_client.disconnect_source()
                    self.imu_client.disconnect_source()
                    time.sleep(2)
            time.sleep(0.01)

    def stop(self):
        """Set property to stop thread"""
        self.running = False
