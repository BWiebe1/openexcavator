'''
Created on Aug 28, 2017

@author: ionut
'''

import datetime
import json
import tornado.web

import database


def json_encoder(obj):
    """Encode datetime.datetime objects using ISO format"""
    if isinstance(obj, datetime.datetime):
        return obj.isoformat()


class BaseHandler(tornado.web.RequestHandler):
    """
    Base handler returning 400 for both GET and POST
    other handlers will inherit this and implement the requests
    """


    def get(self):
        self.set_status(400)
        self.finish('GET not allowed')


    def post(self):
        self.set_status(400)
        self.finish('POST not allowed')


class HomeHandler(BaseHandler):
    """
    Handler for / request, renders home.html
    """

    def get(self):
        config = database.get_config()
        self.render('home.html', config=config, token=self.xsrf_token)


class PositionHandler(BaseHandler):
    """
    Handler for async /position request.
    Get the data from the GPS thread and return JSON encoded position
    """


    def initialize(self, gpsc):
        self.gpsc = gpsc


    def get(self):
        response = json.dumps(self.gpsc.get_position(), default=json_encoder)
        self.finish(response)


class UpdateHandler(BaseHandler):
    """
    Handler for updating config data.
    """


    def post(self):
        start_altitude = self.get_argument('start_altitude', None)
        stop_altitude = self.get_argument('stop_altitude', None)
        path = self.get_argument('path', None)
        try:
            start_altitude = float(start_altitude)
            stop_altitude = float(stop_altitude)
            pathvalue = json.loads(path)
            if not 'features' in pathvalue:
                raise Exception('missing features from GeoJSON')
        except Exception as exc:
            self.set_status(400)
            return self.finish('invalid input data: %s' % exc)

        data = {'start_altitude': start_altitude, 'stop_altitude': stop_altitude, 'path': path}
        database.set_config(data)
        self.finish('OK')
