"""
Created on Oct 11, 2017

@author: ionut
"""

import logging
import signal
import tornado.ioloop
import tornado.web

import database
import handlers
import settings
from reach.gps import ReachGPS
from reach.imu import ReachIMU
from utils import format_frame


def app_exit():
    """Execute cleanup and exit"""
    logging.info("finished")
    tornado.ioloop.IOLoop.instance().stop()


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
    config = database.get_config()
    application = tornado.web.Application(
        [
            (r"/", handlers.HomeHandler),
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
    application.gps_client = ReachGPS(config["gps_host"], int(config["gps_port"]))
    application.gps_client.start()
    application.imu_client = ReachIMU(config["imu_host"], int(config["imu_port"]))
    application.imu_client.start()
    logging.info("starting openexcavator on %s:%s ...", settings.ADDRESS, settings.PORT)
    application.listen(settings.PORT, address=settings.ADDRESS)
    tornado.ioloop.IOLoop.instance().start()


if __name__ == "__main__":
    configure_signals()
    main()
