/*
Reloop Mixtour controller script for Mixxx v2.0.0
*/

/**
 * device constants define
 */
const LED = {
  ON: 0x01,
  OFF: 0x00,
  GREEN: 0x01,
  ORANGE: 0x2B,
  GREENORANGE: 0x56,
};

const CONTROL = {
  FX: 0x01,
  LOAD: 0x02,
  HEADPHONE: 0x03,
  MODE_T: 0x04,
  MODE_C: 0x05,
  SHIFT: 0x06,
  SEEK_PUSH: 0x07,
  BACK: 0x08,
  LOOP: 0x09,
  SYNC: 0x0A,
  CUE: 0x0B,
  PLAY: 0x0C,
  C1: 0x0D,
  C2: 0x0E,
  C3: 0x0F,
  C4: 0x10,
  S_FX: 0x41,
  S_LOAD: 0x42,
  S_HEADPHONE: 0x43,
  S_MODE_T: 0x44,
  S_MODE_C: 0x45,
  S_SEEK_PUSH: 0x46,
  S_BACK: 0x47,
  S_LOOP: 0x48,
  S_SYNC: 0x49,
  S_CUR: 0x4A,
  S_PLAY: 0x4B,
  S_C1: 0x4C,
  S_C2: 0x4D,
  S_C3: 0x4E,
  S_C3: 0x4F,
};

const LED_CONTROL = {
  FX_INDICATOR: 0x00,
  FX: CONTROL.FX,
  LOAD: CONTROL.LOAD,
  HEADPHONE: CONTROL.HEADPHONE,
  MODE_T: CONTROL.MODE_T,
  MODE_C: CONTROL.MODE_C,
  SHIFT: CONTROL.SHIFT,
  BACK: CONTROL.BACK,
  LOOP: CONTROL.LOOP,
  SYNC: CONTROL.SYNC,
  CUE: CONTROL.CUE,
  PLAY: CONTROL.PLAY,
  C1: CONTROL.C1,
  C2: CONTROL.C2,
  C3: CONTROL.C3,
  C4: CONTROL.C4,
  VOLUME_INDICATOR: 0x11,
}

const HOLD = {
  NONE: 0,
  CLEAN: 1,
  DIRTY: 2,
}

const CH1 = 0x90;
const CH2 = 0x91;
/**
 * /device constants define
 */

/**
 * utils
 */
function sendMsg(midi, ch, control, value) {
  midi.sendShortMsg(ch, control, value);
};

function turn_off_led(midi, ch, control) {
  sendMsg(midi, ch, control, LED.OFF);
};

function turn_off_all_led(midi) {
  for (var i = 0x0; i <= 0x11; i++) {
    turn_off_led(midi, CH1, i);
    turn_off_led(midi, CH2, i);
  }
};
/**
 * /utils
 */

var MIXTOUR = {};

// sends the status of every item on the control surface
var ControllerStatusSysex = [0xF0, 0x26, 0x2D, 0x65, 0x22, 0xF7];

MIXTOUR.init = function () {
  // initialize Mixxx with current values on control surface
  midi.sendSysexMsg(ControllerStatusSysex, ControllerStatusSysex.length);

  MIXTOUR.sync1_hold = HOLD.NONE;
  MIXTOUR.sync2_hold = HOLD.NONE;
  MIXTOUR.play1_hold = HOLD.NONE;
  MIXTOUR.play2_hold = HOLD.NONE;
}

MIXTOUR.shutdown = function () {
  turn_off_all_led(midi);
}

MIXTOUR.rate = function (channel, control, value, status, group) {
  if (!group) { return; }

  var sign = 0;
  if (value === 0x01) {
    // plus
    sign = 1;
  } else if (value === 0x7f) {
    // minus
    sign = -1;
  } else {
    return;
  }

  const delta = sign * 1 / 16;
  const current = engine.getValue(group, "rate");
  engine.setValue(group, "rate", current + delta);
}

MIXTOUR.sync1 = function (channel, control, value, status, group) {
  if (value === 0x7f) {
    MIXTOUR.sync1_hold = HOLD.CLEAN;
    return;
  }

  if (MIXTOUR.sync1_hold !== HOLD.DIRTY) {
    engine.setValue(group, "beatsync", 1);
  }

  MIXTOUR.sync1_hold = HOLD.NONE;
}

MIXTOUR.sync2 = function (channel, control, value, status, group) {
  if (value === 0x7f) {
    MIXTOUR.sync2_hold = HOLD.CLEAN;
    return;
  }

  if (MIXTOUR.sync2_hold !== HOLD.DIRTY) {
    engine.setValue(group, "beatsync", 1);
  }

  MIXTOUR.sync2_hold = HOLD.NONE;
}


MIXTOUR.play1 = function (channel, control, value, status, group) {
  if (value === 0x7f) {
    MIXTOUR.play1_hold = HOLD.CLEAN;
    return;
  }

  if (MIXTOUR.play1_hold !== HOLD.DIRTY) {
    const current = engine.getValue(group, "play");
    engine.setValue(group, "play", current ^ 1);
  }

  MIXTOUR.play1_hold = HOLD.NONE;
}

MIXTOUR.play2 = function (channel, control, value, status, group) {
  if (value === 0x7f) {
    MIXTOUR.play2_hold = HOLD.CLEAN;
    return;
  }

  if (MIXTOUR.play2_hold !== HOLD.DIRTY) {
    const current = engine.getValue(group, "play");
    engine.setValue(group, "play", current ^ 1);
  }

  MIXTOUR.play2_hold = HOLD.NONE;
}

MIXTOUR.seek = function (channel, control, value, status, group) {
  script.midiDebug(channel, control, value, status, group);
  const sign = value == 0x01 ? 1 : -1;
  if (MIXTOUR.sync1_hold || MIXTOUR.sync2_hold) {
    const delta = sign * 1 / 16;
    const ch = MIXTOUR.sync1_hold ? "[Channel1]" : "[Channel2]";
    const current = engine.getValue(ch, "rate");
    engine.setValue(ch, "rate", current + delta);

    if (MIXTOUR.sync1_hold !== HOLD.NONE) {
      MIXTOUR.sync1_hold = HOLD.DIRTY;
    } else if (MIXTOUR.sync2_hold !== HOLD.NONE) {
      MIXTOUR.sync2_hold = HOLD.DIRTY;
    }
  }
  else if (MIXTOUR.play1_hold || MIXTOUR.play2_hold) {
    const chn = MIXTOUR.play1_hold ? 1 : 2;
    const ch = "[Channel" + chn + "]";
    if (sign > 0) {
      engine.setValue(ch, "beatjump_8_forward", 1);
    } else {
      engine.setValue(ch, "beatjump_4_backward", 1);
    }
    if (chn === 1) {
      MIXTOUR.play1_hold = HOLD.DIRTY;
    } else {
      MIXTOUR.play2_hold = HOLD.DIRTY;
    }
  }
  else {
    engine.setValue("[Library]", "MoveVertical", sign);
  }
}
