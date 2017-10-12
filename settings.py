'''
Created on Oct 11, 2017

@author: ionut
'''

import logging

PORT = 8000
ADDRESS = '0.0.0.0'

logging.basicConfig(level=logging.DEBUG,
    format='[%(asctime)s] - %(levelname)s - %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
#logging.getLogger('tornado').setLevel(logging.WARNING)

#Tornado settings
TEMPLATE_PATH = 'templates'
STATIC_PATH = 'static'
COOKIE_SECRET = '__TO_BE_GENERATED__excavatorX__'

GPS_HOST = '127.0.0.1'
GPS_PORT = 9000
