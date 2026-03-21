import { useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

interface HairBaseProps {
    color?: number;
}

const HAIR_OFFSET = 0.255;

const faceConfigs = [
    { name: 'up', pos: [0, HAIR_OFFSET, 0] as [number, number, number], rot: [-Math.PI / 2, 0, 0] as [number, number, number], file: '/hair/hair_base_up.png' },
    { name: 'down', pos: [0, -HAIR_OFFSET, 0] as [number, number, number], rot: [Math.PI / 2, 0, 0] as [number, number, number], file: '/hair/hair_base_down.png' },
    { name: 'front', pos: [0, 0, -HAIR_OFFSET] as [number, number, number], rot: [0, 0, 0] as [number, number, number], file: '/hair/hair_base_front.png' },
    { name: 'back', pos: [0, 0, HAIR_OFFSET] as [number, number, number], rot: [0, Math.PI, 0] as [number, number, number], file: '/hair/hair_base_back.png' },
    { name: 'right', pos: [HAIR_OFFSET, 0, 0] as [number, number, number], rot: [0, -Math.PI / 2, 0] as [number, number, number], file: '/hair/hair_base_right.png' },
    { name: 'left', pos: [-HAIR_OFFSET, 0, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number], file: '/hair/hair_base_left.png' },
];

function HairBasePlane({ position, rotation, texturePath, color }: {
    position: [number, number, number];
    rotation: [number, number, number];
    texturePath: string;
    color: THREE.Color;
}) {
    const texture = useTexture(texturePath);
    
    useMemo(() => {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
    }, [texture]);

    return (
        <mesh position={position} rotation={rotation}>
            <planeGeometry args={[0.51, 0.51]} />
            <meshBasicMaterial 
                map={texture} 
                transparent 
                side={THREE.DoubleSide}
                color={color}
            />
        </mesh>
    );
}

export default function HairBase({ color = 0x000000 }: HairBaseProps) {
    const hairColor = useMemo(() => new THREE.Color(color), [color]);

    return (
        <group>
            {faceConfigs.map((face) => (
                <HairBasePlane
                    key={face.name}
                    position={face.pos}
                    rotation={face.rot}
                    texturePath={face.file}
                    color={hairColor}
                />
            ))}
        </group>
    );
}
