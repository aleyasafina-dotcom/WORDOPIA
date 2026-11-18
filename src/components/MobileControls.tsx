import React, { useRef, useState } from 'react';
import { ArrowUp, Footprints, Hand } from 'lucide-react';
import type { MobileControlInput } from './NexusWorldCanvas.tsx';

interface MobileControlsProps {
  mobileInputRef: React.MutableRefObject<MobileControlInput>;
  canInteract: boolean;
  onTriggerInteract: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  mobileInputRef,
  canInteract,
  onTriggerInteract,
}) => {
  const padRef = useRef<HTMLDivElement>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [sprintOn, setSprintOn] = useState(false);

  const handleJoystickMove = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.38;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnobOffset({ x: dx, y: dy });
    mobileInputRef.current.moveX = dx / maxR;
    mobileInputRef.current.moveY = -dy / maxR; // Pushing stick up moves forward
  };

  const resetJoystick = () => {
    setKnobOffset({ x: 0, y: 0 });
    mobileInputRef.current.moveX = 0;
    mobileInputRef.current.moveY = 0;
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex items-end justify-between p-4 md:p-6">
      {/* Bottom-Left Virtual Joystick */}
      <div
        ref={padRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          handleJoystickMove(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType === 'touch') {
            handleJoystickMove(e.clientX, e.clientY);
          }
        }}
        onPointerUp={resetJoystick}
        onPointerCancel={resetJoystick}
        className="pointer-events-auto relative flex h-28 w-28 touch-none items-center justify-center rounded-full border-2 border-[#00C8F0]/45 bg-[#101C35]/75 shadow-xl"
        aria-label="Kayu ria pergerakan"
      >
        <div
          className="h-12 w-12 rounded-full border-2 border-[#F4F8FF] bg-[#00C8F0]/80 shadow-md"
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          }}
        />
      </div>

      {/* Bottom-Right Action Buttons (Run, Jump, Interact) */}
      <div className="pointer-events-auto flex items-end gap-2.5">
        <button
          type="button"
          onClick={() => {
            const next = !sprintOn;
            setSprintOn(next);
            mobileInputRef.current.running = next;
          }}
          className={`flex h-12 w-14 flex-col items-center justify-center rounded-2xl border text-[10px] font-bold ${
            sprintOn
              ? 'border-[#A5F05A] bg-[#A5F05A] text-[#101C35]'
              : 'border-[#00C8F0]/45 bg-[#101C35]/85 text-[#F4F8FF]'
          }`}
        >
          <Footprints className="h-4 w-4" />
          <span>Lari</span>
        </button>

        <button
          type="button"
          onPointerDown={() => {
            mobileInputRef.current.jumpQueued = true;
          }}
          className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-[#00C8F0]/60 bg-[#101C35]/85 text-[10px] font-bold text-[#00C8F0] active:scale-95"
        >
          <ArrowUp className="h-5 w-5" />
          <span>Lompat</span>
        </button>

        <button
          type="button"
          onClick={onTriggerInteract}
          className={`flex h-16 w-16 flex-col items-center justify-center rounded-2xl border text-[10px] font-extrabold shadow-lg transition-transform active:scale-95 ${
            canInteract
              ? 'border-[#A5F05A] bg-gradient-to-br from-[#00C8F0] to-[#A5F05A] text-[#101C35]'
              : 'border-[#F4F8FF]/20 bg-[#101C35]/75 text-[#F4F8FF]/60'
          }`}
        >
          <Hand className="h-5 w-5" />
          <span>Interaksi</span>
        </button>
      </div>
    </div>
  );
};
