import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';

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
}

function LocationMarker({ 
  lat, 
  lon, 
  country, 
  visitors, 
  orders,
  sales 
}: { 
  lat: number; 
  lon: number; 
  country: string;
  visitors: number;
  orders: number;
  sales: number;
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Convert lat/lon to 3D coordinates
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const radius = 2.05; // Slightly above globe surface
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(hovered ? 1.5 : 1);
    }
  });

  const markerSize = Math.max(0.02, Math.min(0.1, (visitors + orders) / 50));

  return (
    <group position={[x, y, z]}>
      <mesh
        ref={meshRef}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[markerSize, 16, 16]} />
        {/* @ts-ignore - react-three-fiber type mismatch */}
        <meshStandardMaterial
          color={orders > 0 ? "#22c55e" : "#3b82f6"}
          emissive={orders > 0 ? "#16a34a" : "#2563eb"}
          emissiveIntensity={hovered ? 1 : 0.5}
        />
      </mesh>
      
      {hovered && (
        <Html distanceFactor={10}>
          <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-xl min-w-[200px]">
            <div className="font-bold text-sm mb-2">{country}</div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pengunjung:</span>
                <span className="font-medium">{visitors}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pesanan:</span>
                <span className="font-medium">{orders}</span>
              </div>
              {sales > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium">Rp {sales.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
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
      meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <>
      {/* Main Globe */}
      <Sphere ref={meshRef} args={[2, 64, 64]}>
        {/* @ts-ignore - react-three-fiber type mismatch */}
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.7}
          metalness={0.2}
        />
      </Sphere>

      {/* Location Markers */}
      {locations.map((location, index) => (
        <LocationMarker
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
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, -5, -5]} intensity={0.5} />
    </>
  );
}

export default function InteractiveGlobe({ locations }: InteractiveGlobeProps) {
  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden bg-slate-950">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <Globe locations={locations} />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3}
          maxDistance={10}
          autoRotate={true}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
