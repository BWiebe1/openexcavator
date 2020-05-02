window.utmZone = {"num": undefined, "letter": undefined}; //make sure we use the same UTM zone for all data
let myMap = null;
let currentPosition = null;
let currentData = null;
let startPosition = null;
let startData = null;
let polyline = null;

function initMap() {
	myMap = L.map('mapid').setView([53.58442963725551, -110.51799774169922], 18);
	L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
		maxZoom: 22,
		attribution: '&copy;<a href="http://mapbox.com">Mapbox</a>',
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
}

function download(filename, text) {
  let element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
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

function processData(raw_data) {
	let data = JSON.parse(raw_data);
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
			let projStartCoords = fromLatLon(startData.lat, startData.lng, utmZone.num);
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
		console.debug('cannot parse position data: ' + data + ', error: ' + err.message);
	}
}

$(document).ready(function() {
	//antennaHeight = parseFloat($('#antenna_height').text());
	if (sessionStorage.getItem("startData") !== null) {
		startData = JSON.parse(sessionStorage.getItem("startData"));
		setValuesData('start_', startData);
	}
	$('#export').click(function(){
		let document = {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
            "features": [
				{"type": "Feature", "properties": {"name": "start", "solution status": startData.fix},
					"geometry": {"type": "Point", "coordinates": [startData.lng, startData.lat, startData.alt]}},
				{"type": "Feature", "properties": {"name": "stop", "solution status": currentData.fix },
					"geometry": {"type": "Point", "coordinates": [currentData.lng, currentData.lat, currentData.alt]}}
            ]
		};
		download("export.geojson", JSON.stringify(document));
	});
	$('#mark').click(function(){
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
	connectWS(processData);
});

$(window).on( "load", function() {
	if (myMap !== null) {
		myMap.invalidateSize();
	}
});