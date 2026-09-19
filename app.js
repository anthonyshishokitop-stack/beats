async function createInstrumental(style, bpm, durationSec) {
  return await Tone.Offline(({ transport }) => {
    transport.bpm.value = bpm;

    // Instruments
    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 }
    }).toDestination();

    const snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0 }
    }).toDestination();

    const hihat = new Tone.MetalSynth({
      frequency: 400,
      envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
    }).toDestination();
    hihat.volume.value = -18;

    const logDrum = new Tone.MembraneSynth({
      pitchDecay: 0.08, octaves: 3,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.1, release: 0.3 }
    }).toDestination();
    logDrum.volume.value = -6;

    const keys = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.4, sustain: 0.3, release: 0.8 }
    }).toDestination();
    keys.volume.value = -10;

    const bass = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.4 },
      filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3, baseFrequency: 100, octaves: 2.5 }
    }).toDestination();
    bass.volume.value = -8;

    const stepTime = (60 / bpm) / 4; // 16th note duration
    const totalSteps = Math.ceil((durationSec * bpm) / 60) * 4;

    for (let i = 0; i < totalSteps; i++) {
      const t = i * stepTime;
      const beatPos = i % 16;

      // Kick
      if (style === 'gqom') {
        if ([0, 3, 6, 10, 12].includes(beatPos)) {
          kick.triggerAttackRelease('C1', '8n', t);
        }
      } else if (style === 'amapiano' || style === 'afrohouse') {
        if (beatPos % 4 === 0) {
          kick.triggerAttackRelease('C1', '8n', t);
        }
      } else {
        if (beatPos === 0 || beatPos === 8) {
          kick.triggerAttackRelease('C1', '8n', t);
        }
      }

      // Snare
      if (beatPos === 4 || beatPos === 12) {
        snare.triggerAttackRelease('8n', t + 0.001); // tiny offset
      }

      // Hi-hat
      if (style === 'amapiano' || style === 'afrohouse') {
        if (i % 2 === 0) {
          hihat.triggerAttackRelease('32n', t + 0.002, 0.3);
        }
      } else if (i % 4 === 2) {
        hihat.triggerAttackRelease('16n', t + 0.002, 0.2);
      }

      // Log drum (Amapiano)
      if (style === 'amapiano' && [0, 6, 10, 14].includes(beatPos)) {
        const note = (beatPos === 0 || beatPos === 10) ? 'C2' : 'G1';
        logDrum.triggerAttackRelease(note, '8n', t + 0.003);
      }

      // Bass
      if (style !== 'amapiano' && (beatPos === 0 || beatPos === 8)) {
        bass.triggerAttackRelease('C2', '4n', t + 0.004);
      }
      if (style === 'kwaito' && beatPos === 4) {
        bass.triggerAttackRelease('G1', '8n', t + 0.004);
      }

      // Chords (only once per bar)
      if (beatPos === 0) {
        const chords = {
          amapiano:   [['C3','E3','G3','B3'], ['A2','C3','E3','G3']],
          kwaito:     [['C3','Eb3','G3'], ['F2','Ab2','C3']],
          gqom:       [['C3','Eb3','G3'], ['Bb2','D3','F3']],
          maskandi:   [['C3','E3','G3'], ['G2','B2','D3']],
          afrohouse:  [['C3','E3','G3','B3'], ['F2','A2','C3','E3']],
          traditional:[['C3','E3','G3'], ['F2','A2','C3']]
        };
        const prog = chords[style] || chords.amapiano;
        const chord = prog[Math.floor(i / 16) % prog.length];
        keys.triggerAttackRelease(chord, '2n', t + 0.005, 0.6);
      }
    }
  }, durationSec);
}
