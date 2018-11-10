"""
Created on Jul 24, 2018

@author: ionut
"""

import logging
import socket
import threading
import time


class IMUServer:
    """
    IMU TCP server implementation to stream IMU data from Reach
    """

    def __init__(self, host, port):
        self.host = host
        self.port = port
        # self.rtimu = DummyDataServer() #enable for tests
        self.clients = {}
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        self.sock.bind((self.host, self.port))

    def listen(self):
        """
        Listen for client connections and create new thread
        """
        self.sock.listen(2)
        while True:
            client, address = self.sock.accept()
            if len(self.clients) > 4:
                logging.warning("rejecting new connection from %s", address)
                client.close()
                continue
            logging.info("new connection from %s", address)
            self.clients[address] = client
            client.settimeout(60)
            threading.Thread(target=self.handle_client, args=(client, address)).start()

    def handle_client(self, client, address):
        """
        Retrieve IMU data from RTIMU and stream it to client
        :param client: client socket object
        :param address: client address (host:port)
        """
        while True:
            try:
                input_file = open("/tmp/imu", "r")
                data = input_file.read()
                input_file.close()
                client.send(data.encode())
            except Exception as exc:
                logging.warning("cannot stream IMU data to %s: %s", address, exc)
                client.close()
                self.clients.pop(address, None)
                return False
            time.sleep(0.2)


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG, datefmt="%Y-%m-%d %H:%M:%S",
                        format="[%(asctime)s] - %(levelname)s - %(message)s")
    logging.info("starting IMUServer listener")
    IMUServer("0.0.0.0", 7000).listen()
