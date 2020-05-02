let utmZone = {"num": undefined, "letter": undefined}; //make sure we use the same UTM zone for all data
let dist = 2.085;

function handleOrientation(event) {
    let yaw = 360 - event.alpha;
    let pitch = event.beta;
    let roll = event.gamma;
    $("#roll").val(roll.toFixed(2));
    $("#pitch").val(pitch.toFixed(2));
    $("#yaw").val(yaw.toFixed(2));
    let x = parseFloat($("#x").val());
    let y = parseFloat($("#y").val());
    let z = parseFloat($("#z").val());
    let dist = parseFloat($("#d").val());
    let position = rodloc([x, y, z], dist, pitch, roll, -yaw);
    $("#position").html("X " + position[0].toFixed(2) + ", Y " + position[1].toFixed(2) + ", Z " + position[2].toFixed(2));
}

function init3JS() {
    let canvas = document.getElementById("canvas");
    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera(75, canvas.offsetWidth/canvas.offsetHeight, 0.1, 1000);

    let light = new THREE.PointLight(0xEEEEEE);
    light.position.set(20, 0, 20);
    scene.add(light);
    let lightAmb = new THREE.AmbientLight(0x777777);
    scene.add(lightAmb);

    let renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setPixelRatio( window.devicePixelRatio );
    canvas.appendChild(renderer.domElement);
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    renderer.setClearColor(0xeeeeee, 1);
    THREE.LinearFilter

    function draw(p1,p2){
        let mat = new THREE.MeshStandardMaterial({color:0x006600});
        let geo = new THREE.Geometry();
        geo.vertices.push(p1);
        geo.vertices.push(p2);
        let line = new THREE.Line(geo, mat);
        scene.add(line);
       return line
    }

    let geometry = new THREE.BoxGeometry(1, 1, 1);
    let material = new THREE.MeshStandardMaterial({color: 0x006600});
    let cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    let line = draw(new THREE.Vector3(0,0,0), new THREE.Vector3(5, 0, 0))
    camera.position.z = 8;

    let animate = function () {
        requestAnimationFrame( animate );
        line.rotation.x += 0.01;
        line.rotation.y += 0.01;
        cube.rotation.x += 0.01;
	    cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    };

    animate();
}
//window.addEventListener('deviceorientation', handleOrientation);

$(document).ready(function() {
    init3JS();
});