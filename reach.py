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
            if sentence.startswith('$GPRMC'):
                parts = sentence.split(',')
                if parts[2] != 'A':
                    logging.warning('invalid GPRMC data: %s', sentence)
                    continue
                position['ts'] = datetime.datetime.strptime(parts[9]+parts[1][:6], '%d%m%y%H%M%S')
                position['lat'] = self.parse_coordinate(parts[3], parts[4])
                position['lng'] = self.parse_coordinate(parts[5], parts[6])
                position['speed'] = float(parts[7]) * 1.852 #knots to km/h
                position['heading'] = float(parts[8]) #0-360
            elif sentence.startswith('$GPGST'):
                parts = sentence.split(',')
                position['acc'] = max(float(parts[6]), float(parts[7])) #meters
            elif sentence.startswith('$GPGGA'):
                parts = sentence.split(',')
                position['alt'] = float(parts[9]) + float(parts[11])#meters
                position['fix'] = float(parts[6])
        return position


    def run(self):
        self.running = True
        buffer = ''
        while self.running:
            try:
                if not self.connection:
                    self.connection = socket.create_connection((self.host, self.port), 3)
                data = self.connection.recv(256)
                if not data:
                    raise Exception('no data received on socket for 3 seconds')
                buffer += data.decode() #bytes to str
                marker = buffer.find('\n$GPRMC')
                if marker > -1:
                    message = buffer[:marker+1]
                    buffer = buffer[marker+1:]
                    self._position = None
                    position = self.parse_nmea(message)
                    self._position = position
                elif len(buffer) > 64000:
                    logging.warning('no valid GPRMC data received, clearing buffer')
                    self._position = None
                    buffer = ''
            except Exception as exc:
                logging.warning('cannot update position data: %s, reconnecting', exc)
                self.connection = None
                time.sleep(3)
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
