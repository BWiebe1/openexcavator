window.utmZone = {"num": undefined, "letter": undefined}; //make sure we use the same UTM zone for all data
let myMap = null;
let currentPosition = null;
let currentData = null;
let startPosition = null;
let startData = null;
let polyline = null;
let antennaHeight = null;

function initMap() {
	myMap = L.map('mapid').setView([53.58442963725551, -110.51799774169922], 18);
	L.tileLayer('/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
			'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			'Imagery © <a href="http://mapbox.com">Mapbox</a>',
		id: 'mapbox.streets'
		}).addTo(myMap);
	L.control.scale().addTo(myMap);
	let popup = L.popup();
	function onMapClick(e) {
		popup
			.setLatLng(e.latlng)
			.setContent("You clicked the map at " + e.latlng.toString())
		.openOn(myMap);
	}
	if (startData !== null) {
		startPosition = L.circle([startData.lat, startData.lng], startData.acc).addTo(myMap);
		startPosition.setStyle({fillColor: 'green', color: 'green'});
	}
	myMap.on('click', onMapClick);
	myMap.invalidateSize();
	refreshPosition();
}

function setValuesData(prefix, data) {
	$('#' + prefix + 'lat').html(data.lat.toFixed(8));
	$('#' + prefix + 'lng').html(data.lng.toFixed(8));
	let fix = data.fix;
	if (data.fix === 1) {
		fix = 'single';
		$('#' + prefix + 'acc').css('color', 'red');
	} else if (data.fix === 4){
		$('#' + prefix + 'acc').css('color', 'green');
		fix = 'fix';
	} else if (data.fix === 5){
		$('#' + prefix + 'acc').css('color', '#CCCC00');
		fix = 'float';
	}
	$('#' + prefix + 'acc').html(data.acc.toFixed(2) + '/' + fix);
	$('#' + prefix + 'tim').html(data.ts);
	let value = data.alt - antennaHeight;
	$('#' + prefix + 'alt').html(value.toFixed(2));
	$('#' + prefix + 'tim').css('color', 'black');
}

function refreshPosition() {
	let jqxhr = $.get( "/data").done(function (rawData) {
		let data = JSON.parse(rawData);
		try {
			setValuesData('current_', data);
			if (startData !== null) {
				let latlngs = [new L.LatLng(startData.lat, startData.lng),
					new L.LatLng(data.lat, data.lng)];
				if (polyline === null) {
					polyline = L.polyline(latlngs, {color: 'red'}).addTo(myMap);
				}
				else {
					polyline.setLatLngs(latlngs);
				}
				if (utmZone.num === undefined) {
					let aux = fromLatLon(startData.lat, startData.lng);
					utmZone.num = aux.zoneNum;
					utmZone.letter = aux.zoneLetter;
				}
				let projStartCoords = fromLatLon(startData.lat, startData.lng, utmZone.num);startData.alt;
				let projCoords = fromLatLon(data.lat, data.lng, utmZone.num);
				let run = pointToPointDistance(projStartCoords.easting, projStartCoords.northing, 0, projCoords.easting, projCoords.northing, 0);
				let rise = data.alt - startData.alt;
				$('#rise_run').html(rise.toFixed(2) + '/' + run.toFixed(2));
				let slope = rise / run;
				slope = slope * 100;
				slope = slope.toFixed(2) + '%';
				$('#slope').html(slope);
			}
			if (currentPosition === null) {
				currentPosition = L.circle([data.lat, data.lng], data.acc).addTo(myMap);
				myMap.fitBounds(currentPosition.getBounds());
			}
			else {
				currentPosition.setLatLng(new L.LatLng(data.lat, data.lng));
				currentPosition.setRadius(data.acc);
			}
			currentData = data;
		}
		catch (err) {
			$('#ptim').css('color', 'red');
			console.log('cannot parse position data: ' + data + ', error: ' + err.message); 
		}
		setTimeout(refreshPosition, 100);
	})
	.fail(function() {
		$('#ptim').css('color', 'red');
		console.log('cannot retrieve position data');
		setTimeout(refreshPosition, 3000);
	});
}

$(document).ready(function() {
	antennaHeight = parseFloat($('#antenna_height').text());
	if (sessionStorage.getItem("startData") !== null) {
		startData = JSON.parse(sessionStorage.getItem("startData"));
		setValuesData('start_', startData);
	}
	$('#mark').lick(function(){
		startData = JSON.parse(JSON.stringify(currentData)); //"deep" copy for simple data
		sessionStorage.setItem('startData', JSON.stringify(startData));
		setValuesData('start_', startData);
		if (startPosition === null) {
			startPosition = L.circle([startData.lat, startData.lng], startData.acc).addTo(myMap);
			startPosition.setStyle({fillColor: 'green', color: 'green'});
		}
		else {
			startPosition.setLatLng(new L.LatLng(startData.lat, startData.lng));
			startPosition.setRadius(startData.acc);
		}
		myMap.fitBounds(startPosition.getBounds());
    }); 
	initMap();
});

$(window).on( "load", function() {
	if (myMap !== null) {
		myMap.invalidateSize();
	}
});