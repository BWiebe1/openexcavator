window.utmZone = {"num": undefined, "letter": undefined}; //make sure we use the same UTM zone for all data
var myMap = null;
var currentPosition = null;
var bounds = null;
var polyline = null;
var pointById = {}; //holds points in UTM coordinate system
var startAltitude = null;
var stopAltitude = null;
var antennaHeight = null;
var safetyHeight = null;
var safetyDepth = null;
var path = null;


function refreshData() {
	var jqxhr = $.get( "/data").done(function (raw_data) {
		var data = JSON.parse(raw_data);
		try {
			var gpsAlt = data.alt;
			if (data.pitch === undefined || data.yaw == undefined) {
				$('#rpy').html("not available");
				data.alt = data.alt - antennaHeight;
			}
			else {
				var roll = data.roll > 180 ? data.roll - 360 : data.roll;
				var pitch = data.pitch > 180 ? data.pitch - 360 : data.pitch;
				$('#rpy').html(roll.toFixed(2) + "/" + pitch.toFixed(2) + "/" + data.yaw.toFixed(2));
				var result = getNewPositionRPY(data.lng, data.lat, data.alt, antennaHeight, data.roll, data.pitch, data.yaw);
				data.lng = result[0];
				data.lat = result[1];
				data.alt = result[2];
				var dt = new Date();
				if (dt.getTime()/1000 - data.imu_time > 3) {
					$('#rpy').css("color", "red");
				}
				else {
					$('#rpy').css("color", "black");
				}
			}
			$('#plat').html(data.lat.toFixed(8));
			$('#plng').html(data.lng.toFixed(8));
			var fix = data.fix;
			if (data.fix === 1) {
				fix = 'single';
				$('#pacc').css('color', 'red');
			} else if (data.fix === 4){
				$('#pacc').css('color', 'green');
				fix = 'fix';
			} else if (data.fix === 5){
				$('#pacc').css('color', '#CCCC00');
				fix = 'float';
			}
			$('#pacc').html(data.acc.toFixed(2) + '/' + fix);
			$('#ptim').html(data.ts);
			var result = getPolylineDistance(path, data, pointById);
			var slope = result[1] * 100;
			$('#pslo').html(slope.toFixed(2) + '%');
			$('#palt').html(gpsAlt.toFixed(2) + '/' + data.alt.toFixed(2));
			$('#height').html(formatDelta(result[2]));
			$('#distance').html(formatDelta(result[0]));
			$('#ptim').css('color', 'black');
			if (result[2] > 0) {
				$('.fa-arrow-down').each(function () {this.style.setProperty('color' , '#5cb85c', 'important')});
				$('.fa-arrow-up').each(function () {this.style.setProperty('color' , '#868e96', 'important')});
			}
			else {
				$('.fa-arrow-up').each(function () {this.style.setProperty('color' , '#5cb85c', 'important')});
				$('.fa-arrow-down').each(function () {this.style.setProperty('color' , '#868e96', 'important')});
			}
			if (data.alt <= safetyDepth) {
				$('.fa-arrow-up').each(function () {this.style.setProperty('color' , '#d9534f', 'important')});
			}
			if (data.alt + antennaHeight >= safetyHeight) {
				$('.fa-arrow-down').each(function () {this.style.setProperty('color' , '#d9534f', 'important')});
			}
			if (currentPosition === null) {
				currentPosition = L.circle([data.lat, data.lng], data.acc).addTo(myMap);
				bounds.extend(currentPosition.getBounds());
				myMap.fitBounds(bounds);
			}
			else {
				currentPosition.setLatLng(new L.LatLng(data.lat, data.lng));
				currentPosition.setRadius(data.acc);
			}
		}
		catch (err) {
			$('#ptim').css('color', 'red');
			console.log('cannot parse position data: ' + data + ', error: ' + err.message); 
		}
		setTimeout(refreshData, 100);
	})
	.fail(function() {
		$('#ptim').css('color', 'red');
		console.log('cannot retrieve data');
		setTimeout(refreshData, 3000);
	});
}

function initMap() {
	myMap = L.map('mapid').setView([53.58442963725551, -110.51799774169922], 18);
	L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
		maxZoom: 22,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
			'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			'Imagery © <a href="http://mapbox.com">Mapbox</a>',
		id: 'mapbox.streets'
		}).addTo(myMap);
	L.control.scale().addTo(myMap);
	var latlngs = [];
	var deltaAltitude = (stopAltitude-startAltitude) / (path.length - 1);
	for (var i=0; i<path.length;i++) {
		var coords = path[i].geometry.coordinates;
		var circle = L.circle(new L.LatLng(coords[1], coords[0]), 1).addTo(myMap);
		latlngs.push(new L.LatLng(coords[1], coords[0]));
		if (utmZone.num === undefined) {
			var aux = fromLatLon(coords[1], coords[0]);
			utmZone.num = aux.zoneNum;
			utmZone.letter = aux.zoneLetter;
		}
		pointById[i] = fromLatLon(coords[1], coords[0], utmZone.num);
		pointById[i].altitude = coords[2];
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
	myMap.invalidateSize();
	refreshData();
}

$(document).ready(function() {
	startAltitude = parseFloat($('#start_altitude').val());
	stopAltitude = parseFloat($('#stop_altitude').val());
	antennaHeight = parseFloat($('#antenna_height').val());
	safetyHeight = parseFloat($('#safety_height').val());
	safetyDepth = parseFloat($('#safety_depth').val());
	path = JSON.parse($('#path').attr('data-text'))['features'];
	initMap();
});

$(window).on( "load", function() {
	if (myMap !== null) {
		myMap.invalidateSize();
	}
});