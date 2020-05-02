"""
Created on Oct 11, 2017

@author: ionut
"""

import logging
import signal
import sys
import tornado.ioloop
import tornado.web
from collections import deque

import database
import handlers
import settings
from reach.data import DataManager
from utils import format_frame
from wifimanager import WifiManager


def app_exit():
    """Execute cleanup and exit"""
    logging.info("finished")
    tornado.ioloop.IOLoop.instance().stop()
    sys.exit()


def configure_signals():
    """Configure signal handling to cleanly exit the application"""

    def stopping_handler(signum, frame):
        """Handle signal and exit"""
        frame_data = format_frame(frame)
        logging.info("interrupt signal %s, frame %s received, stopping", signum, frame_data)
        app_exit()

    signal.signal(signal.SIGINT, stopping_handler)
    signal.signal(signal.SIGTERM, stopping_handler)


def main():
    """
    Load database configuration, start GPS thread and main Tornado app
    """
    application = tornado.web.Application(
        [
            (r"/", handlers.HomeHandler),
            (r"/debug", handlers.DebugHandler),
            (r"/data", handlers.DataHandler),
            (r"/tools", handlers.ToolsHandler),
            (r"/update", handlers.UpdateHandler)
        ],
        cookie_secret=settings.COOKIE_SECRET,
        xsrf_cookies=True,
        template_path=settings.TEMPLATE_PATH,
        static_path=settings.STATIC_PATH
    )

    application.database = database
    config = application.database.get_config()
    logging.info("creating new DataManager thread")
    application.data_queue = deque(maxlen=1)
    application.data_manager = DataManager(config, application.data_queue)
    application.data_manager.start()
    logging.info("creating new WifiManager thread")
    application.wifi_manager = WifiManager(config["wifi_ssid"], config["wifi_psk"])
    application.wifi_manager.start()
    logging.info("starting openexcavator on %s:%s ...", settings.ADDRESS, settings.PORT)
    application.listen(settings.PORT, address=settings.ADDRESS)
    tornado.ioloop.IOLoop.instance().start()


if __name__ == "__main__":
    configure_signals()
    main()
