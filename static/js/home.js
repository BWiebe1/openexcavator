var srcProj = '+proj=longlat +datum=WGS84 +no_defs';
var dstProj = '+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=37.5 +lon_0=-96 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs';

var startAltitude = 840;
var stopAltitude = 850;

var myMap = null;
var currentPosition = null;
var bounds = null;
var polyline = null;
var path = null;
var pointById = {};

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
	  var dx = x - xx;
	  var dy = y - yy;
	  return Math.sqrt(dx * dx + dy * dy);
	}

function getDistance(path, point) {
	var minDist = 1000000;
	var angleDif = 0;
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
			altDiff = (c2.desiredAlt + c2.desiredAlt) / 2 - point.alt;
			angleDif = angle-point.heading;
		}
	}
	return [minDist, angleDif, altDiff];
}

function getGeoJSON() {
	var jqxhr = $.get( "/static/data/path.geojson").done(function (data) {
		path = JSON.parse(data)['features'];
		initMap();
	  })
	  .fail(function() {
	    alert( "cannot retrieve GeoJSON data" );
	  });
}

function initMap() {
	myMap = L.map('mapid').setView([53.58442963725551, -110.51799774169922], 18);
	L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
			'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			'Imagery © <a href="http://mapbox.com">Mapbox</a>',
		id: 'mapbox.streets'
		}).addTo(myMap);
	var latlngs = [];
	var deltaAltitude = (stopAltitude-startAltitude) / path.length;
	for (var i=0; i<path.length;i++) {
		var coords = path[i].geometry.coordinates;
		var circle = L.circle(new L.LatLng(coords[1], coords[0]), 2).addTo(myMap);
		latlngs.push(new L.LatLng(coords[1], coords[0]));
		projCoords = proj4(srcProj, dstProj, [coords[0], coords[1]]);
		pointById[i] = {'lat': projCoords[1], 'lng': projCoords[0], 'alt': coords[2]};
		pointById[i].desiredAlt = startAltitude + i * deltaAltitude;
		pointById[i].circle = circle;
	}
	polyline = L.polyline(latlngs, {color: 'red'}).addTo(myMap);
	bounds = polyline.getBounds()
	myMap.fitBounds(bounds);
	var popup = L.popup();
	function onMapClick(e) {
		popup
			.setLatLng(e.latlng)
			.setContent("You clicked the map at " + e.latlng.toString())
		.openOn(myMap);
	}
	myMap.on('click', onMapClick);
	refreshPosition();
}

function refreshPosition() {
	var jqxhr = $.get( "/position").done(function (data) {
			data = JSON.parse(data);
			$('#plat').html(data.lat.toFixed(8));
			$('#plng').html(data.lng.toFixed(8));
			$('#palt').html(data.alt);
			$('#pdir').html(data.heading);
			$('#pacc').html(data.acc);
			var result = getDistance(path, data);
			$('#distance').html(result[0].toFixed(2) + ' M');
			$('#height').html(result[2].toFixed(2) + ' M');
			if (currentPosition === null) {
				currentPosition = L.circle([data.lat, data.lng], data.acc).addTo(myMap);
				bounds = polyline.getBounds();
				bounds.extend(new L.LatLng(data.lat, data.lng));
				myMap.fitBounds(bounds);
			}
			else {
				currentPosition.setLatLng(new L.LatLng(data.lat, data.lng));
				currentPosition.setRadius(data.acc);
			}
			setTimeout(refreshPosition, 1000);
		  })
		  .fail(function() {
		    alert( "cannot update position" );
		    setTimeout(refreshPosition, 5000);
		  })
}

$(document).ready(function() {
	getGeoJSON();
});

$(window).on( "load", function() {
	myMap.invalidateSize();
});