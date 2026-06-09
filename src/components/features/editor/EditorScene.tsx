/**
 * Full 3D scene for the Hair Editor — head + hair base + editor strands.
 * Wraps EditorStrand per visible strand and wires up click-to-select.
 */
import { Suspense } from "react";
import type { CustomHairModel, HairFace } from "../../../lib/hair/model";
import { HAIR_FACES, FACE_INFO, getStrandBasePosition } from "../../../lib/hair/model";
import EditorStrand from "./EditorStrand";
import HairBase from "../viewer/HairBase";

interface EditorSceneProps {
    hair: CustomHairModel;
    selectedFace: HairFace;
    selectedIndex: number | null;
    showBase: boolean;
    physics: boolean;
    onSelectStrand: (face: HairFace, index: number) => void;
}

export default function EditorScene({
    hair,
    selectedFace,
    selectedIndex,
    showBase,
    physics,
    onSelectStrand,
}: EditorSceneProps) {
    const globalColor = hair.globalColor;
    const globalColorInt = parseInt(globalColor.replace("#", ""), 16);

    const hasSelection = selectedIndex !== null;

    return (
        <group scale={5} rotation={[0, Math.PI, 0]}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 7]} intensity={0.8} />
            <directionalLight position={[-5, 5, -7]} intensity={0.3} />

            {/* Head */}
            <mesh position={[0, 0.25, 0]}>
                <boxGeometry args={[0.5, 0.5, 0.5]} />
                <meshLambertMaterial color={0xe0aa94} />
            </mesh>

            {/* Hair base cap */}
            {showBase && (
                <Suspense fallback={null}>
                    <group position={[0, 0.25, 0]}>
                        <HairBase color={globalColorInt} />
                    </group>
                </Suspense>
            )}

            {/* Strands for every face */}
            {HAIR_FACES.map((face) =>
                hair.strands[face].map((strand, index) => {
                    const isSelected =
                        face === selectedFace && index === selectedIndex;
                    return (
                        <EditorStrand
                            key={`${face}-${index}`}
                            strand={strand}
                            basePosition={getStrandBasePosition(face, index)}
                            globalColor={globalColor}
                            isSelected={isSelected}
                            hasSelection={hasSelection}
                            physics={physics}
                            onSelect={() => onSelectStrand(face, index)}
                        />
                    );
                }),
            )}
        </group>
    );
}
