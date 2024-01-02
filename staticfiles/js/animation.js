import {
    MeshPhysicalMaterial,
    TextureLoader,
    FloatType,
    PMREMGenerator,
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    Color,
    ACESFilmicToneMapping,
    sRGBEncoding,
    Mesh,
    SphereGeometry,
    Clock,
    Vector3,
    Group,
} from "https://cdn.skypack.dev/three@0.137";
import { RGBELoader } from "https://cdn.skypack.dev/three-stdlib@2.8.5/loaders/RGBELoader";
import { OrbitControls } from "https://cdn.skypack.dev/three-stdlib@2.8.5/controls/OrbitControls";
import { GLTFLoader } from "https://cdn.skypack.dev/three-stdlib@2.8.5/loaders/GLTFLoader";

const scene = new Scene();

const camera = new PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 15, 50);

const renderer = new WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.outputEncoding = sRGBEncoding;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.dampingFactor = 0.05;
controls.enableDamping = true;
controls.enablePan = false;
controls.enableZoom = false;

(async function () {

    let pmrem = new PMREMGenerator(renderer);
    let envmapTexture = await new RGBELoader()
        .setDataType(FloatType)
        .loadAsync("static/assets/kloofendal_43d_clear_puresky_4k.hdr");
    let envMap = pmrem.fromEquirectangular(envmapTexture).texture;

    let textures = {
        bump: await new TextureLoader().loadAsync("static/assets/earthbump.jpg"),
        map: await new TextureLoader().loadAsync("static/assets/earthmap.jpg"),
        spec: await new TextureLoader().loadAsync("static/assets/earthspec.jpg"),
    }

    let plane = (await new GLTFLoader().loadAsync("static/assets/air_force_one_-_boeing_747_vc-25ab.glb")).scene.children[0];
    let planesData = [
        makePlane(plane, envMap, scene),
        makePlane(plane, envMap, scene),
        makePlane(plane, envMap, scene),
        makePlane(plane, envMap, scene),
        makePlane(plane, envMap, scene),
    ]

    let sphere = new Mesh(
        new SphereGeometry(10, 70, 70),
        new MeshPhysicalMaterial({
            map: textures.map,
            roughnessMap: textures.spec,
            bumpMap: textures.bump,
            bumpScale: 0.3,
            envMap,
            envMapIntensity: 0.3,
            sheen: 1,
            sheenRoughness: 0.75,
            sheenColor: new Color("#ff8a00").convertSRGBToLinear(),
            clearcoat: 0.5,
        }),
    );
    sphere.rotation.y += Math.PI * 1.25;
    sphere.receiveShadow = true;
    scene.add(sphere);

    let clock = new Clock();

    renderer.setAnimationLoop(() => {

        let delta = clock.getDelta();

        planesData.forEach(planeData => {
            let plane = planeData.group;

            plane.position.set(0, 0, 0);
            plane.rotation.set(0, 0, 0);
            plane.updateMatrixWorld();

            planeData.rot += delta * 0.25;
            plane.rotateOnAxis(planeData.randomAxis, planeData.randomAxisRot); // random axis
            plane.rotateOnAxis(new Vector3(0, 1, 0), planeData.rot);    // y-axis rotation
            plane.rotateOnAxis(new Vector3(0, 0, 1), planeData.rad);    // this decides the radius
            plane.translateY(planeData.yOff);
            plane.rotateOnAxis(new Vector3(1, 0, 0), +Math.PI * 0.5);
        });

        controls.update();
        renderer.render(scene, camera);
    });
})();

function randomNumber() {
    return Math.random() * 2 + 1;
}

function makePlane(planeMesh, envMap, scene) {
    let plane = planeMesh.clone();
    plane.scale.set(0.09, 0.09, 0.09);
    plane.position.set(0, 0, 0);
    plane.rotation.set(Math.PI, 0, 0);
    plane.updateMatrixWorld();

    plane.traverse((object) => {
        if (object instanceof Mesh) {
            object.material.envMap = envMap;
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });

    let group = new Group();
    group.add(plane);

    scene.add(group);

    return {
        group,
        yOff: 10.5 + Math.random() * 1.0,
        rot: Math.PI * 2,
        rad: Math.random() * Math.PI * 0.45 + Math.PI * 0.05,
        randomAxis: new Vector3(randomNumber(), randomNumber(), randomNumber()).normalize(),
        randomAxisRot: Math.random() * Math.PI * 2,
    };
}