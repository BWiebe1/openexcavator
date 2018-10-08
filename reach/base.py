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


    def __init__(self, host, port, queue, message_delimiter=""):
        super().__init__()
        self.host = host
        self.port = port
        self.queue = queue
        self.message_delimiter = message_delimiter
        self.connection = None
        self.daemon = True
        self.running = False
        self.conn_buf = 1024
        self.tcp_buf_len = 16000


    def parse_data(self, data):
        """
        Parse GPS/IMU data and and return it; to be implemented by inheriting classes
        :param data: NMEA/IMU sentences (as received over TCP or serial connection for example)
        :returns: data dict
        """


    def run(self):
        self.running = True
        buffer = ""
        connect_time = time.time()
        while self.running:
            if time.time() - connect_time >= 1800:
                connect_time = time.time()
                logging.info("reconnecting to %s:%s due to connection age", self.host, self.port)
                self.connection = None
            try:
                if not self.connection:
                    self.connection = socket.create_connection((self.host, self.port), 3)
                    self.connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
                data = self.connection.recv(self.conn_buf)
                if not data:
                    raise Exception("no data received on socket for 3 seconds")
                buffer += data.decode() #bytes to str
                marker = buffer.find(self.message_delimiter)
                if marker > -1:
                    message = buffer[:marker+1]
                    buffer = buffer[marker+1:]
                    data = self.parse_data(message)
                    self.queue.append(data)
                elif len(buffer) > self.tcp_buf_len:
                    logging.warning("no valid GNRMC/IMU data received from %s:%s, clearing buffer",
                                    self.host, self.port)
                    buffer = ""
            except Exception as exc:
                logging.error("cannot update data: %s, reconnecting to %s:%s", exc,
                              self.host, self.port)
                self.connection = None
                time.sleep(3)
            time.sleep(0.05)


    def stop(self):
        """Set property to stop thread"""
        self.running = False
