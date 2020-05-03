"""
Created on Aug 28, 2017

@author: ionut
"""

import json
import logging
import subprocess

from tornado.web import RequestHandler
from tornado.websocket import WebSocketHandler

from tornado.escape import url_escape

import utils


class BaseHandler(RequestHandler):
    """
    Base handler returning 400 for both GET and POST
    other handlers will inherit this and implement the requests
    """

    def get(self):
        self.set_status(400)
        self.finish("GET not allowed")

    def post(self):
        self.set_status(400)
        self.finish("POST not allowed")


class HomeHandler(BaseHandler):
    """
    Handler for / request, renders home.html
    """

    def get(self):
        config = self.application.database.get_config()
        error_msg = self.get_argument("error_msg", "")
        self.render("home.html", config=config, error_msg=error_msg)


class DebugHandler(BaseHandler):
    """
    Handler for / request, renders debug.html
    """

    def get(self):
        config = self.application.database.get_config()
        self.render("debug.html", config=config)


class DataHandler(WebSocketHandler):
    """
    Handler for async /data request.
    Get the data from the data (GPS, IMU)threads and write it to the WS clients
    """

    def open(self):
        logging.info("new ws client: %s", self)

    def on_close(self):
        logging.info("closing ws client: %s", self)

    def on_message(self, message):
        if message != "!":
            return logging.warning("unexpected message %s from %s", message, self)
        data = {}
        if self.application.data_queue:
            data.update(self.application.data_queue[-1])
        message = json.dumps(data, default=utils.json_encoder)
        self.write_message(message, binary=False)


class ToolsHandler(BaseHandler):
    """
    Handler for /tools request, renders tools.html
    """

    def get(self):
        config = self.application.database.get_config()
        self.render("tools.html", config=config)


class UpdateHandler(BaseHandler):
    """
    Handler for updating config data.
    """

    def post(self):
        action = self.get_argument("action", "").lower()
        if action == "restart":
            try:
                logging.info("systemctl action %s openexcavator", action)
                subprocess.check_output(["systemctl", action, "openexcavator"],
                                        stderr=subprocess.STDOUT)
            except Exception as exc:
                logging.warning("systemctl: %s", exc)
            return self.render("restart.html", error_message=None)
        data = {
            "wifi_ssid": self.get_argument("wifi_ssid", None),
            "wifi_psk": self.get_argument("wifi_psk", None),
            "gps_host": self.get_argument("gps_host", None),
            "gps_port": self.get_argument("gps_port", None),
            "imu_host": self.get_argument("imu_host", None),
            "imu_port": self.get_argument("imu_port", None),
            "start_altitude": self.get_argument("start_altitude", None),
            "stop_altitude": self.get_argument("stop_altitude", None),
            "antenna_height": self.get_argument("antenna_height", None),
            "safety_depth": self.get_argument("safety_depth", None),
            "safety_height": self.get_argument("safety_height", None),
            "output_port": self.get_argument("output_port", None),
            "path": None
        }
        if self.request.files:
            file_info = self.request.files["path"][0]
            data["path"] = file_info["body"]
        error_msg = None
        try:
            data["gps_port"] = int(data["gps_port"])
            data["imu_port"] = int(data["imu_port"])
            data["start_altitude"] = float(data["start_altitude"])
            data["stop_altitude"] = float(data["stop_altitude"])
            data["antenna_height"] = float(data["antenna_height"])
            data["safety_depth"] = float(data["safety_depth"])
            data["safety_height"] = float(data["safety_height"])
            if data["output_port"]:
                data["output_port"] = int(data["output_port"])
                if data["output_port"] < 1024 or data["output_port"] > 65535:
                    error_msg = "invalid output port (1024<port>65535"
            if data["path"]:
                try:
                    if file_info["filename"].endswith(".zip"):
                        data["path"] = utils.extract_zip(data["path"])
                    path_value = json.loads(data["path"].decode())
                    if "features" not in path_value:
                        error_msg = "missing features from GeoJSON"
                except ValueError:
                    error_msg = "JSON data is not valid"
        except Exception as exc:
            error_msg = "invalid input data: %s" % exc
        if error_msg:
            return self.redirect("/?error_msg=" + url_escape(error_msg))
        self.application.database.set_config(data)
        return self.redirect("/")
