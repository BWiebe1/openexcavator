'''
Created on Oct 11, 2017

@author: ionut
'''

import logging

PORT = 8000
ADDRESS = '127.0.0.1'

logging.basicConfig(level=logging.DEBUG, datefmt='%Y-%m-%d %H:%M:%S',
                    format='[%(asctime)s] - %(levelname)s - %(message)s')
logging.getLogger('tornado').setLevel(logging.WARNING)

#Tornado settings
TEMPLATE_PATH = 'templates'
STATIC_PATH = 'static'
COOKIE_SECRET = '__TO_BE_GENERATED__excavatorX__'