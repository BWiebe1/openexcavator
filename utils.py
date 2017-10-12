'''
Created on Oct 11, 2017

@author: ionut
'''

def format_frame(frame):
    """
    Return a nice representation of frame.f_locals
    :param frame: frame object
    :returns: string representation
    """
    buf = ''
    for key, value in frame.f_locals.items():
        buf += '\t%s -> %s\n' % (key, value)
    return buf
