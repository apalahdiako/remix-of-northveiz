import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';

const EARTH_TEXTURE_DARK = "https://unpkg.com/three-globe/example/img/earth-dark.jpg";

interface LocationData {
  country_code: string;
  country_name: string;
  latitude: number;
  longitude: number;
  visitor_count: number;
  order_count: number;
  total_sales: number;
}

interface InteractiveGlobeProps {
  locations: LocationData[];
  isDark?: boolean;
}

function latLonToVec3(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

function PulsingMarker({ lat, lon, country, visitors, orders, sales }: {
  lat: number; lon: number; country: string; visitors: number; orders: number; sales: number;
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const pos = latLonToVec3(lat, lon, 2.05);
  const hasOrders = orders > 0;

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(hovered ? 1.8 : 1);
    }
    if (pulseRef.current) {
      const t = clock.getElapsedTime();
      const scale = 1 + Math.sin(t * 3) * 0.5;
      pulseRef.current.scale.setScalar(scale);
      (pulseRef.current.material as THREE.MeshBasicMaterial).opacity = 0.6 - Math.sin(t * 3) * 0.4;
    }
  });

  const markerSize = Math.max(0.03, Math.min(0.12, (visitors + orders) / 30));
  // Teal/cyan color scheme
  const color = hasOrders ? "#10b981" : "#06b6d4";
  const emissive = hasOrders ? "#10b981" : "#06b6d4";

  return (
    <group position={pos}>
      <mesh
        ref={meshRef}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[markerSize, 16, 16]} />
        {/* @ts-ignore */}
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={hovered ? 3 : 1.5} />
      </mesh>

      <mesh ref={pulseRef}>
        <ringGeometry args={[markerSize * 1.5, markerSize * 2.5, 32]} />
        {/* @ts-ignore */}
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {hasOrders && <RippleEffect size={markerSize} />}

      {hovered && (
        <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div className="bg-black/80 backdrop-blur-xl border border-emerald-500/20 rounded-xl p-3 min-w-[180px] shadow-2xl shadow-emerald-500/10">
            <div className="font-bold text-sm text-white mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
              {country}
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Pengunjung</span>
                <span className="text-cyan-300 font-medium">{visitors}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Pesanan</span>
                <span className="text-emerald-400 font-medium">{orders}</span>
              </div>
              {sales > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Revenue</span>
                  <span className="text-emerald-300 font-medium">Rp {sales.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function RippleEffect({ size }: { size: number }) {
  const ref1 = useRef<THREE.Mesh>(null);
  const ref2 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    [ref1, ref2].forEach((ref, i) => {
      if (ref.current) {
        const phase = t * 2 + i * Math.PI;
        const s = 1 + (Math.sin(phase) + 1) * 2;
        ref.current.scale.setScalar(s);
        (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.4 - (s - 1) * 0.1);
      }
    });
  });

  return (
    <>
      <mesh ref={ref1}>
        <ringGeometry args={[size * 2, size * 2.5, 32]} />
        {/* @ts-ignore */}
        <meshBasicMaterial color="#10b981" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ref2}>
        <ringGeometry args={[size * 3, size * 3.5, 32]} />
        {/* @ts-ignore */}
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

// Floating particles for depth
function Particles() {
  const ref = useRef<THREE.Points>(null);
  const count = 200;

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 15;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
  }

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.02;
      ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.01) * 0.1;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      {/* @ts-ignore */}
      <pointsMaterial size={0.02} color="#10b981" transparent opacity={0.3} sizeAttenuation />
    </points>
  );
}

function Globe({ locations }: { locations: LocationData[] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 0, 5);
  }, [camera]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0008;
    }
  });

  const earthTexture = useLoader(THREE.TextureLoader, EARTH_TEXTURE_DARK);

  return (
    <>
      {/* Main globe */}
      <Sphere ref={meshRef} args={[2, 64, 64]}>
        {/* @ts-ignore */}
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.9}
          metalness={0.05}
          color="#1a3a2a"
        />
      </Sphere>

      {/* Teal wireframe overlay for country borders */}
      <Sphere args={[2.015, 48, 48]}>
        {/* @ts-ignore */}
        <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.06} />
      </Sphere>

      {/* Atmosphere glow */}
      <Sphere args={[2.12, 64, 64]}>
        {/* @ts-ignore */}
        <meshBasicMaterial color="#0d9488" transparent opacity={0.04} side={THREE.BackSide} />
      </Sphere>

      {/* Location markers */}
      {locations.map((location, index) => (
        <PulsingMarker
          key={index}
          lat={location.latitude}
          lon={location.longitude}
          country={location.country_name}
          visitors={location.visitor_count}
          orders={location.order_count}
          sales={location.total_sales}
        />
      ))}

      {/* Particles */}
      <Particles />

      {/* Lighting - teal ambient */}
      <ambientLight intensity={0.3} color="#0d9488" />
      <directionalLight position={[5, 5, 5]} intensity={0.6} color="#e2e8f0" />
      <pointLight position={[-5, -5, -5]} intensity={0.4} color="#10b981" />
      <pointLight position={[5, -3, 2]} intensity={0.2} color="#06b6d4" />
      <pointLight position={[0, 5, 0]} intensity={0.15} color="#0d9488" />
    </>
  );
}

export default function InteractiveGlobe({ locations, isDark = true }: InteractiveGlobeProps) {
  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{
        height: "clamp(350px, 50vw, 650px)",
        background: "radial-gradient(ellipse at center, #0a1f1a 0%, #080b11 50%, #050709 100%)",
      }}
    >
      {/* Corner brackets decorative */}
      <div className="relative w-full h-full">
        <div className="absolute top-4 left-4 w-6 h-6 border-t border-l border-emerald-800/40 rounded-tl-sm z-10" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t border-r border-emerald-800/40 rounded-tr-sm z-10" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b border-l border-emerald-800/40 rounded-bl-sm z-10" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b border-r border-emerald-800/40 rounded-br-sm z-10" />

        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <Globe locations={locations} />
          <OrbitControls
            enableZoom={true}
            enablePan={false}
            minDistance={3.5}
            maxDistance={10}
            autoRotate={true}
            autoRotateSpeed={0.3}
          />
        </Canvas>
      </div>
    </div>
  );
}
