"""
Created on Jul 24, 2018

@author: ionut
"""

import json
import logging
import math
import random
import socket
import sys
import threading
import time

sys.path.append(".")
import RTIMU


class DummyDataServer(threading.Thread):
    """
    Dummy data server thread implementation to be used in TCP server for tests
    """


    def __init__(self):
        super(DummyDataServer, self).__init__()
        self.poll_interval = 4
        self.daemon = True
        self.data = None


    def run(self):
        while True:
            roll = random.uniform(-90, 90)
            pitch = random.uniform(-90, 90)
            yaw = random.uniform(0, 360)
            self.data = {"r": roll, "p": pitch, "y": yaw}
            time.sleep(self.poll_interval / 1000.0) #ms to seconds


    def get_data(self):
        """
        Return IMU data (r, p, y)
        :return: r,p,y
        """
        return self.data


class RTIMUServer(threading.Thread):
    """
    RTIMU thread implementation to be used in TCP server
    see https://github.com/87yj/EmlidIMU/blob/master/Reach IMU setup.pdf to get RTIMU running
    """


    def __init__(self, settings_file):
        super(RTIMUServer, self).__init__()
        self.settings_file = settings_file
        self.poll_interval = 4
        self.imu = None
        self.daemon = True
        self.data = None


    def setup_imu(self):
        """
        Create RTIMU instance to retrieve sensor data
        """
        stgs = RTIMU.Settings(self.settings_file)
        self.imu = RTIMU.RTIMU(stgs)
        logging.info("created IMU object: %s", self.imu.IMUName())
        self.imu.setSlerpPower(0.02)
        self.imu.setGyroEnable(True)
        self.imu.setAccelEnable(True)
        self.imu.setCompassEnable(True)
        self.poll_interval = self.imu.IMUGetPollInterval()
        logging.info("recommended poll interval: %d ms", self.poll_interval)
        if not self.imu.IMUInit():
            logging.error("IMU Init Failed")
            sys.exit(1)


    def run(self):
        self.setup_imu()
        while True:
            if self.imu.IMURead():
                # x, y, z = imu.getFusionData()
                # print("%f %f %f" % (x,y,z))
                data = self.imu.getIMUData()
                fusion_pose = data["fusionPose"]
                self.data = {"r": math.degrees(fusion_pose[0]), "p": math.degrees(fusion_pose[1]),
                             "y": math.degrees(fusion_pose[0])}
                time.sleep(self.poll_interval / 1000.0) #ms to seconds
            logging.warning("no IMU data available")
            time.sleep(1)


    def get_data(self):
        """
        Return IMU data (r, p, y)
        :return: r,p,y
        """
        return self.data


class IMUServer():
    """
    IMU TCP server implementation to stream IMU data from Reach
    """


    def __init__(self, host, port):
        self.host = host
        self.port = port
        #self.rtimu = DummyDataServer() #enable for tests
        self.rtimu = RTIMUServer("RTIMULib")
        self.rtimu.start()
        self.clients = {}
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
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
                data = self.rtimu.get_data()
                data = json.dumps(data) + "\n"
                client.send(data.encode())
            except Exception as exc:
                logging.warning("cannot stream IMU data to %s: %s", address, exc)
                client.close()
                self.clients.pop(address, None)
                return False
            time.sleep(0.1)


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG, datefmt="%Y-%m-%d %H:%M:%S",
                        format="[%(asctime)s] - %(levelname)s - %(message)s")
    logging.info("starting IMUServer listener")
    IMUServer("0.0.0.0", 7000).listen()
