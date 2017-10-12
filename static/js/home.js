var myMap = null;
var currentPosition = null;
var bounds = null;
var polyline = null;

function initMap() {
	myMap = L.map('mapid').setView([53.58442963725551, -110.51799774169922], 18);
	L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
			'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			'Imagery © <a href="http://mapbox.com">Mapbox</a>',
		id: 'mapbox.streets'
		}).addTo(myMap);
	var latlngs = [
		[52.459865621574458, -112.885231474510661],
		[52.459865619894764, -112.885231463035069],
		[52.460121717615394, -112.884677504346158],
		[52.460270471695651, -112.884636962956534],
		[52.460275454666672, -112.884652089000014],
		[52.460275425, -112.8846520672857],
		[52.460246929571426, -112.884581114857156],
		[52.460204097882354, -112.884559945411752],
		[52.459963235149999, -112.885282644650019],
		[52.459956691, -112.885279583545469]
	];
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
}

function refreshPosition() {
	var jqxhr = $.get( "/position").done(function (data) {
			data = JSON.parse(data);
			$('#plat').html(data.lat);
			$('#plng').html(data.lng);
			if (currentPosition === null) {
				currentPosition = L.circle([data.lat, data.lng], 50).addTo(myMap);
				bounds = polyline.getBounds();
				bounds.extend(new L.LatLng(data.lat, data.lng));
				myMap.fitBounds(bounds);
			}
			else {
				currentPosition.setLatLng(new L.LatLng(data.lat, data.lng));
			}
			setTimeout(refreshPosition, 1000);
		  })
		  .fail(function() {
		    alert( "cannot update position" );
		    setTimeout(refreshPosition, 5000);
		  })
}

$(document).ready(function() {
	initMap();
	refreshPosition();
});

$(window).on( "load", function() {
	myMap.invalidateSize();
});