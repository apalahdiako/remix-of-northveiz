import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';

const EARTH_TEXTURE_DARK = "https://unpkg.com/three-globe/example/img/earth-dark.jpg";
const EARTH_TEXTURE_LIGHT = "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";

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
  const color = hasOrders ? "#00d97e" : "#007bff";
  const emissive = hasOrders ? "#00d97e" : "#007bff";

  return (
    <group position={pos}>
      {/* Main marker */}
      <mesh
        ref={meshRef}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[markerSize, 16, 16]} />
        {/* @ts-ignore */}
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={hovered ? 2 : 1} />
      </mesh>

      {/* Pulsing glow ring */}
      <mesh ref={pulseRef}>
        <ringGeometry args={[markerSize * 1.5, markerSize * 2.5, 32]} />
        {/* @ts-ignore */}
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Order ripple effect */}
      {hasOrders && (
        <RippleEffect size={markerSize} />
      )}

      {/* Glassmorphism tooltip */}
      {hovered && (
        <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div className="bg-black/70 backdrop-blur-xl border border-white/20 rounded-xl p-3 min-w-[180px] shadow-2xl">
            <div className="font-bold text-sm text-white mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {country}
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Pengunjung</span>
                <span className="text-white font-medium">{visitors}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Pesanan</span>
                <span className="text-[#00d97e] font-medium">{orders}</span>
              </div>
              {sales > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Revenue</span>
                  <span className="text-[#ffaa00] font-medium">Rp {sales.toLocaleString()}</span>
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
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ref2}>
        <ringGeometry args={[size * 3, size * 3.5, 32]} />
        {/* @ts-ignore */}
        <meshBasicMaterial color="#00d97e" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

function Globe({ locations, isDark }: { locations: LocationData[]; isDark: boolean }) {
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

  const wireColor = isDark ? "#1e3a5f" : "#94a3b8";
  const textureUrl = isDark ? EARTH_TEXTURE_DARK : EARTH_TEXTURE_LIGHT;
  const earthTexture = useLoader(THREE.TextureLoader, textureUrl);

  return (
    <>
      {/* Main globe with real Earth texture */}
      <Sphere ref={meshRef} args={[2, 64, 64]}>
        {/* @ts-ignore */}
        <meshStandardMaterial map={earthTexture} roughness={0.85} metalness={0.05} />
      </Sphere>

      {/* Wireframe overlay */}
      <Sphere args={[2.015, 32, 32]}>
        {/* @ts-ignore */}
        <meshBasicMaterial color={wireColor} wireframe transparent opacity={0.08} />
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

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -5, -5]} intensity={0.3} color="#007bff" />
      <pointLight position={[5, -3, 2]} intensity={0.2} color="#00d97e" />
    </>
  );
}

export default function InteractiveGlobe({ locations, isDark = true }: InteractiveGlobeProps) {
  const bgColor = isDark ? "#0a0d14" : "#e2e8f0";

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden" style={{ backgroundColor: bgColor }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <Globe locations={locations} isDark={isDark} />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3}
          maxDistance={10}
          autoRotate={true}
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
}
