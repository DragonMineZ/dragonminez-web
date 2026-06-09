/**
 * 3D strand renderer for the editor — adapted from HairStrand.tsx
 * but consumes the typed HairStrandModel instead of raw NBT objects.
 * Supports click-to-select and opacity isolation for selected strand.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { HairStrandModel } from "../../../lib/hair/model";
import { UNIT_SCALE, SIZE_DECAY } from "../../../lib/hair/model";

const DEG_TO_RAD = Math.PI / 180;

interface SegmentProps {
    index: number;
    length: number;
    bh: number;
    bw: number;
    bd: number;
    ls: number;
    prevOffset: number;
    cx: number;
    cy: number;
    cz: number;
    material: THREE.Material;
}

function HairSegment({
    index,
    length,
    bh,
    bw,
    bd,
    ls,
    prevOffset,
    cx,
    cy,
    cz,
    material,
}: SegmentProps) {
    if (index >= length) return null;

    const s = Math.pow(SIZE_DECAY, index);
    const h = bh * s * ls;
    const w = bw * s;
    const d = bd * s;

    const segRot: [number, number, number] = index > 0 ? [cx, cy, cz] : [0, 0, 0];

    return (
        <group position={[0, prevOffset, 0]} rotation={segRot}>
            <mesh position={[0, h / 2, 0]} material={material}>
                <boxGeometry args={[w, h, d]} />
            </mesh>
            <HairSegment
                index={index + 1}
                length={length}
                bh={bh}
                bw={bw}
                bd={bd}
                ls={ls}
                prevOffset={h}
                cx={cx}
                cy={cy}
                cz={cz}
                material={material}
            />
        </group>
    );
}

export interface EditorStrandProps {
    strand: HairStrandModel;
    basePosition: [number, number, number];
    globalColor: string;
    isSelected: boolean;
    hasSelection: boolean;
    physics: boolean;
    onSelect?: () => void;
}

export default function EditorStrand({
    strand,
    basePosition,
    globalColor,
    isSelected,
    hasSelection,
    physics,
    onSelect,
}: EditorStrandProps) {
    // Group whose rotation is mutated imperatively each frame for the idle sway
    // (avoids re-rendering React for the animation).
    const swayRef = useRef<THREE.Group>(null);

    const length = strand.length;
    const colorHex = strand.color ?? globalColor;
    const colorInt = parseInt(colorHex.replace("#", ""), 16);

    // Opacity: when something else is selected → 0.35, selected or nothing → 1
    const opacity = hasSelection && !isSelected ? 0.35 : 1.0;
    const transparent = opacity < 1.0;

    const material = useMemo(
        () =>
            new THREE.MeshLambertMaterial({
                color: isNaN(colorInt) ? 0x000000 : colorInt,
                transparent,
                opacity,
                depthWrite: !transparent,
            }),
        [colorInt, opacity, transparent],
    );

    // Physics idle sway — gentle per-strand sinusoid, phase-offset by strand id
    // like the in-game renderer (id * 13).
    const strandId = strand.id;
    useFrame(({ clock }) => {
        const group = swayRef.current;
        if (!group) return;
        if (!physics) {
            group.rotation.x = 0;
            group.rotation.z = 0;
            return;
        }
        const t = clock.getElapsedTime();
        const speed = 1.2;
        const amp = 3 * DEG_TO_RAD;
        group.rotation.x = Math.sin(t * speed + strandId * 13) * amp;
        group.rotation.z = Math.sin(t * speed * 0.7 + strandId * 7 + 1.5) * amp * 0.6;
    });

    if (length <= 0) return null;

    const bw = strand.cubeWidth * UNIT_SCALE;
    const bh = strand.cubeHeight * UNIT_SCALE;
    const bd = strand.cubeDepth * UNIT_SCALE;
    const ls = strand.lengthScale;
    const cx = strand.curveX * DEG_TO_RAD;
    const cy = strand.curveY * DEG_TO_RAD;
    const cz = strand.curveZ * DEG_TO_RAD;

    const position: [number, number, number] = [
        basePosition[0] * UNIT_SCALE,
        basePosition[1] * UNIT_SCALE,
        basePosition[2] * UNIT_SCALE,
    ];

    const rotation: [number, number, number] = [
        strand.rotX * DEG_TO_RAD,
        strand.rotY * DEG_TO_RAD,
        strand.rotZ * DEG_TO_RAD,
    ];

    const scale: [number, number, number] = [strand.scaleX, strand.scaleY, strand.scaleZ];

    return (
        <group
            position={position}
            rotation={rotation}
            scale={scale}
            onPointerDown={(e) => {
                e.stopPropagation();
                onSelect?.();
            }}
        >
            <group ref={swayRef}>
                <HairSegment
                    index={0}
                    length={length}
                    bh={bh}
                    bw={bw}
                    bd={bd}
                    ls={ls}
                    prevOffset={0}
                    cx={cx}
                    cy={cy}
                    cz={cz}
                    material={material}
                />
            </group>
        </group>
    );
}
