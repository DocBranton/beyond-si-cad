import { useEffect, useRef } from "react";
import * as THREE from "three";

export function Viewport({ meshes }: { meshes: Array<{ vertices: number[]; normals: number[]; triangles: number[] }> }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);
    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 10000);
    camera.position.set(200, 150, 200);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(100, 200, 100);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404060));

    const group = new THREE.Group();
    for (const m of meshes) {
      if (!m.vertices?.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(m.vertices, 3));
      if (m.normals?.length) geo.setAttribute("normal", new THREE.Float32BufferAttribute(m.normals, 3));
      geo.setIndex(m.triangles);
      geo.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({ color: 0x4aa3ff, metalness: 0.2, roughness: 0.6 });
      group.add(new THREE.Mesh(geo, mat));
    }
    scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    camera.position.copy(center).add(new THREE.Vector3(size, size * 0.6, size));
    camera.lookAt(center);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      group.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [meshes]);

  return <div ref={ref} className="viewport" />;
}
