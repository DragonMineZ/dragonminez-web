import { useMemo } from 'react';
import * as THREE from 'three';
import type { StrandData } from '../lib/nbt_reader';

interface HairStrandProps {
    strand: StrandData;
    basePosition: [number, number, number];
    color: number;
    isSSJ?: boolean;
}

const UNIT_SCALE = 0.0625;
const SIZE_DECAY = 0.85;
const DEG_TO_RAD = Math.PI / 180;

interface HairSegmentProps {
    index: number;
    maxLength: number;
    bw: number;
    bh: number;
    bd: number;
    ls: number;
    cx: number;
    cy: number;
    cz: number;
    material: THREE.Material;
}

function HairSegment({ index, maxLength, bw, bh, bd, ls, cx, cy, cz, material }: HairSegmentProps) {
    if (index >= maxLength) return null;

    const s = Math.pow(SIZE_DECAY, index);
    const h = bh * s * ls;
    const meshY = h / 2;

    if (index === 0) {
        return (
            <group>
                <mesh position={[0, meshY, 0]} material={material}>
                    <boxGeometry args={[bw * s, h, bd * s]} />
                </mesh>
                <group position={[0, h, 0]} rotation={[cx, cy, cz]}>
                    <HairSegment
                        index={index + 1}
                        maxLength={maxLength}
                        bw={bw} bh={bh} bd={bd} ls={ls}
                        cx={cx} cy={cy} cz={cz}
                        material={material}
                    />
                </group>
            </group>
        );
    }

    return (
        <>
            <mesh position={[0, meshY, 0]} material={material}>
                <boxGeometry args={[bw * s, h, bd * s]} />
            </mesh>
            <group position={[0, h, 0]} rotation={[cx, cy, cz]}>
                <HairSegment
                    index={index + 1}
                    maxLength={maxLength}
                    bw={bw} bh={bh} bd={bd} ls={ls}
                    cx={cx} cy={cy} cz={cz}
                    material={material}
                />
            </group>
        </>
    );
}

export default function HairStrand({ strand, basePosition, color, isSSJ = false }: HairStrandProps) {
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

    return (
        <group
            position={[
                basePosition[0] * UNIT_SCALE,
                basePosition[1] * UNIT_SCALE,
                basePosition[2] * UNIT_SCALE
            ]}
            rotation={initialRotation}
            scale={initialScale}
        >
            <HairSegment
                index={0}
                maxLength={length}
                bw={bw} bh={bh} bd={bd} ls={ls}
                cx={cx} cy={cy} cz={cz}
                material={material}
            />
        </group>
    );
}

                </group>
            )}
        </group>
    );
}
