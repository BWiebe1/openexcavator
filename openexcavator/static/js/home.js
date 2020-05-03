window.utmZone = {"num": undefined, "letter": undefined}; //make sure we use the same UTM zone for all data
let myMap = null;
let currentPosition = null;
let bounds = null;
let polyline = null;
let pointById = {}; //holds points in UTM coordinate system
let startAltitude = null;
let stopAltitude = null;
let antennaHeight = null;
let safetyHeight = null;
let safetyDepth = null;
let path = null;


function processData(raw_data) {
    let data = JSON.parse(raw_data);
    try {
        if (data.roll === undefined || data.pitch === undefined || data.yaw === undefined) {
            $('#rpy').html("not available");
            data.alt = data.alt - antennaHeight;
        }
        else {
            let yaw = data.yaw < 0 ? data.yaw + 360 : data.yaw;
            $('#rpy').html(data.roll.toFixed(2) + "/" + data.pitch.toFixed(2) + "/" + yaw.toFixed(2));
            let dt = new Date();
            if (dt.getTime()/1000 - data.imu_time > 3) {
                $('#rpy').css("color", "red");
            }
            else {
                $('#rpy').css("color", "black");
            }
        }
        //{"utm_zone": {"letter": "U", "num": 12}
        $('#plat').html(data.hasOwnProperty("lat") ? data.lat.toFixed(8) : 0);
        $('#plng').html(data.hasOwnProperty("lng") ? data.lng.toFixed(8) : 0);
        let fix = data.fix;
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
        $('#pacc').html(data.hasOwnProperty("acc") ? data.acc.toFixed(2) + fix : 0 + '/' + fix);
        $('#ptim').html(new Date(data.ts * 1000).toISOString().substr(11, 8));
        if (data.imu_time !== undefined) {
            $('#ptim').html(new Date(data.ts * 1000).toISOString().substr(11, 8) + "/" + data.delta.toFixed(2));
        }
        let result = getPolylineDistance(path, data, pointById);
        let slope = result[1] * 100;
        $('#pslo').html(slope.toFixed(2) + '%');
        $('#palt').html(data.hasOwnProperty("_alt") ? data._alt.toFixed(2) : "-" + '/' + data.alt.toFixed(2));
        $('#height').html(formatDelta(result[2]));
        $('#distance').html(formatDelta(result[0]));
        $('#ptim').css('color', 'black');
        if (result[2] > 0) {
            $('.fa-arrow-circle-down').each(function () {this.style.setProperty('color' , '#5cb85c', 'important')});
            $('.fa-arrow-circle-up').each(function () {this.style.setProperty('color' , '#868e96', 'important')});
        }
        else {
            $('.fa-arrow-circle-up').each(function () {this.style.setProperty('color' , '#5cb85c', 'important')});
            $('.fa-arrow-circle-down').each(function () {this.style.setProperty('color' , '#868e96', 'important')});
        }
        if (data.alt <= safetyDepth) {
            $('.fa-arrow-circle-up').each(function () {this.style.setProperty('color' , '#d9534f', 'important')});
        }
        if (data.alt + antennaHeight >= safetyHeight) {
            $('.fa-arrow-circle-down').each(function () {this.style.setProperty('color' , '#d9534f', 'important')});
        }
        // TODO: handle left right
        let acc = data.hasOwnProperty("acc") ? data.acc : 25;
        if (currentPosition === null) {
            currentPosition = L.circle([data.lat, data.lng], acc).addTo(myMap);
            bounds.extend(currentPosition.getBounds());
            myMap.fitBounds(bounds);
        }
        else {
            currentPosition.setLatLng(new L.LatLng(data.lat, data.lng));
            currentPosition.setRadius(acc);
        }
        if (data.hasOwnProperty("acc")) {
            currentPosition.setStyle({fillColor: "#3388ff"});
        }
        else {
            currentPosition.setStyle({fillColor: "red"});
        }
    }
    catch (err) {
        $('#ptim').css('color', 'red');
        console.debug('cannot parse position data: ' + data + ', error: ' + err.message);
    }
}

function initMap() {
    myMap = L.map('mapid').setView([53.58442963725551, -110.51799774169922], 18);
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        maxZoom: 22,
        attribution: '&copy;<a href="http://mapbox.com">Mapbox</a>',
        id: 'mapbox.streets'
    }).addTo(myMap);
    L.control.scale().addTo(myMap);
    let latlngs = [];
    let deltaAltitude = (stopAltitude-startAltitude) / (path.length - 1);
    for (let i=0; i<path.length;i++) {
        let coords = path[i].geometry.coordinates;
        let circle = L.circle(new L.LatLng(coords[1], coords[0]), 1).addTo(myMap);
        latlngs.push(new L.LatLng(coords[1], coords[0]));
        if (utmZone.num === undefined) {
            let aux = fromLatLon(coords[1], coords[0]);
            utmZone.num = aux.zoneNum;
            utmZone.letter = aux.zoneLetter;
        }
        pointById[i] = fromLatLon(coords[1], coords[0], utmZone.num);
        pointById[i].altitude = coords[2];
        pointById[i].desiredAlt = startAltitude + i * deltaAltitude;
        pointById[i].circle = circle;
    }
    polyline = L.polyline(latlngs, {color: 'red'}).addTo(myMap);
    bounds = polyline.getBounds();
    myMap.fitBounds(bounds);
    let popup = L.popup();
    function onMapClick(e) {
        popup
            .setLatLng(e.latlng)
            .setContent("You clicked the map at " + e.latlng.toString())
            .openOn(myMap);
    }
    myMap.on('click', onMapClick);
    myMap.invalidateSize();
}

$(document).ready(function() {
    startAltitude = parseFloat($('#start_altitude').val());
    stopAltitude = parseFloat($('#stop_altitude').val());
    antennaHeight = parseFloat($('#antenna_height').val());
    safetyHeight = parseFloat($('#safety_height').val());
    safetyDepth = parseFloat($('#safety_depth').val());
    path = JSON.parse($('#path').attr('data-text'))['features'];
    initMap();
    connectWS(processData);
});

$(window).on( "load", function() {
    if (myMap !== null) {
        myMap.invalidateSize();
    }
});