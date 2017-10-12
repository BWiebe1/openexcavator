'''
Created on Oct 11, 2017

@author: ionut
'''

import datetime
import logging
import socket
import threading
import time


class Reach(threading.Thread):
    """TCP client implementation for Reach GPS receiver"""


    def __init__(self, host, port):
        super(Reach, self).__init__()
        self.host = host
        self.port = port
        self.connection = None
        self.daemon = True
        self.running = False
        self._position = None

    def parse_coordinate(self, coord, hemi):
        """
        Parse ddmm.mmmm coordinate into dd.ddddd format
        :param coord: ddmm.mmmm coordinate data
        :param hemi: hemisphere data E,W,N or S
        :returns dd.ddddd coordinate
        """
        dot_position = coord.find('.')
        degrees = coord[:dot_position-2]
        minutes = coord[dot_position-2:]
        degrees = float(degrees) + float(minutes) / 60.0
        if hemi == 'S' or hemi == 'W':
            degrees = degrees * -1
        return degrees


    def parse_nmea(self, data):
        """
        Parse NMEA data and and return position dict with ts, lat and lng
        :param data: NMEA sentences (as received over TCP or serial connection for example)
        :returns: position dict with ts, lat and lng
        """
        sentences = data.split('\n')
        position = {}
        for sentence in sentences:
            if not sentence.startswith('$GPRMC'):
                continue
            #if not sentence.startswith('$GPGSV'): TODO: use
            #    continue
            parts = sentence.split(',')
            if parts[2] != 'A':
                logging.warning('invalid GPRMC data: %s', sentence)
                continue
            position['ts'] = datetime.datetime.strptime(parts[9]+parts[1][:6], '%d%m%y%H%M%S')
            position['lat'] = self.parse_coordinate(parts[3], parts[4])
            position['lng'] = self.parse_coordinate(parts[5], parts[6])
        return position


    def run(self):
        self.running = True
        while self.running:
            try:
                if not self.connection:
                    self.connection = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    self.connection.connect((self.host, self.port))
                data = self.connection.recv(1024)
                position = self.parse_nmea(data.decode())
                if position:
                    self._position = position
            except Exception as exc:
                logging.warning('cannot update position data: %s, reconnecting', exc)
                self.connection = None
            time.sleep(0.1)


    def get_position(self):
        """
        Return current position data
        :returns: schedules list
        """
        return self._position


    def stop(self):
        """Set property to stop thread"""
        self.running = False
