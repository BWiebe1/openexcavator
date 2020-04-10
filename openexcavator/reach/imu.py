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

    def __init__(self, host, port, queue):
        Reach.__init__(self, host, port, queue, message_delimiter="\n{")
        self.conn_buf = 512
        self.tcp_buf_len = 16000

    @staticmethod
    def parse_data(data):
        sentences = data.split("\n")
        data = {}
        for sentence in sentences:
            try:
                imu_data = json.loads(sentence.strip())
            except ValueError:
                continue
            data["roll"] = imu_data["r"]
            data["pitch"] = imu_data["p"]
            data["yaw"] = imu_data["y"]
            data["imu_time"] = imu_data["t"]

        return data
