import { useState, type ReactNode } from 'react';
import { useLanguage } from '../../../i18n';
import type { HairEditorState } from '../../../lib/hair/editorState';
import { SLOTS, type HairStyleSlot } from '../../../lib/hair/faces';
import { HairSegmentOverride, HairStrand, nextJointStyle } from '../../../lib/hair/strand';
import { MIN_SEGMENT_LENGTH, resizeLength, resizeSegments } from '../../../lib/hair/limits';
import { BALD_PRESET_ID, presetIds } from '../../../lib/hair/presets';
import { ActionRow, ChoiceRow, ColorRow, InfoRow, NumberRow, StepperRow, type Axis } from './InspectorRows';
import { formatText, Panel, SectionTitle } from './editorUi';

const OFFSET_STEP = 0.05;
const ANGLE_STEP = 1;
const MAX_BEND = 720;
const MAX_TWIST = 360;
const MAX_SEGMENT_SCALE = 4;

interface HairInspectorProps {
    state: HairEditorState;
    onLimit: () => void;
    className?: string;
}

function nextSlot(current: HairStyleSlot, excluded: HairStyleSlot): HairStyleSlot {
    let next = current;
    for (let i = 0; i < SLOTS.length; i++) {
        next = SLOTS[(next.index + 1) % SLOTS.length];
        if (next !== excluded) return next;
    }
    return current;
}

