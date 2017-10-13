'''
Created on Aug 28, 2017

@author: ionut
'''

import datetime
import json
import tornado.web


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
        self.render('home.html')


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
