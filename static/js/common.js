
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

function getNewPositionRPY(lng, lat, alt, dist, roll, pitch, yaw) {
	var projCoords = fromLatLon(lat, lng, utmZone.num);
	projCoords.altitude = alt;
	var x1 = projCoords.easting + dist * Math.sin(toRadians(pitch)) * Math.sin(toRadians(yaw));
	var y1 = projCoords.northing + dist * Math.sin(toRadians(pitch)) * Math.cos(toRadians(yaw));
	var z1 = projCoords.altitude - dist * Math.cos(toRadians(pitch)); //see pendulum motion
	projCoords = toLatLon(x1, y1, projCoords.zoneNum, projCoords.zoneLetter);
	return [projCoords.longitude, projCoords.latitude, z1];
}
