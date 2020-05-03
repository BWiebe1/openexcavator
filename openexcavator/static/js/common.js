
function getCookie(name) {
    let r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
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
	  let dx = x2 - x1;
	  let dy = y2 - y1;
	  let dz = z2 - z1;
	  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function slope3D(x1, y1, z1, x2, y2, z2) {
	  let run = pointToPointDistance(x1, y1, 0, x2, y2, 0);
	  let rise = z2 - z1;
	  return rise / run; 
}

function pointToSegmentDistance(x, y, z, x1, y1, z1, x2, y2, z2) {
	  let A = x - x1;
	  let B = y - y1;
	  let C = z - z1;
	  let D = x2 - x1;
	  let E = y2 - y1;
	  let F = z2 - z1;
	  let dot = A * D + B * E + C * F;
	  let len_sq = D * D + E * E + F * F;
	  let param = -1;
	  if (len_sq !== 0) //in case of 0 length line
	      param = dot / len_sq;
	  let xx, yy, zz;
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
	let d1 = pointToPointDistance(x, y, z, x1, y1, z1);
	if (d1 === 0) {
		return v1;
	}
	let d2 = pointToPointDistance(x, y, z, x2, y2, z2);
	if (d2 === 0) {
		return v2;
	}
	let w1 = 1 / d1;
	let w2 = 1 / d2;
	return (w1 * v1 + w2 * v2) / (w1 + w2);
}

function getPolylineDistance(path, point, pointById) {
	let minDist = 1000000;
	let slope = 0;
	let altDiff = 0;
	let projCoords = fromLatLon(point.lat, point.lng, utmZone.num);
	projCoords.altitude = point.alt;
	for (let i=0; i<path.length-1;i++) {
		let c1 = pointById[i];
		let c2 = pointById[i+1];
		let angle = Math.atan2(c2.easting - c1.easting, c2.northing - c1.northing) * 180 / Math.PI;
		if (angle < 0) {
			angle += 360;
		}
		let dist = pointToSegmentDistance(projCoords.easting, projCoords.northing, 0,
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

function connectWS(callback) {
    let ws_url = "ws:";
    if (window.location.protocol === "https:") {
        ws_url = "wss:";
    }
    ws_url += "//" + window.location.host + "/data";
    let client = new WebSocket(ws_url);

    client.onopen = function () {
        console.log("connected to data ws");
        client.send("!");
    };

    client.onmessage = function (e) {
        callback(e.data);
        setTimeout(function() {client.send("!");}, 100);
    };

    client.onclose = function (e) {
        console.warn("socket is closed. reconnect will be attempted in 1 second.", e.reason);
        setTimeout(connectWS, 1000);
    };

    client.onerror = function (err) {
        console.error("socket encountered error: ", err.message, "closing socket");
        try {
            client.close();
        }
        catch (err) {
            console.error("error closing client", err.message);
        }
        $('#ptim').css('color', 'red');
        setTimeout(connectWS, 3000);
    };
}

function toggleFullScreen() {
  if (!document.fullscreenElement &&    // alternative standard method
      !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {  // current working methods
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}