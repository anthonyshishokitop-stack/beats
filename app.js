// SA Instrumental AI — pure client-side generator
// Uses Tone.js for style-aware synthesis

let currentPlayer = null;
let isPlaying = false;
let offlineBuffer = null;

const stylePresets = {
  amapiano: {
    name: "Amapiano",
    bpmDefault: 112,
    description: "deep log drum bass, warm Rhodes piano, soft shakers, hypnotic groove"
  },
  kwaito: {
    name: "Kwaito",
    bpmDefault: 100,
    description: "heavy kick, simple bass loop, township energy, laid-back swing"
  },
  gqom: {
    name: "Gqom",
    bpmDefault: 125,
    description: "broken beats, industrial percussion, dark atmosphere, Durban energy"
  },
  maskandi: {
    name: "Maskandi",
    bpmDefault: 95,
    description: "acoustic guitar patterns, traditional Zulu rhythm, concertina-like melody"
  },
  afrohouse: {
    name: "Afro House",
    bpmDefault: 120,
    description: "deep four-on-the-floor, soulful keys, African percussion layers"
  },
  traditional: {
    name: "Traditional / Marabi",
    bpmDefault: 90,
    description: "piano-driven marabi feel, warm chords, gentle swing"
  }
};

// DOM
const styleSelect = document.getElementById('style');
const promptEl = document.getElementById('prompt');
const bpmInput = document.getElementById('bpm');
const durationSelect = document.getElementById('duration');
const generateBtn = document.getElementById('generateBtn');
const resultSection = document.getElementById('result');
const trackTitle = document.getElementById('trackTitle');
const optimizedPrompt = document.getElementById('optimizedPrompt');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const downloadBtn = document.getElementById('downloadBtn');
const visualizer = document.getElementById('visualizer');

// Quick chips
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    promptEl.value = chip.dataset.prompt;
  });
});

// Update BPM when style changes
styleSelect.addEventListener('change', () => {
  const preset = stylePresets[styleSelect.value];
  bpmInput.value = preset.bpmDefault;
});

// Generate
generateBtn.addEventListener('click', async () => {
  if (isPlaying) stopPlayback();

  const style = styleSelect.value;
  const userPrompt = promptEl.value.trim() || stylePresets[style].description;
  const bpm = parseInt(bpmInput.value) || stylePresets[style].bpmDefault;
  const durationSec = parseInt(durationSelect.value) || 24;

  generateBtn.disabled = true;
  generateBtn.querySelector('.btn-text').textContent = 'Generating...';
  generateBtn.querySelector('.spinner').classList.remove('hidden');

  try {
    await Tone.start();
    const optimized = buildOptimizedPrompt(style, userPrompt, bpm);
    optimizedPrompt.textContent = optimized;
    trackTitle.textContent = `${stylePresets[style].name} Instrumental`;

    // Create the sequence
    offlineBuffer = await createInstrumental(style, bpm, durationSec);

    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    console.error(err);
    alert('Generation failed. Please try again.');
  } finally {
    generateBtn.disabled = false;
    generateBtn.querySelector('.btn-text').textContent = 'Generate Instrumental';
    generateBtn.querySelector('.spinner').classList.add('hidden');
  }
});

playBtn.addEventListener('click', () => {
  if (!offlineBuffer) return;
  playBuffer(offlineBuffer);
});

stopBtn.addEventListener('click', stopPlayback);

downloadBtn.addEventListener('click', () => {
  if (!offlineBuffer) return;
  downloadWav(offlineBuffer, `SA-${styleSelect.value}-${Date.now()}.wav`);
});

// ---------- Core generation ----------
function buildOptimizedPrompt(style, userPrompt, bpm) {
  const preset = stylePresets[style];
  return `South African ${preset.name}, ${preset.description}, ${userPrompt}, ${bpm} BPM, instrumental only, high quality production`;
}

