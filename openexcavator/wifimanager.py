"""
Created on Jan 08, 2019

@author: ionut
"""

import logging
import threading
import time

import subprocess


class WifiManager(threading.Thread):
    """WifiManager class to control wifi (client or hotspot mode)"""

    def __init__(self, network_name, psk):
        super().__init__()
        self.network_name = network_name
        self.psk = psk
        self.mode = None
        self.connected_network = None
        self.network = {
            "security": "wpa2psk", "ssid": self.network_name,
            "password": self.psk, "identity": ""
        }
        self.daemon = True

    def write_wpa_supplicant_config(self):
        buffer = """
        ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
        update_config=1
        network={
            ssid="%s"
            psk="%s"
        }
        """
        output_file = open("/etc/wpa_supplicant/wpa_supplicant.conf", "w")
        output_file.write(buffer % (self.network_name, self.psk))
        output_file.close()

    def run(self):
        start_time = time.time()
        logging.info("stopping existing hostapd/wpa_supplicant processes")
        self.stop_hostapd()
        self.stop_wpa_supplicant()
        logging.info("overwriting wpa_supplicant config file")
        self.write_wpa_supplicant_config()
        logging.info("enabling wifi client mode")
        self.enable_client_mode()
        while True:
            now = time.time()
            try:
                time.sleep(4)
                self.mode, self.connected_network = self.get_status()
                if self.connected_network:
                    continue
                if not self.network_name:
                    logging.info("wifi network not defined, enabling hotspot")
                    self.enable_hotspot_mode()
                    time.sleep(6)
                elif now - start_time > 90:
                    logging.info("wifi network not connected after timeout, enabling hotspot")
                    self.enable_hotspot_mode()
                    time.sleep(6)
            except Exception as exc:
                logging.error("cannot run wifi check: %s", exc, exc_info=True)
                time.sleep(8)

    @staticmethod
    def start_wpa_supplicant():
        """
        Try to start wpa_supplicant
        :return: True or False depending on status
        """
        try:
            subprocess.call(["wpa_supplicant", "-Dnl80211", "-iwlan0", "-B",
                            "-c", "/etc/wpa_supplicant/wpa_supplicant.conf"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except subprocess.CalledProcessError as exc:
            logging.error("cannot start wpa_supplicant: %s", exc)
            return False
        return True

    @staticmethod
    def start_hostapd():
        """
        Try to start hostapd
        :return: True or False depending on status
        """
        try:
            subprocess.call(["hostapd", "/etc/hostapd/hostapd.conf"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except subprocess.CalledProcessError as exc:
            logging.error("cannot start hostapd: %s", exc)
            return False
        return True

    @staticmethod
    def stop_wpa_supplicant():
        """
        Try to stop wpa_supplicant
        :return: True or False depending on status
        """
        try:
            subprocess.call(["wpa_cli", "terminate"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except subprocess.CalledProcessError as exc:
            logging.error("cannot stop wpa_supplicant process: %s", exc)
            return False
        return True

    @staticmethod
    def stop_hostapd():
        try:
            subprocess.call(["pkill", "stop_hostapd"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except subprocess.CalledProcessError as exc:
            logging.error("cannot stop hostapd process: %s", exc)
            return False
        return True

    def enable_hotspot_mode(self):
        """
        Enable the hotspot mode for Wifi adapter
        """
        self.stop_wpa_supplicant()
        self.start_hostapd()

    def enable_client_mode(self):
        """
        Enable the client mode for Wifi adapter
        """
        self.stop_hostapd()
        self.start_wpa_supplicant()

    @staticmethod
    def get_status():
        """
        Return current status for the Wifi connection
        :return: mode (hotspot or client), connected_network (wifi ssid)
        """
        mode = None
        cmd = ["iwgetid", "wlan0", "-m"]
        output = ""
        try:
            output = subprocess.check_output(cmd, stderr=subprocess.DEVNULL)
            output = output.decode().lower()
            if "master" in output:
                mode = "hotspot"
            elif "managed" in output:
                mode = "client"
        except subprocess.CalledProcessError as exc:
            logging.warning("cannot retrieve wifi mode: %s", exc)
        connected_network = None
        cmd = ["iwgetid", "wlan0", "-r"]
        try:
            output = subprocess.check_output(cmd, stderr=subprocess.STDOUT)
            connected_network = output.decode().strip()
        except subprocess.CalledProcessError as exc:
            if mode == "client":
                logging.warning("cannot retrieve wifi mode:%s, output: %s", exc, output)
        logging.debug("wifi mode %s, connected_network %s", mode, connected_network)
        return mode, connected_network
