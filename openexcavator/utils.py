"""
Created on Oct 11, 2017

@author: ionut
"""

import datetime
import io
import zipfile


def json_encoder(obj):
    """
    Encode datetime.datetime objects using time-only HMS format
    :param obj: object to encode
    :return: date
    """
    if isinstance(obj, datetime.datetime):
        return obj.timestamp()
    return obj


def format_frame(frame):
    """
    Return a nice representation of frame.f_locals
    :param frame: frame object
    :returns: string representation
    """
    buf = ""
    for key, value in frame.f_locals.items():
        buf += "\t%s -> %s\n" % (key, value)
    return buf


def extract_zip(data):
    """
    Extract ZIP data from file data and return extracted data for first file found
    :param data: bytes representing archive (zip) data
    :returns: extracted data for first file found
    """
    file_obj = io.BytesIO(data)
    zip_file = zipfile.ZipFile(file_obj)
    for filename in zip_file.infolist():
        data = zip_file.read(filename)
        return data