export default function HairInspector({ state, onLimit, className = '' }: HairInspectorProps) {
    const { t } = useLanguage();
    const [copySource, setCopySource] = useState<HairStyleSlot>(SLOTS[1]);
    const tr = (key: string) => t(`editor.${key}`);
    const styleName = (slot: HairStyleSlot) => tr(`style${slot.index}`);

    const strand = state.selectedStrand();
    const rows: ReactNode[] = [];
    let key = 0;
    const signature = `${state.slot.index}:${state.selectedFace?.key ?? '-'}:${state.selectedIndex}:${state.selectedSegment}`;
    const push = (node: ReactNode) => rows.push(<div key={`${signature}:${key++}`}>{node}</div>);

    const strandNumber = (label: string, axis: Axis, min: number, max: number, step: number, integer: boolean,
                          getter: (strand: HairStrand) => number, setter: (strand: HairStrand, value: number) => void, defaultValue: number) => {
        push(
            <NumberRow
                state={state}
                label={label}
                axis={axis}
                min={min}
                max={max}
                step={step}
                integer={integer}
                value={strand ? getter(strand) : defaultValue}
                defaultValue={defaultValue}
                onLimit={onLimit}
                onChange={(value) => state.modifySelected((target) => setter(target, value))}
            />
        );
    };

    const segmentNumber = (label: string, axis: Axis, min: number, max: number, step: number,
                           getter: (override: HairSegmentOverride) => number, setter: (override: HairSegmentOverride, value: number) => void, defaultValue: number) => {
        const override = strand ? strand.getOverride(state.selectedSegment) : undefined;
        push(
            <NumberRow
                state={state}
                label={label}
                axis={axis}
                min={min}
                max={max}
                step={step}
                value={override ? getter(override) : defaultValue}
                defaultValue={defaultValue}
                onLimit={onLimit}
                onChange={(value) => state.modifySelected((target) => {
                    const segmentOverride = target.getOrCreateOverride(state.selectedSegment);
                    setter(segmentOverride, value);
                    if (segmentOverride.isIdentity()) target.removeOverride(segmentOverride.index);
                })}
            />
        );
    };

    const strandTitle = state.selectedFace ? formatText(tr('strand'), { face: state.selectedFace.key, index: state.selectedIndex + 1 }) : '';

    if (!strand) {
        const slot = state.slot;
        const source = copySource === slot ? nextSlot(slot, slot) : copySource;
        const style = state.style();
        const totalSegments = style.getTotalSegmentCount();
        const presetLabel = state.presetId <= 0 ? tr('presetCustom')
            : state.presetId === BALD_PRESET_ID ? tr('presetBald') : formatText(tr('presetNamed'), { id: state.presetId });
        push(<SectionTitle>{tr('sectionHair')}</SectionTitle>);
        push(
            <StepperRow
                label={tr('preset')}
                value={presetLabel}
                onStep={(direction) => {
                    const ids = presetIds();
                    const index = ids.indexOf(state.presetId);
                    const next = index < 0 ? (direction > 0 ? 0 : ids.length - 1) : ((index + direction) % ids.length + ids.length) % ids.length;
                    state.applyPreset(ids[next]);
                }}
            />
        );
        push(
            <ColorRow
                state={state}
                label={tr('globalColor')}
                value={state.globalColor()}
                fallback={state.globalColor()}
                autoLabel={tr('colorAuto')}
                onChange={(hex) => state.setGlobalColor(hex)}
            />
        );
        push(<SectionTitle>{styleName(slot)}</SectionTitle>);
        push(<InfoRow tone="text" text={formatText(tr('strandsInfo'), { count: style.getVisibleStrandCount() })} />);
        push(<InfoRow tone={totalSegments > state.limits.maxTotalSegments ? 'warning' : 'text'} text={formatText(tr('segmentsInfo'), { count: totalSegments, max: state.limits.maxTotalSegments })} />);
        push(<ChoiceRow label={tr('copyFrom')} value={styleName(source)} onNext={() => setCopySource(nextSlot(source, slot))} />);
        push(<ActionRow actions={[
            { label: tr('copyStyle'), onClick: () => state.copyStyleFrom(source) },
            { label: tr('clearStyle'), onClick: () => state.clearStyle() },
        ]} />);
        push(<SectionTitle>{tr('sectionHelp')}</SectionTitle>);
        for (const help of ['helpSelect', 'helpGrow', 'helpRotate', 'helpCurve', 'helpSegments', 'helpRemoveSegment', 'helpOrbit', 'helpBody', 'helpReset', 'helpKeys']) {
            push(<InfoRow text={tr(help)} />);
        }
    } else if (!strand.isVisible()) {
        push(<SectionTitle>{strandTitle}</SectionTitle>);
        push(<InfoRow text={tr('emptySlot')} />);
        push(<ActionRow actions={[
            { label: tr('addStrand'), onClick: () => state.addStrandToSelectedSlot() },
            { label: tr('paste'), onClick: () => state.pasteStrand(), disabled: !state.hasStrandClipboard() },
        ]} />);
    } else {
        const limits = state.limits;
        const maxOffset = limits.maxRootOffset;
        const maxWidth = limits.maxWidth;
        const maxSegments = limits.maxSegments;
        const maxLength = limits.maxLength;

        push(<SectionTitle>{strandTitle}</SectionTitle>);
        push(<ActionRow actions={[
            { label: tr('copy'), onClick: () => state.copyStrand() },
            { label: tr('paste'), onClick: () => state.pasteStrand(), disabled: !state.hasStrandClipboard() },
            { label: tr('toAll'), onClick: () => state.copyStrandToOtherStyles() },
            { label: tr('clear'), onClick: () => state.clearSelectedStrand() },
        ]} />);

        push(<SectionTitle>{tr('sectionTransform')}</SectionTitle>);
        strandNumber(tr('offsetX'), 'x', -maxOffset, maxOffset, OFFSET_STEP, false, (s) => s.offsetX, (s, v) => s.setOffset(v, s.offsetY, s.offsetZ), 0);
        strandNumber(tr('offsetY'), 'y', -maxOffset, maxOffset, OFFSET_STEP, false, (s) => s.offsetY, (s, v) => s.setOffset(s.offsetX, v, s.offsetZ), 0);
        strandNumber(tr('offsetZ'), 'z', -maxOffset, maxOffset, OFFSET_STEP, false, (s) => s.offsetZ, (s, v) => s.setOffset(s.offsetX, s.offsetY, v), 0);
        strandNumber(tr('rotationX'), 'x', -180, 180, ANGLE_STEP, false, (s) => s.rotationX, (s, v) => s.setRotation(v, s.rotationY, s.rotationZ), state.baseRotation(0));
        strandNumber(tr('rotationY'), 'y', -180, 180, ANGLE_STEP, false, (s) => s.rotationY, (s, v) => s.setRotation(s.rotationX, v, s.rotationZ), state.baseRotation(1));
        strandNumber(tr('rotationZ'), 'z', -180, 180, ANGLE_STEP, false, (s) => s.rotationZ, (s, v) => s.setRotation(s.rotationX, s.rotationY, v), state.baseRotation(2));

        push(<SectionTitle>{tr('sectionShape')}</SectionTitle>);
        strandNumber(tr('segments'), null, 1, maxSegments, 1, true, (s) => s.segments, (s, v) => resizeSegments(s, Math.round(v), maxSegments, maxLength), HairStrand.DEFAULT_SEGMENTS);
        strandNumber(tr('length'), null, MIN_SEGMENT_LENGTH, maxLength, 0.1, false, (s) => s.length, (s, v) => resizeLength(s, v, maxSegments, maxLength), HairStrand.DEFAULT_LENGTH);
        strandNumber(tr('falloff'), null, HairStrand.MIN_LENGTH_RATIO, 2, 0.01, false, (s) => s.lengthRatio, (s, v) => s.setLengthRatio(v), 1);
        strandNumber(tr('width'), null, 0.25, maxWidth, OFFSET_STEP, false, (s) => s.width, (s, v) => s.setWidth(v), HairStrand.DEFAULT_WIDTH);
        strandNumber(tr('depth'), null, 0.25, maxWidth, OFFSET_STEP, false, (s) => s.depth, (s, v) => s.setDepth(v), HairStrand.DEFAULT_DEPTH);
        strandNumber(tr('taper'), null, HairStrand.MIN_TAPER, HairStrand.MAX_TAPER, 0.01, false, (s) => s.taper, (s, v) => s.setTaper(v), 1);
        strandNumber(tr('taperCurve'), null, HairStrand.MIN_TAPER_CURVE, HairStrand.MAX_TAPER_CURVE, 0.05, false, (s) => s.taperCurve, (s, v) => s.setTaperCurve(v), 1);
        push(
            <ChoiceRow
                label={tr('joints')}
                value={tr(`joints${strand.jointStyle}`)}
                onNext={() => {
                    state.recordStep();
                    state.modifySelected((s) => s.setJointStyle(nextJointStyle(s.jointStyle)));
                }}
                onReset={() => {
                    state.recordStep();
                    state.modifySelected((s) => s.setJointStyle('BLOCKS'));
                }}
            />
        );

        push(<SectionTitle>{tr('sectionCurve')}</SectionTitle>);
        strandNumber(tr('bendX'), 'x', -MAX_BEND, MAX_BEND, ANGLE_STEP, false, (s) => s.bendX, (s, v) => s.setBend(v, s.bendY, s.bendZ), 0);
        strandNumber(tr('bendY'), 'y', -MAX_BEND, MAX_BEND, ANGLE_STEP, false, (s) => s.bendY, (s, v) => s.setBend(s.bendX, v, s.bendZ), 0);
        strandNumber(tr('bendZ'), 'z', -MAX_BEND, MAX_BEND, ANGLE_STEP, false, (s) => s.bendZ, (s, v) => s.setBend(s.bendX, s.bendY, v), 0);
        strandNumber(tr('twist'), null, -MAX_TWIST, MAX_TWIST, ANGLE_STEP, false, (s) => s.twist, (s, v) => s.setTwist(v), 0);

        push(<SectionTitle>{tr('sectionColor')}</SectionTitle>);
        push(
            <ColorRow
                state={state}
                label={tr('color')}
                value={strand.color}
                fallback={state.style().globalColor}
                autoLabel={tr('colorAuto')}
                onChange={(hex) => state.modifySelected((s) => s.setColor(hex))}
            />
        );
        push(
            <ColorRow
                state={state}
                label={tr('tipColor')}
                value={strand.tipColor}
                fallback={strand.color ?? state.style().globalColor}
                autoLabel={tr('colorAuto')}
                onChange={(hex) => state.modifySelected((s) => s.setTipColor(hex))}
            />
        );

        if (state.selectedSegment >= 0) {
            const override = strand.getOverride(state.selectedSegment);
            const maxSegmentOffset = HairSegmentOverride.MAX_OFFSET;
            push(<SectionTitle>{formatText(tr('segment'), { index: state.selectedSegment + 1 })}</SectionTitle>);
            push(<ActionRow actions={[{ label: tr('resetSegment'), onClick: () => state.resetSelectedSegment() }]} />);
            segmentNumber(tr('offsetX'), 'x', -maxSegmentOffset, maxSegmentOffset, OFFSET_STEP, (o) => o.offsetX, (o, v) => o.setOffset(v, o.offsetY, o.offsetZ), 0);
            segmentNumber(tr('offsetY'), 'y', -maxSegmentOffset, maxSegmentOffset, OFFSET_STEP, (o) => o.offsetY, (o, v) => o.setOffset(o.offsetX, v, o.offsetZ), 0);
            segmentNumber(tr('offsetZ'), 'z', -maxSegmentOffset, maxSegmentOffset, OFFSET_STEP, (o) => o.offsetZ, (o, v) => o.setOffset(o.offsetX, o.offsetY, v), 0);
            segmentNumber(tr('rotationX'), 'x', -180, 180, ANGLE_STEP, (o) => o.rotationX, (o, v) => o.setRotation(v, o.rotationY, o.rotationZ), 0);
            segmentNumber(tr('rotationY'), 'y', -180, 180, ANGLE_STEP, (o) => o.rotationY, (o, v) => o.setRotation(o.rotationX, v, o.rotationZ), 0);
            segmentNumber(tr('rotationZ'), 'z', -180, 180, ANGLE_STEP, (o) => o.rotationZ, (o, v) => o.setRotation(o.rotationX, o.rotationY, v), 0);
            segmentNumber(tr('lengthScale'), null, HairSegmentOverride.MIN_SCALE, MAX_SEGMENT_SCALE, 0.01, (o) => o.lengthScale, (o, v) => o.setLengthScale(v), 1);
            segmentNumber(tr('widthScale'), null, HairSegmentOverride.MIN_SCALE, MAX_SEGMENT_SCALE, 0.01, (o) => o.widthScale, (o, v) => o.setWidthScale(v), 1);
            segmentNumber(tr('depthScale'), null, HairSegmentOverride.MIN_SCALE, MAX_SEGMENT_SCALE, 0.01, (o) => o.depthScale, (o, v) => o.setDepthScale(v), 1);
            push(
                <ColorRow
                    state={state}
                    label={tr('color')}
                    value={override ? override.color : null}
                    fallback={strand.color ?? state.style().globalColor}
                    autoLabel={tr('colorAuto')}
                    onChange={(hex) => state.modifySelected((s) => {
                        const segmentOverride = s.getOrCreateOverride(state.selectedSegment);
                        segmentOverride.setColor(hex);
                        if (segmentOverride.isIdentity()) s.removeOverride(segmentOverride.index);
                    })}
                />
            );
        }
    }

    return (
        <Panel title={tr('inspector')} className={className}>
            <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3">{rows}</div>
        </Panel>
    );
}
