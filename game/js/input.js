// Input for Nusantara Skies: keyboard (WASD/arrows) plus mouse steering.
// Mouse: hold the left button and move — the pointer's offset from screen
// centre banks and pitches the plane; the wheel trims the throttle.
export function createInput(canvas) {
  const input = {
    throttleUp: false,
    throttleDown: false,
    pitchUp: false,
    pitchDown: false,
    bankLeft: false,
    bankRight: false,
    mouseActive: false,
    mouseX: 0, // -1..1, + is right
    mouseY: 0, // -1..1, + is down
    wheelDelta: 0,
    pressedKeys: new Set(),
  };

  const KEYMAP = {
    KeyW: 'throttleUp',
    KeyS: 'throttleDown',
    ArrowUp: 'pitchUp',
    ArrowDown: 'pitchDown',
    ArrowLeft: 'bankLeft',
    ArrowRight: 'bankRight',
    KeyA: 'bankLeft',
    KeyD: 'bankRight',
  };
  // Keys physically held right now (drives the held-state fields above);
  // kept separate from pressedKeys so a quick tap is never lost to keyup.
  const heldKeys = new Set();

  function keyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    input.pressedKeys.add(event.code);
    heldKeys.add(event.code);
    const field = KEYMAP[event.code];
    if (field) input[field] = true;
  }

  function keyUp(event) {
    heldKeys.delete(event.code);
    const field = KEYMAP[event.code];
    if (field) {
      // Only release when no other key still maps to the same field.
      const stillHeld = [...heldKeys].some((code) => KEYMAP[code] === field);
      if (!stillHeld) input[field] = false;
    }
    // Deliberately NOT deleting from pressedKeys here: a quick tap's keyup
    // can land before the next animation frame, and wiping the press would
    // silently swallow the tap. consumePress() owns pressedKeys.
  }

  function mouseMove(event) {
    if (!input.mouseActive) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    input.mouseX = Math.max(-1, Math.min(1, (event.clientX - cx) / (rect.width * 0.32)));
    input.mouseY = Math.max(-1, Math.min(1, (event.clientY - cy) / (rect.height * 0.32)));
  }

  function mouseDown(event) {
    if (event.button !== 0) return;
    input.mouseActive = true;
    mouseMove(event);
  }

  function mouseUp() {
    input.mouseActive = false;
    input.mouseX = 0;
    input.mouseY = 0;
  }

  function wheel(event) {
    event.preventDefault();
    input.wheelDelta -= event.deltaY;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('mousedown', mouseDown);
  window.addEventListener('mouseup', mouseUp);
  window.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('wheel', wheel, { passive: false });

  // One-shot key presses (Enter to start, P pause, M mute, R restart, Space drop).
  input.consumePress = function consumePress(code) {
    if (input.pressedKeys.has(code)) {
      input.pressedKeys.delete(code);
      return true;
    }
    return false;
  };

  return input;
}
