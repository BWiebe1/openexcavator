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

    @staticmethod
    def parse_data(data):
        """
        Parse GPS/IMU data and and return it; to be implemented by inheriting classes
        :param data: NMEA/IMU sentences (as received over TCP or serial connection for example)
        :returns: data dict
        """
        return {}

    def run(self):
        self.running = True
        buffer = ""
        while self.running:
            try:
                if not self.connection:
                    self.connection = socket.create_connection((self.host, self.port), 3)
                    self.connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
                data = self.connection.recv(self.conn_buf)
                if not data:
                    raise Exception("no data received on socket for 3 seconds")
                buffer += data.decode()  # bytes to str
                marker = buffer.rfind(self.message_delimiter)
                if marker > -1:
                    if len(buffer) > 4096:  # do not process large buffers
                        message = buffer[marker:]
                    else:
                        message = buffer
                    logging.debug("parsing chunk [%d:%d] (length %d) from buffer on port %d",
                                  marker, len(buffer), len(message), self.port)
                    data = self.parse_data(message)
                    self.queue.append(data)
                    buffer = ""
                elif len(buffer) > self.tcp_buf_len:
                    logging.warning("no valid GNRMC/IMU data received from %s:%s, clearing buffer",
                                    self.host, self.port)
                    buffer = ""
                    self.queue.append({})
            except Exception as exc:
                logging.error("cannot update data: %s, reconnecting to %s:%s", exc,
                              self.host, self.port)
                self.connection = None
                self.queue.append({})
                time.sleep(3)
            time.sleep(0.02)

    def disconnect_source(self):
        """
        Close TCP stream (used for fixing delay issues)
        """
        self.connection = None

    def stop(self):
        """Set property to stop thread"""
        self.running = False
