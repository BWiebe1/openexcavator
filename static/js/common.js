var srcProj = '+proj=longlat +datum=WGS84 +no_defs';
var dstProj = '+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=37.5 +lon_0=-96 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs';

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

function pointToPointDistance(x1, y1, x2, y2) {
	  var dx = x2 - x1;
	  var dy = y2 - y1;
	  return Math.sqrt(dx * dx + dy * dy); 
}

function slope3D(x1, y1, z1, x2, y2, z2) {
	  var run = pointToPointDistance(x1, y1, x2, y2);
	  var rise = z2 - z1;  
	  return rise / run; 
}

function pointToSegmentDistance(x, y, x1, y1, x2, y2) {
	  var A = x - x1;
	  var B = y - y1;
	  var C = x2 - x1;
	  var D = y2 - y1;
	  var dot = A * C + B * D;
	  var len_sq = C * C + D * D;
	  var param = -1;
	  if (len_sq != 0) //in case of 0 length line
	      param = dot / len_sq;
	  var xx, yy;
	  if (param < 0) {
	    xx = x1;
	    yy = y1;
	  }
	  else if (param > 1) {
	    xx = x2;
	    yy = y2;
	  }
	  else {
	    xx = x1 + param * C;
	    yy = y1 + param * D;
	  }
	  return pointToPointDistance(xx, yy, x, y);
}

function inverseDistanceWeight(x, y, x1, y1, v1, x2, y2, v2) {
	var d1 = pointToPointDistance(x, y, x1, y1);
	if (d1 === 0) {
		return v1;
	}
	var d2 = pointToPointDistance(x, y, x2, y2);
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
	var projCoords = proj4(srcProj, dstProj, [point.lng, point.lat]);
	for (var i=0; i<path.length-1;i++) {
		var c1 = pointById[i];
		var c2 = pointById[i+1];
		var angle = Math.atan2(c2.lng - c1.lng, c2.lat - c1.lat) * 180 / Math.PI;
		if (angle < 0) {
			angle += 360;
		}
		var dist = pointToSegmentDistance(projCoords[0], projCoords[1], c1.lng, c1.lat, c2.lng, c2.lat);
		if (dist < minDist) {
			minDist = dist;
			slope = slope3D(c1.lng, c1.lat, c1.desiredAlt, c2.lng, c2.lat, c2.desiredAlt);
			altDiff = inverseDistanceWeight(projCoords[0], projCoords[1], c1.lng, c1.lat, c1.desiredAlt, c2.lng, c2.lat, c2.desiredAlt);
			altDiff = point.alt - antennaHeight - altDiff;
			//angleDif = angle - point.heading;
		}
	}
	return [minDist, slope, altDiff];
}

function toRadians(angle) {
    return angle * (Math.PI / 180);
}

function getNewPositionRPY(lng, lat, alt, dist, roll, pitch, yaw) {
	//https://stackoverflow.com/questions/33984877/given-point-a-angles-and-length-to-point-b-calculate-point-b
	var projCoords = proj4(srcProj, dstProj, [lng, lat]);
	var x1 = projCoords[0] + dist * Math.cos(toRadians(yaw)) * Math.sin(toRadians(pitch));
	var y1 = projCoords[1] + dist * Math.sin(toRadians(yaw));
	var z1 = alt + dist * Math.cos(toRadians(yaw)) * Math.cos(toRadians(pitch));
	projCoords = proj4(dstProj, srcProj, [x1, y1]);
	return [projCoords[0], projCoords[1], z1];
}
