let utmZone = {"num": undefined, "letter": undefined}; //make sure we use the same UTM zone for all data
let dist = 2.085;
let roll = null;
let pitch = null;
let yaw = null;

function lockScreen() {
    let promise = null;
    promise = screen.orientation.lock(screen.orientation.type);
    promise
        .then(function () {
            console.error('screen lock acquired');
        })
        .catch(function (err) {
            console.error('cannot acquire orientation lock: ' + err);
        });
}

function handleOrientation(event) {
    if (event.alpha === null ||  event.beta === null || event.gamma === null) {
        return alert("no orientation support");
    }
    let localIMU = document.getElementById("localIMU");
    yaw = 360 - event.alpha;
    pitch = event.beta;
    roll = event.gamma;
    $("#roll").html(roll.toFixed(2));
    $("#pitch").html(pitch.toFixed(2));
    $("#yaw").html(yaw.toFixed(2));
    // let x = parseFloat($("#x").val());
    // let y = parseFloat($("#y").val());
    // let z = parseFloat($("#z").val());
    // let dist = parseFloat($("#d").val());
    //let position = rodloc([x, y, z], dist, pitch, roll, -yaw);
     //$("#position").html("X " + position[0].toFixed(2) + ", Y " + position[1].toFixed(2) + ", Z " + position[2].toFixed(2));
}

function init3JS() {
    let canvas = document.getElementById("canvas");
    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera(75, canvas.offsetWidth/canvas.offsetHeight, 0.1, 1000);

    let light = new THREE.PointLight(0xEEEEEE);
    light.position.set(10, 0, 10);
    scene.add(light);
    let lightAmb = new THREE.AmbientLight(0x777777);
    scene.add(lightAmb);

    renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    canvas.appendChild(renderer.domElement);
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    renderer.setClearColor(0xeeeeee, 1);

    // x=x0 + distance * cos (angleZ) * sin (angleY)
    // Y=y0 + distance * sin (Anglez)
    // Z=z0 + distance * cos (angleZ) * cos (angleY)

    let material = new THREE.MeshStandardMaterial({color: 0x006600});
    let geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(0, 0, 0));
    geometry.vertices.push(new THREE.Vector3(0, 0, -5));
    let line = new THREE.Line(geometry, material);
    scene.add(line);

    geometry = new THREE.BoxGeometry(1, 1, 1);
    let cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // let plane = new THREE.GridHelper(10, 10);
    // scene.add(plane);
    let axesHelper = new THREE.AxisHelper(3);
    scene.add(axesHelper);

    camera.position.set(7, 7, 7);
    camera.lookAt(new THREE.Vector3(0,0,0));

    let animate = function () {
        requestAnimationFrame(animate);
        line.rotation.x = toRadians(roll);
        line.rotation.y = toRadians(pitch);
        line.rotation.z = toRadians(yaw);
        cube.rotation.x = toRadians(roll);
        cube.rotation.y = toRadians(pitch);
        cube.rotation.z = toRadians(yaw);
        renderer.render(scene, camera);
    };

    animate();

}

$(document).ready(function() {
    init3JS();
    $("#localIMU").on("change", function () {
        toggleFullScreen();
        if (this.checked === true) {
            lockScreen();
            window.addEventListener("deviceorientation", handleOrientation);
        }
        else {
            window.removeEventListener("deviceorientation", handleOrientation);
        }
    });
});