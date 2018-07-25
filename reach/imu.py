"""
Created on Jul 24, 2018

@author: ionut
"""

import json
from reach.base import Reach


class ReachIMU(Reach):
    """
    IMU client implementation for Reach
    """


    def __init__(self, host, port):
        Reach.__init__(self, host, port, message_delimiter="\n")
        self.conn_buf = 1024
        self.tcp_buf_len = 16000


    def parse_data(self, data):
        sentences = data.strip().split("\n")
        data = {}
        if sentences:
            sentence = sentences[-1] #use most recent data
            imu_data = json.loads(sentence)
            data["roll"] = imu_data["r"]
            data["pitch"] = imu_data["p"]
            data["yaw"] = imu_data["y"]
            data["imu_time"] = imu_data["t"]
        return data
