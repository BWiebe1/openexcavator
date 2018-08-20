"""
Created on Jul 24, 2018

@author: ionut
"""

import logging
import socket
import threading
import time


class Reach(threading.Thread):
    """TCP client implementation for Reach GPS & IMU data receiver"""


    def __init__(self, host, port, message_delimiter=""):
        super().__init__()
        self.host = host
        self.port = port
        self.message_delimiter = message_delimiter
        self.connection = None
        self.daemon = True
        self.running = False
        self.conn_buf = 1024
        self.tcp_buf_len = 16000
        self._data = None


    def parse_data(self, data):
        """
        Parse GPS/IMU data and and return it; to be implemented by inheriting classes
        :param data: NMEA/IMU sentences (as received over TCP or serial connection for example)
        :returns: data dict
        """


    def run(self):
        self.running = True
        buffer = ""
        while self.running:
            try:
                if not self.connection:
                    self.connection = socket.create_connection((self.host, self.port), 3)
                data = self.connection.recv(self.conn_buf)
                if not data:
                    raise Exception("no data received on socket for 3 seconds")
                buffer += data.decode() #bytes to str
                marker = buffer.find(self.message_delimiter)
                if marker > -1:
                    message = buffer[:marker+1]
                    buffer = buffer[marker+1:]
                    self._data = None
                    data = self.parse_data(message)
                    self._data = data
                elif len(buffer) > self.tcp_buf_len:
                    logging.warning("no valid GNRMC/IMU data received from %s:%s, clearing buffer",
                                    self.host, self.port)
                    self._data = None
                    buffer = ""
            except Exception as exc:
                logging.error("cannot update data: %s, reconnecting to %s:%s", exc,
                              self.host, self.port)
                self.connection = None
                time.sleep(3)
            time.sleep(0.05)


    def get_data(self):
        """
        Return current stored data
        :returns: schedules list
        """
        return self._data


    def stop(self):
        """Set property to stop thread"""
        self.running = False
