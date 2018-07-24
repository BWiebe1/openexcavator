"""
Created on Jul 24, 2018

@author: ionut
"""

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
        sentences = data.split("\n")
        data = {}
        if sentences:
            sentence = sentences[-1] #use most recent data
            parts = sentence.split(",")
            data["roll"] = float(parts[0])
            data["pitch"] = float(parts[1])
            data["yaw"] = float(parts[2])
        return data
