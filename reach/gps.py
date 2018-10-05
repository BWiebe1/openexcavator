"""
Created on Jul 24, 2018

@author: ionut
"""

import logging
import datetime
from reach.base import Reach


class ReachGPS(Reach):
    """
    GPS client implementation for Reach
    """


    def __init__(self, host, port):
        Reach.__init__(self, host, port, message_delimiter="\n$GNRMC")
        self.conn_buf = 4096
        self.tcp_buf_len = 64000


    @staticmethod
    def parse_coordinate(coord, hemi):
        """
        Parse ddmm.mmmm coordinate into dd.ddddd format
        :param coord: ddmm.mmmm coordinate data
        :param hemi: hemisphere data E,W,N or S
        :returns dd.ddddd coordinate
        """
        dot_position = coord.find(".")
        degrees = coord[:dot_position-2]
        minutes = coord[dot_position-2:]
        degrees = float(degrees) + float(minutes) / 60.0
        if hemi in ["S", "W"]:
            degrees = degrees * -1
        return degrees


    def parse_data(self, data):
        sentences = data.split("\n")
        position = {}
        for sentence in sentences:
            if sentence.startswith("$GNRMC"):
                parts = sentence.split(",")
                if parts[2] != "A":
                    logging.warning("invalid GNRMC data: %s", sentence)
                    continue
                position["ts"] = datetime.datetime.strptime(parts[9]+parts[1], "%d%m%y%H%M%S.%f")
                position["ts"] = position["ts"].replace(tzinfo=datetime.timezone.utc)
                position["lat"] = self.parse_coordinate(parts[3], parts[4])
                position["lng"] = self.parse_coordinate(parts[5], parts[6])
                position["speed"] = float(parts[7]) * 1.852 #knots to km/h
                #position["heading"] = float(parts[8]) #0-360
            elif sentence.startswith("$GNGST"):
                parts = sentence.split(",")
                position["acc"] = max(float(parts[6]), float(parts[7])) #meters
            elif sentence.startswith("$GNGGA"):
                parts = sentence.split(",")
                position["alt"] = float(parts[9]) + float(parts[11])#meters
                position["fix"] = float(parts[6])
        return position
