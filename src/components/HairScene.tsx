import { useMemo } from 'react';
import HairBase from './HairBase';
import HairStrand from './HairStrand';
import { getStrandsForFace } from '../lib/nbt_reader';
import type { HairFormData, StrandData } from '../lib/nbt_reader';

interface HairSceneProps {
    hairData: HairFormData;
    isSSJ?: boolean;
    headY?: number;
    headScaleX?: number;
    headScaleY?: number;
    headScaleZ?: number;
}

const FACE_COLS = 4;

function getStrandBasePosition(face: string, index: number): [number, number, number] {
    const positions = [-3.0, -1.0, 1.0, 3.0];
    const yOffsets = [0.0, -1.5, -3.0, -4.5];

    const row = Math.floor(index / FACE_COLS);
    const col = index % FACE_COLS;
    const gridX = positions[col % 4];
    const gridZ = positions[row % 4];
    const rowYOffset = yOffsets[row % 4];

    switch (face) {
        case 'F': return [gridX, 7.25, -4.0];
        case 'B': return [gridX, 7.25 + rowYOffset, 4.0];
        case 'L': return [-3.95, 7.25 + rowYOffset, gridX];
        case 'R': return [3.95, 7.25 + rowYOffset, -gridX];
        case 'T': return [gridX, 7.85, gridZ];
        default: return [0, 0, 0];
    }
}

export default function HairScene({ 
    hairData, 
    isSSJ = false,
    headY = 0.25,
    headScaleX = 1,
    headScaleY = 1,
    headScaleZ = 1
}: HairSceneProps) {
    const hairColor = useMemo(() => {
        if (isSSJ) return 0xFFE89E;

        const colorKeys = ['Color', 'GlobalColor', 'gc'] as const;
        for (const key of colorKeys) {
            const val = (hairData as Record<string, unknown>)[key];
            if (typeof val === 'number' && val >= 0) return val;
            if (typeof val === 'string') return parseInt(val.replace('#', ''), 16);
        }
        return 0x000000;
    }, [hairData, isSSJ]);

    const faces = ['F', 'B', 'L', 'R', 'T'] as const;

    const strandsByFace = useMemo(() => {
        const result: Record<string, StrandData[]> = {};
        for (const face of faces) {
            const strands = getStrandsForFace(hairData, face);
            result[face] = strands;
        }
        return result;
    }, [hairData]);

    return (
        <group scale={5}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 7]} intensity={0.8} />

            <group>
                <mesh position={[0, headY, 0]} scale={[headScaleX, headScaleY, headScaleZ]}>
                    <boxGeometry args={[0.5, 0.5, 0.5]} />
                    <meshLambertMaterial color={0xe0aa94} />
                </mesh>

                <group position={[0, headY, 0]}>
                    <HairBase color={hairColor} />
                </group>
            </group>

            <group position={[0, headY, 0]}>
                {faces.map((face) =>
                    strandsByFace[face].map((strand, index) => (
                        <HairStrand
                            key={`${face}-${index}`}
                            strand={strand}
                            basePosition={getStrandBasePosition(face, index)}
                            color={hairColor}
                            isSSJ={isSSJ}
                        />
                    ))
                )}
            </group>
        </group>
    );
}
