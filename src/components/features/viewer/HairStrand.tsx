import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { StrandData } from '../../../lib/nbt_reader';

interface HairStrandProps {
    strand: StrandData;
    basePosition: [number, number, number];
    color: number;
    isSSJ?: boolean;
}

const UNIT_SCALE = 0.0625;
const SIZE_DECAY = 0.85;
const DEG_TO_RAD = Math.PI / 180;

export default function HairStrand({ strand, basePosition, color, isSSJ = false }: HairStrandProps) {
    const groupRef = useRef<THREE.Group>(null);

    const length = strand.l || 0;
    if (length <= 0) return null;

    let strandColor: number = strand.c !== undefined ? strand.c : color;
    if (typeof strand.c === 'string') {
        strandColor = parseInt((strand.c as string).replace('#', ''), 16);
    }

    const isBlack = (strandColor === 0 || strandColor === 0x000000 || strandColor === -1 || strandColor === undefined || strandColor < 0x222222);
    if (isSSJ && isBlack) strandColor = 0xFFE89E;
    if (isNaN(strandColor) || strandColor === -1) strandColor = isSSJ ? 0xFFE89E : 0x000000;

    const material = useMemo(() => 
        new THREE.MeshLambertMaterial({ color: strandColor }),
        [strandColor]
    );

    const initialRotation = useMemo<[number, number, number]>(() => [
        (strand.rx || 0) * DEG_TO_RAD,
        (strand.ry || 0) * DEG_TO_RAD,
        (strand.rz || 0) * DEG_TO_RAD
    ], [strand.rx, strand.ry, strand.rz]);

    const initialScale = useMemo<[number, number, number]>(() => [
        strand.sx || 1.0,
        strand.sy || 1.0,
        strand.sz || 1.0
    ], [strand.sx, strand.sy, strand.sz]);

    const bw = (strand.cw !== undefined ? strand.cw : 2) * UNIT_SCALE;
    const bh = (strand.ch !== undefined ? strand.ch : 2) * UNIT_SCALE;
    const bd = (strand.cd !== undefined ? strand.cd : 2) * UNIT_SCALE;
    const ls = strand.ls || 1.0;
    const cx = (strand.cx || 0) * DEG_TO_RAD;
    const cy = (strand.cy || 0) * DEG_TO_RAD;
    const cz = (strand.cz || 0) * DEG_TO_RAD;

    const boxes = useMemo(() => {
        const result: { size: [number, number, number], y: number, scale: number }[] = [];
        let currentOffset = 0;

        for (let i = 0; i < length; i++) {
            const s = Math.pow(SIZE_DECAY, i);
            const h = bh * s * ls;
            result.push({
                size: [bw * s, h, bd * s],
                y: h / 2 + currentOffset,
                scale: s
            });
            currentOffset = h;
        }
        return result;
    }, [length, bw, bh, bd, ls]);

    return (
        <group
            ref={groupRef}
            position={[
                basePosition[0] * UNIT_SCALE,
                basePosition[1] * UNIT_SCALE,
                basePosition[2] * UNIT_SCALE
            ]}
            rotation={initialRotation}
            scale={initialScale}
        >
            {boxes.map((box, i) => (
                <mesh
                    key={i}
                    position={[0, box.y, 0]}
                    material={material}
                >
                    <boxGeometry args={box.size} />
                </mesh>
            ))}
            {length > 1 && (
                <group rotation={[cx, cy, cz]}>
                    {boxes.slice(1).map((box, i) => (
                        <mesh
                            key={`child-${i}`}
                            position={[0, box.y - boxes[0].y, 0]}
                            material={material}
                        >
                            <boxGeometry args={box.size} />
                        </mesh>
                    ))}
                </group>
            )}
        </group>
    );
}