async function createInstrumental(style, bpm, durationSec) {
  const totalBeats = Math.ceil((durationSec * bpm) / 60);
  const steps = totalBeats * 4; // 16th notes

  // Create offline context
  const offline = new Tone.OfflineContext(2, durationSec, 44100);
  Tone.setContext(offline);

  // Instruments
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 4,
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
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5
  }).toDestination();
  hihat.volume.value = -18;

  // Log-drum style bass (for Amapiano)
  const logDrum = new Tone.MembraneSynth({
    pitchDecay: 0.08,
    octaves: 3,
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.001, decay: 0.4, sustain: 0.1, release: 0.3 }
  }).toDestination();
  logDrum.volume.value = -6;

  // Rhodes / piano
  const keys = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.02, decay: 0.4, sustain: 0.3, release: 0.8 }
  }).toDestination();
  keys.volume.value = -10;

  // Simple bass for other styles
  const bass = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.4 },
    filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3, baseFrequency: 100, octaves: 2.5 }
  }).toDestination();
  bass.volume.value = -8;

  // Reverb
  const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.25 }).toDestination();
  keys.connect(reverb);
  logDrum.connect(reverb);

  const now = 0;
  const beat = 60 / bpm;

  // Pattern generation based on style
  for (let i = 0; i < steps; i++) {
    const t = now + (i * beat / 4);
    const beatPos = i % 16;

    // Kick
    if (style === 'gqom') {
      if ([0, 3, 6, 10, 12].includes(beatPos)) kick.triggerAttackRelease('C1', '8n', t);
    } else if (style === 'amapiano' || style === 'afrohouse') {
      if (beatPos % 4 === 0) kick.triggerAttackRelease('C1', '8n', t);
    } else {
      if (beatPos === 0 || beatPos === 8) kick.triggerAttackRelease('C1', '8n', t);
    }

    // Snare / clap
    if (beatPos === 4 || beatPos === 12) {
      snare.triggerAttackRelease('8n', t);
    }

    // Hi-hat
    if (style === 'amapiano' || style === 'afrohouse') {
      if (i % 2 === 0) hihat.triggerAttackRelease('32n', t, 0.3);
    } else if (i % 4 === 2) {
      hihat.triggerAttackRelease('16n', t, 0.2);
    }

    // Log drum (Amapiano signature)
    if (style === 'amapiano') {
      if ([0, 6, 10, 14].includes(beatPos)) {
        const note = beatPos === 0 ? 'C2' : beatPos === 6 ? 'G1' : 'C2';
        logDrum.triggerAttackRelease(note, '8n', t);
      }
    }

    // Bass line
    if (style !== 'amapiano' && (beatPos === 0 || beatPos === 8)) {
      bass.triggerAttackRelease('C2', '4n', t);
    }
    if (style === 'kwaito' && beatPos === 4) {
      bass.triggerAttackRelease('G1', '8n', t);
    }

    // Chords / melody every bar
    if (beatPos === 0) {
      const chords = {
        amapiano: [['C3','E3','G3','B3'], ['A2','C3','E3','G3']],
        kwaito: [['C3','Eb3','G3'], ['F2','Ab2','C3']],
        gqom: [['C3','Eb3','G3'], ['Bb2','D3','F3']],
        maskandi: [['C3','E3','G3'], ['G2','B2','D3']],
        afrohouse: [['C3','E3','G3','B3'], ['F2','A2','C3','E3']],
        traditional: [['C3','E3','G3'], ['F2','A2','C3']]
      };
      const prog = chords[style] || chords.amapiano;
      const chord = prog[Math.floor(i / 16) % prog.length];
      keys.triggerAttackRelease(chord, '2n', t, 0.6);
    }
  }

  // Render
  const buffer = await offline.render();
  Tone.setContext(Tone.context); // restore normal context
  return buffer;
}

function playBuffer(buffer) {
  stopPlayback();
  const player = new Tone.Player(buffer).toDestination();
  player.start();
  currentPlayer = player;
  isPlaying = true;

  // Simple visualizer
  startVisualizer();
  player.onstop = () => {
    isPlaying = false;
    stopVisualizer();
  };
}

function stopPlayback() {
  if (currentPlayer) {
    currentPlayer.stop();
    currentPlayer.dispose();
    currentPlayer = null;
  }
  isPlaying = false;
  stopVisualizer();
}

function startVisualizer() {
  visualizer.innerHTML = '';
  for (let i = 0; i < 32; i++) {
    const bar = document.createElement('span');
    bar.style.height = '10%';
    visualizer.appendChild(bar);
  }
  const bars = visualizer.querySelectorAll('span');
  const interval = setInterval(() => {
    if (!isPlaying) {
      clearInterval(interval);
      return;
    }
    bars.forEach(bar => {
      bar.style.height = (15 + Math.random() * 70) + '%';
    });
  }, 100);
  visualizer._interval = interval;
}

function stopVisualizer() {
  if (visualizer._interval) clearInterval(visualizer._interval);
  visualizer.querySelectorAll('span').forEach(b => b.style.height = '8%');
}

function downloadWav(buffer, filename) {
  // Convert Tone.AudioBuffer to WAV
  const audioBuffer = buffer.get();
  const numOfChan = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let sample, offset = 0, pos = 0;

  // Write WAV header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(audioBuffer.sampleRate);
  setUint32(audioBuffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164); // "data"
  setUint32(length - 44);

  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  while (pos < audioBuffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][pos]));
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0;
      view.setInt16(44 + offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  const blob = new Blob([bufferArray], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
  function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }
}