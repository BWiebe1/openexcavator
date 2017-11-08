var myMap = null;
var currentPosition = null;
var currentData = null;
var startPosition = null;
var startData = null;

function initMap() {
	myMap = L.map('mapid').setView([53.58442963725551, -110.51799774169922], 18);
	L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
		maxZoom: 22,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
			'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			'Imagery © <a href="http://mapbox.com">Mapbox</a>',
		id: 'mapbox.streets'
		}).addTo(myMap);
	var popup = L.popup();
	function onMapClick(e) {
		popup
			.setLatLng(e.latlng)
			.setContent("You clicked the map at " + e.latlng.toString())
		.openOn(myMap);
	}
	myMap.on('click', onMapClick);
	myMap.invalidateSize();
	refreshPosition();
}

function setValuesData(prefix, data) {
	$('#' + prefix + 'lat').html(data.lat.toFixed(8));
	$('#' + prefix + 'lng').html(data.lng.toFixed(8));
	var fix = data.fix;
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
	$('#' + prefix + 'alt').html(data.alt.toFixed(2));
	$('#' + prefix + 'tim').css('color', 'black');
}

function refreshPosition() {
	var jqxhr = $.get( "/position").done(function (data) {
		var data = JSON.parse(data);
		try {
			setValuesData('current_', data);
			if (startData !== null) {
				projStartCoords = proj4(srcProj, dstProj, [startData.lng, startData.lat]);
				projCurrentCoords = proj4(srcProj, dstProj, [currentData.lng, currentData.lat]);
				var slope = slope3D(projStartCoords[0], projStartCoords[1], startData.alt,
						projCurrentCoords[0], projCurrentCoords[1], currentData.alt);
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
		setTimeout(refreshPosition, 1000);
	})
	.fail(function() {
		$('#ptim').css('color', 'red');
		console.log('cannot retrieve position data');
		setTimeout(refreshPosition, 5000);
	});
}

$(document).ready(function() {
	$('#mark').click(function(){
		startData = JSON.parse(JSON.stringify(currentData));
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