"""
Created on Apr 15, 2019

@author: ionut
"""

import math
import utm
from functools import reduce


def x_mult(col, row):
    """
    Calculate dot product of two vectors
    :param col: col vector
    :param row: row vector
    :return: result (number
    """
    arr = [0, 1, 2]
    return reduce(lambda total, current: total + col[current]*row[current], arr, 0)


def vm_mult(offset, rotate):
    """
    /** Multiply a vector times a matrix
     * @param {Vector3D} offset - The vector of the offset
     * @param {Matrix3D} rotate - The rotation vector
     * @returns {Vector3D} - The new offset vector
     */
    """
    arr = [0, 1, 2]
    return list(map(lambda x: x_mult(offset,rotate[x]), arr))


def setup_rotation_matrix(angle, vec):
    """
    /**
     * Adapted from C courtesy of Bibek Subedi
     * https://www.programming-techniques.com/2012/03/3d-rotation-algorithm-about-arbitrary.html
     * @param {number} angle - the angle to rotate around the vector
     * @param {Vector3D} vec - the vector around which to rotate
     * @returns {Matrix3D} - the rotation matrix
     */
    """
    # Leaving L in for re-usability, but it should always be 1 in our case
    u = vec[0]
    v = vec[1]
    w = vec[2]
    L = (u*u + v * v + w * w)
    u2 = u * u
    v2 = v * v
    w2 = w * w

    rot_mat = [
        [-1, -1, -1],
        [-1, -1, -1],
        [-1, -1, -1]
    ]
    rot_mat[0][0] = (u2 + (v2 + w2) * math.cos(angle)) / L
    rot_mat[0][1] = (u * v * (1 - math.cos(angle)) - w * math.sqrt(L) * math.sin(angle)) / L
    rot_mat[0][2] = (u * w * (1 - math.cos(angle)) + v * math.sqrt(L) * math.sin(angle)) / L

    rot_mat[1][0] = (u * v * (1 - math.cos(angle)) + w * math.sqrt(L) * math.sin(angle)) / L
    rot_mat[1][1] = (v2 + (u2 + w2) * math.cos(angle)) / L
    rot_mat[1][2] = (v * w * (1 - math.cos(angle)) - u * math.sqrt(L) * math.sin(angle)) / L

    rot_mat[2][0] = (u * w * (1 - math.cos(angle)) - v * math.sqrt(L) * math.sin(angle)) / L
    rot_mat[2][1] = (v * w * (1 - math.cos(angle)) + u * math.sqrt(L) * math.sin(angle)) / L
    rot_mat[2][2] = (w2 + (u2 + v2) * math.cos(angle)) / L
    return rot_mat


def rotate_around(point, vec, angle):
    """
        /** Rotate a point around a vector projecting from the origin
     * @param {Vector3D} point - the we want to rotate
     * @param {Vector3D} vec - the vector (from origin to here) to rotate around
     * @param {number} angle - the angle (in radians) to rotate
     * @returns {Vector3D} - the new point location
     */
    """
    rot_mat = setup_rotation_matrix(angle, vec)
    return vm_mult(point, rot_mat)


def rod_location(location, length, roll, pitch, yaw):
    """
    }
    /** @typedef {Array<number,number,number>} */ var Vector3D
    /** @typedef {Array<Vector3D,vector3D,Vector3D>} */ var Matrix3D
    
    /**
     * @param {Vector3D} location - The location (3 coordinates) of the "plane"
     * @param {number} length - The length of the rod
     * @param {number} yaw - the yaw (heading) in degrees
     * @param {number} pitch - the pitch in degrees
     * @param {number} roll - the roll in degrees
     * @returns {Vector3D} - the location of the end of the rod
     */
    """
    ryaw = math.radians(yaw)
    rpitch = math.radians(pitch)
    rroll = math.radians(roll)

    # This is where our axes start
    x = [1, 0, 0]
    y = [0, 1, 0]
    z = [0, 0, 1]

    # NOTE:  ORDER MATTERS - your data may mean different things (see
    #        assumptions in answer!
    # Rotate axes around z by yaw
    yprime = rotate_around([0, 1, 0], [0, 0, 1], ryaw)
    xprime = rotate_around([1, 0, 0], [0, 0, 1], ryaw)
    zprime = z     # rotating around itself

    # Next we need to rotate for pitch (around the Y axis...)
    x2prime = rotate_around(xprime, yprime, rpitch)
    y2prime = yprime
    z2prime = rotate_around(zprime, yprime, rpitch)

    # Now we need to roll around the new x axis...
    x3prime = x2prime   # dont need this
    y3prime = rotate_around(y2prime, x2prime, rroll)  # dont need this
    z3prime = rotate_around(z2prime, x2prime, rroll)

    # now take what started out as [0, 0, 1] and place the end of the rod
    # (at what started out as [0, 0, -length])
    arr = [0, 1, 2]
    rot_end = list(map(lambda n: -length*z3prime[n], arr))

    # now take that and add it to the original location of the plane
    # and return it as the result
    return list(map(lambda n: location[n]+rot_end[n], arr))


def get_new_position_rpy(lng, lat, alt, dist, roll, pitch, yaw, utm_zone):
    proj_coords = utm.from_latlon(lat, lng, utm_zone["num"])
    position = rod_location([proj_coords[0], proj_coords[1], alt], dist, pitch, roll, -yaw)
    proj_coords = utm.to_latlon(position[0], position[1], proj_coords[2], proj_coords[3])
    return [proj_coords[1], proj_coords[0], position[2]]
