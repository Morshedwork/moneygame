import { useId, type CSSProperties } from 'react';
import { ArrowRight, Dices, MapPin } from 'lucide-react';
import { sampleDiceRoll } from '../dice-animation';
import './mission-dice.css';

export interface MissionDiceProps {
  /** The confirmed game result. Use 0 before the first roll. */
  value: number;
  rolling: boolean;
  /** Includes the pawn's movement after the dice have settled. */
  busy: boolean;
  canRoll: boolean;
  onRoll: () => void;
  destination?: string;
  remaining?: number;
  /** A changed count also replays the small, finite result accent. */
  rollCount?: number;
  /** Stock/chance results do not move the pawn or offer another roll. */
  chance?: boolean;
  /** Shared visible-time tumble progress. One means the result has settled. */
  progress?: number;
  /** Identifies accepted rolls, including consecutive rolls of the same value. */
  rollId?: string;
}

const PIPS: Record<number, readonly number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

const steps = (count: number) => `${count} ${count === 1 ? 'step' : 'steps'}`;

/** A presentation of the authoritative roll; this component never chooses a value. */
export function MissionDice({
  value, rolling, busy, canRoll, onRoll, destination, remaining, rollCount, chance = false, progress, rollId,
}: MissionDiceProps) {
  const id = useId();
  const valid = Number.isInteger(value) && value >= 1 && value <= 6;
  const rollProgress = rolling ? Math.max(0, Math.min(1, Number.isFinite(progress) ? progress! : 0)) : 1;
  const tumbling = rolling && rollProgress < 1;
  const pose = sampleDiceRoll(valid ? value : 1, rollProgress);
  const finalPose = sampleDiceRoll(valid ? value : 1, 1);
  // CSS uses downward Y. Reflect Three.js rotations, then the fixed camera
  // below turns the upward result face toward the child.
  const rotation = ([x, y, z]: readonly number[]) => `rotateX(${-x}rad) rotateY(${y}rad) rotateZ(${-z}rad)`;
  const cubeStyle = { transform: rotation(pose.rotation), '--die-final-transform': rotation(finalPose.rotation) } as CSSProperties;
  const motionStyle = { transform: `translate3d(calc(var(--die-size) * ${pose.offsetX * .18}), calc(var(--die-size) * ${-pose.lift * .1}), calc(var(--die-size) * ${pose.offsetZ * .12})) scale(${pose.scale})` };
  const disabled = rolling || busy || !canRoll;
  const hasRemaining = typeof remaining === 'number' && Number.isFinite(remaining) && remaining >= 0;
  const toGo = hasRemaining ? Math.ceil(remaining) : undefined;
  const stop = destination?.trim();
  const count = typeof rollCount === 'number' && Number.isFinite(rollCount) && rollCount > 0
    ? Math.floor(rollCount) : undefined;
  const state = rolling ? tumbling ? 'rolling' : 'settled' : busy ? 'moving' : valid ? 'result' : 'ready';
  const headline = tumbling ? 'Rolling…' : valid ? `${chance ? 'Result:' : !busy && !stop ? 'Last roll:' : 'You rolled'} ${value}`
    : chance ? 'Ready for the result' : 'Let’s explore';
  const detail = chance ? 'Your pawn stays here.'
    : tumbling ? 'Watch the dice settle.'
    : rolling ? `${steps(value)} forward`
    : valid ? busy ? toGo !== undefined ? `${steps(toGo)} to go` : `Moving ${steps(value)}`
      : stop ? `${steps(value)} forward` : 'Ready for another adventure?'
    : canRoll ? 'A new space. A new choice.' : 'Your next move is getting ready.';

  return <section className="mission-dice" aria-label={chance ? 'Chance roll' : 'Your dice roll'}
    data-state={state} data-value={valid ? value : 0} data-chance={chance} data-settled={valid && rollProgress >= 1}>
    <div className="mission-dice-overview">
      <div className="mission-dice-stage" aria-hidden="true">
        <span className="mission-dice-shadow" style={{ opacity: pose.shadowOpacity, transform: `translateX(calc(var(--die-size) * ${pose.offsetX * .18})) scale(${pose.shadowScale})` }} />
        <div className="mission-dice-motion" style={motionStyle}>
          <div className="mission-dice-camera"><div className="mission-dice-world">
            <div className="mission-dice-cube" style={cubeStyle} data-progress={rollProgress}
              data-roll-id={rollId ?? `roll-${count ?? 0}`} data-result={valid ? value : 0} data-known={valid}>
              {[1, 2, 3, 4, 5, 6].map(face => <div className="mission-dice-face" data-face={face} key={face}>
                {Array.from({ length: 9 }, (_, index) => <i key={index} className="mission-dice-pip"
                  data-lit={PIPS[face].includes(index + 1)} />)}
                {!valid && face === 1 && <span className="mission-dice-question">?</span>}
              </div>)}
            </div>
          </div></div>
        </div>
        {valid && value === 6 && !tumbling && <span className="mission-dice-sparkles" key={`six-${rollId ?? count ?? 0}`}>
          <i /><i /><i /><i />
        </span>}
      </div>
      <div className="mission-dice-copy">
        <div className="mission-dice-eyebrow"><span>{chance ? 'Chance roll' : 'Your next move'}</span>
          {count !== undefined && <span className="mission-dice-count">Roll {count}</span>}
        </div>
        <p className="mission-dice-result" id={`${id}-result`} role="status" aria-live="polite" aria-atomic="true">{headline}</p>
        <p className="mission-dice-detail" id={`${id}-detail`}>{detail}</p>
        {stop && valid && !tumbling && !chance && <p className="mission-dice-destination">
          <MapPin size={13} aria-hidden="true" />
          <span><small>{busy ? 'Next stop' : 'Landing space'}</small><strong>{stop}</strong></span>
        </p>}
      </div>
    </div>
    {!chance && <button className="mission-dice-button" type="button" aria-label="Roll the dice"
      aria-describedby={`${id}-result ${id}-detail`} aria-busy={rolling || busy}
      disabled={disabled} onClick={() => { if (!disabled) onRoll(); }}>
      <Dices size={19} aria-hidden="true" />
      <span>Roll the dice</span>
      {rolling || busy ? <i className="mission-dice-spinner" style={{ transform: `rotate(${rollProgress * 720}deg)` }} aria-hidden="true" />
        : <ArrowRight size={17} aria-hidden="true" />}
    </button>}
  </section>;
}

export default MissionDice;
