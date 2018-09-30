
function getCookie(name) {
    var r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
    return r ? r[1] : undefined;
}

function formatDelta(x) {
	if (x > 0) {
		return '+' + x.toFixed(2) + ' M' 
	}
	return x.toFixed(2) + ' M';
}

function toRadians(angle) {
    return angle * (Math.PI / 180);
}

function pointToPointDistance(x1, y1, z1, x2, y2, z2) {
	  var dx = x2 - x1;
	  var dy = y2 - y1;
	  var dz = z2 - z1;
	  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function slope3D(x1, y1, z1, x2, y2, z2) {
	  var run = pointToPointDistance(x1, y1, 0, x2, y2, 0);
	  var rise = z2 - z1;  
	  return rise / run; 
}

function pointToSegmentDistance(x, y, z, x1, y1, z1, x2, y2, z2) {
	  var A = x - x1;
	  var B = y - y1;
	  var C = z - z1;
	  var D = x2 - x1;
	  var E = y2 - y1;
	  var F = z2 - z1;
	  var dot = A * D + B * E + C * F;
	  var len_sq = D * D + E * E + F * F;
	  var param = -1;
	  if (len_sq != 0) //in case of 0 length line
	      param = dot / len_sq;
	  var xx, yy, zz;
	  if (param < 0) {
	    xx = x1;
	    yy = y1;
	    zz = z1;
	  }
	  else if (param > 1) {
	    xx = x2;
	    yy = y2;
	    zz = z2;
	  }
	  else {
	    xx = x1 + param * D;
	    yy = y1 + param * E;
	    zz = z1 + param * F;
	  }
	  return pointToPointDistance(xx, yy, zz, x, y, z);
}

function inverseDistanceWeight(x, y, z, x1, y1, z1, v1, x2, y2, z2, v2) {
	var d1 = pointToPointDistance(x, y, z, x1, y1, z1);
	if (d1 === 0) {
		return v1;
	}
	var d2 = pointToPointDistance(x, y, z, x2, y2, z2);
	if (d2 === 0) {
		return v2;
	}
	var w1 = 1 / d1;
	var w2 = 1 / d2;
	return (w1 * v1 + w2 * v2) / (w1 + w2);
}

function getPolylineDistance(path, point, pointById) {
	var minDist = 1000000;
	var slope = 0;
	var altDiff = 0;
	var projCoords = fromLatLon(point.lat, point.lng, utmZone.num);
	projCoords.altitude = point.alt;
	for (var i=0; i<path.length-1;i++) {
		var c1 = pointById[i];
		var c2 = pointById[i+1];
		var angle = Math.atan2(c2.easting - c1.easting, c2.northing - c1.northing) * 180 / Math.PI;
		if (angle < 0) {
			angle += 360;
		}
		var dist = pointToSegmentDistance(projCoords.easting, projCoords.northing, 0, 
				c1.easting, c1.northing, 0, c2.easting, c2.northing, 0); //we use 0 as we only want the horizontal distance
		if (dist < minDist) {
			minDist = dist;
			slope = slope3D(c1.easting, c1.northing, c1.desiredAlt, c2.easting, c2.northing, c2.desiredAlt);
			altDiff = inverseDistanceWeight(projCoords.easting, projCoords.northing, projCoords.altitude,
					c1.easting, c1.northing, c1.altitude, c1.desiredAlt, c2.easting, c2.northing, c2.altitude, c2.desiredAlt);
			altDiff = point.alt - altDiff;
			//angleDif = angle - point.heading;
		}
	}
	return [minDist, slope, altDiff];
}


/** dot product of two vectors
 * @param {Vector3D} col
 * @param {Vector3D} row
 * @returns {number}
 */
function xmult(col, row) {
    return [0,1,2].reduce((a,c)=>a+col[c]*row[c],0);
}

/** Multiply a vector times a matrix
 * @param {Vector3D} offset - The vector of the offset
 * @param {Matrix3D} rotate - The rotation vector
 * @returns {Vector3D} - The new offset vector
 */
function vmmult(offset, rotate) {
    return [0,1,2].map(x=>xmult(offset,rotate[x]));
}

/**
 * Adapted from C courtesy of Bibek Subedi
 * https://www.programming-techniques.com/2012/03/3d-rotation-algorithm-about-arbitrary.html
 * @param {number} angle - the angle to rotate around the vector
 * @param {Vector3D} vec - the vector around which to rotate
 * @returns {Matrix3D} - the rotation matrix
 */
function setuprotationmatrix(angle, vec) {
    // Leaving L in for reusability, but it should always be 1 in our case
    let u = vec[0], v = vec[1], w = vec[2]; 
    let L = (u*u + v * v + w * w);
    let u2 = u * u;
    let v2 = v * v;
    let w2 = w * w; 

    let rotmat = [[],[],[]];
    rotmat[0][0] = (u2 + (v2 + w2) * Math.cos(angle)) / L;
    rotmat[0][1] = (u * v * (1 - Math.cos(angle)) - w * Math.sqrt(L) * Math.sin(angle)) / L;
    rotmat[0][2] = (u * w * (1 - Math.cos(angle)) + v * Math.sqrt(L) * Math.sin(angle)) / L;

    rotmat[1][0] = (u * v * (1 - Math.cos(angle)) + w * Math.sqrt(L) * Math.sin(angle)) / L;
    rotmat[1][1] = (v2 + (u2 + w2) * Math.cos(angle)) / L;
    rotmat[1][2] = (v * w * (1 - Math.cos(angle)) - u * Math.sqrt(L) * Math.sin(angle)) / L;

    rotmat[2][0] = (u * w * (1 - Math.cos(angle)) - v * Math.sqrt(L) * Math.sin(angle)) / L;
    rotmat[2][1] = (v * w * (1 - Math.cos(angle)) + u * Math.sqrt(L) * Math.sin(angle)) / L;
    rotmat[2][2] = (w2 + (u2 + v2) * Math.cos(angle)) / L;
    return rotmat;
}

/** Rotate a point around a vector projecting from the origin
 * @param {Vector3D} point - the we want to rotate
 * @param {Vector3D} vec - the vector (from origin to here) to rotate around
 * @param {number} angle - the angle (in radians) to rotate
 * @returns {Vector3D} - the new point location
 */
function rotatearound(point, vec, angle) {
    let rotmat = setuprotationmatrix(angle, vec);
    return vmmult(point, rotmat);
}

/** @typedef {Array<number,number,number>} */ var Vector3D;
/** @typedef {Array<Vector3D,vector3D,Vector3D>} */ var Matrix3D;

/**
 * @param {Vector3D} location - The location (3 coordinates) of the "plane"
 * @param {number} length - The length of the rod
 * @param {number} yaw - the yaw (heading) in degrees
 * @param {number} pitch - the pitch in degrees
 * @param {number} roll - the roll in degrees
 * @returns {Vector3D} - the location of the end of the rod
 */
function rodloc(location, length, roll, pitch, yaw) {
    let ryaw = toRadians(yaw);
    let rpitch = toRadians(pitch);
    let rroll = toRadians(roll);

    // This is where our axes start
    let x = [1, 0, 0];
    let y = [0, 1, 0];
    let z = [0, 0, 1];

    // NOTE:  ORDER MATTERS - your data may mean different things (see
    //        assumptions in answer!
    // Rotate axes around z by yaw
    let yprime = rotatearound([0, 1, 0], [0, 0, 1], ryaw);
    let xprime = rotatearound([1, 0, 0], [0, 0, 1], ryaw);
    let zprime = z;     // rotating around itself

    // Next we need to rotate for pitch (around the Y axis...)
    let x2prime = rotatearound(xprime, yprime, rpitch); 
    let y2prime = yprime; // dont need this
    let z2prime = rotatearound(zprime, yprime, rpitch);

    // Now we need to roll around the new x axis...
    let x3prime = x2prime   // dont need this
    let y3prime = rotatearound(y2prime, x2prime, rroll); // dont need this
    let z3prime = rotatearound(z2prime, x2prime, rroll);

    // now take what started out as [0, 0, 1] and place the end of the rod
    // (at what started out as [0, 0, -length])
    let rotend = [0,1,2].map(n=>-length*z3prime[n]);

    // now take that and add it to the original location of the plane 
    // and return it as the result
    return [0,1,2].map(n=>location[n]+rotend[n]);
}

function getNewPositionRPY(lng, lat, alt, dist, roll, pitch, yaw) {
	var projCoords = fromLatLon(lat, lng, utmZone.num);
	projCoords.altitude = alt;
    let position = rodloc([projCoords.easting, projCoords.northing, projCoords.altitude], dist, pitch, roll, -yaw);
	projCoords = toLatLon(position[0], position[1], projCoords.zoneNum, projCoords.zoneLetter);
	return [projCoords.longitude, projCoords.latitude, position[2]];
}
