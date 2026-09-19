// SA Instrumental AI — fixed version (works on GitHub Pages)

let currentPlayer = null;
let isPlaying = false;
let offlineBuffer = null;

const stylePresets = {
  amapiano: { name: "Amapiano", bpmDefault: 112, description: "deep log drum bass, warm Rhodes piano, soft shakers, hypnotic groove" },
  kwaito:   { name: "Kwaito",   bpmDefault: 100, description: "heavy kick, simple bass loop, township energy, laid-back swing" },
  gqom:     { name: "Gqom",     bpmDefault: 125, description: "broken beats, industrial percussion, dark atmosphere, Durban energy" },
  maskandi: { name: "Maskandi", bpmDefault: 95,  description: "acoustic guitar patterns, traditional Zulu rhythm, concertina-like melody" },
  afrohouse:{ name: "Afro House",bpmDefault: 120, description: "deep four-on-the-floor, soulful keys, African percussion layers" },
  traditional:{ name: "Traditional / Marabi", bpmDefault: 90, description: "piano-driven marabi feel, warm chords, gentle swing" }
};

const styleSelect   = document.getElementById('style');
const promptEl      = document.getElementById('prompt');
const bpmInput      = document.getElementById('bpm');
const durationSelect= document.getElementById('duration');
const generateBtn   = document.getElementById('generateBtn');
const resultSection = document.getElementById('result');
const trackTitle    = document.getElementById('trackTitle');
const optimizedPrompt = document.getElementById('optimizedPrompt');
const playBtn       = document.getElementById('playBtn');
const stopBtn       = document.getElementById('stopBtn');
const downloadBtn   = document.getElementById('downloadBtn');
const visualizer    = document.getElementById('visualizer');

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => promptEl.value = chip.dataset.prompt);
});

styleSelect.addEventListener('change', () => {
  bpmInput.value = stylePresets[styleSelect.value].bpmDefault;
});

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

    const optimized = `South African ${stylePresets[style].name}, ${stylePresets[style].description}, ${userPrompt}, ${bpm} BPM, instrumental only`;
    optimizedPrompt.textContent = optimized;
    trackTitle.textContent = `${stylePresets[style].name} Instrumental`;

    offlineBuffer = await createInstrumental(style, bpm, durationSec);

    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    console.error(err);
    alert('Generation failed: ' + err.message);
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

// ---------- Fixed generation ----------
async function createInstrumental(style, bpm, durationSec) {
  return await Tone.Offline(async ({ transport }) => {
    transport.bpm.value = bpm;

    // Create instruments
    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 }
    }).toDestination();

    const snare = new Tone.NoiseSynth({
      noise: { type: "white" },
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

    const logDrum = new Tone.MembraneSynth({
      pitchDecay: 0.08,
      octaves: 3,
      oscillator: { type: "triangle" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.1, release: 0.3 }
    }).toDestination();
    logDrum.volume.value = -6;

    const keys = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.02, decay: 0.4, sustain: 0.3, release: 0.8 }
    }).toDestination();
    keys.volume.value = -10;

    const bass = new Tone.MonoSynth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.4 },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.3,
        release: 0.3,
        baseFrequency: 100,
        octaves: 2.5
      }
    }).toDestination();
    bass.volume.value = -8;

    // Helper to schedule notes safely
    const schedule = (instrument, note, duration, time) => {
      instrument.triggerAttackRelease(note, duration, time);
    };

    const step = Tone.Time("16n").toSeconds();
    const totalSteps = Math.floor(durationSec / step);

    for (let i = 0; i < totalSteps; i++) {
      const t = i * step;
      const pos = i % 16;

      // === KICK ===
      if (style === "gqom") {
        if ([0, 3, 6, 10, 12].includes(pos)) schedule(kick, "C1", "8n", t);
      } else if (style === "amapiano" || style === "afrohouse") {
        if (pos % 4 === 0) schedule(kick, "C1", "8n", t);
      } else {
        if (pos === 0 || pos === 8) schedule(kick, "C1", "8n", t);
      }

      // === SNARE ===
      if (pos === 4 || pos === 12) {
        schedule(snare, "8n", "8n", t + 0.01);
      }

      // === HI-HAT ===
      if (style === "amapiano" || style === "afrohouse") {
        if (i % 2 === 0) schedule(hihat, "32n", "32n", t + 0.02);
      } else if (pos === 2 || pos === 6 || pos === 10 || pos === 14) {
        schedule(hihat, "16n", "16n", t + 0.02);
      }

      // === LOG DRUM (Amapiano) ===
      if (style === "amapiano") {
        if (pos === 0) schedule(logDrum, "C2", "8n", t + 0.03);
        if (pos === 6) schedule(logDrum, "G1", "8n", t + 0.03);
        if (pos === 10) schedule(logDrum, "C2", "8n", t + 0.03);
        if (pos === 14) schedule(logDrum, "G1", "8n", t + 0.03);
      }

      // === BASS ===
      if (style !== "amapiano") {
        if (pos === 0 || pos === 8) schedule(bass, "C2", "4n", t + 0.04);
        if (style === "kwaito" && pos === 4) schedule(bass, "G1", "8n", t + 0.04);
      }

      // === CHORDS (once per bar) ===
      if (pos === 0) {
        const chordProgressions = {
          amapiano:   [["C3", "E3", "G3", "B3"], ["A2", "C3", "E3", "G3"]],
          kwaito:     [["C3", "Eb3", "G3"], ["F2", "Ab2", "C3"]],
          gqom:       [["C3", "Eb3", "G3"], ["Bb2", "D3", "F3"]],
          maskandi:   [["C3", "E3", "G3"], ["G2", "B2", "D3"]],
          afrohouse:  [["C3", "E3", "G3", "B3"], ["F2", "A2", "C3", "E3"]],
          traditional:[["C3", "E3", "G3"], ["F2", "A2", "C3"]]
        };

        const prog = chordProgressions[style] || chordProgressions.amapiano;
        const chord = prog[Math.floor(i / 16) % prog.length];
        keys.triggerAttackRelease(chord, "2n", t + 0.05, 0.6);
      }
    }
  }, durationSec);
}
function playBuffer(buffer) {
  stopPlayback();
  const player = new Tone.Player(buffer).toDestination();
  player.start();
  currentPlayer = player;
  isPlaying = true;
  startVisualizer();
  player.onstop = () => { isPlaying = false; stopVisualizer(); };
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
  visualizer._interval = setInterval(() => {
    if (!isPlaying) return;
    bars.forEach(b => b.style.height = (12 + Math.random() * 75) + '%');
  }, 90);
}

function stopVisualizer() {
  if (visualizer._interval) clearInterval(visualizer._interval);
  visualizer.querySelectorAll('span').forEach(b => b.style.height = '8%');
}

function downloadWav(toneBuffer, filename) {
  const audioBuffer = toneBuffer.get ? toneBuffer.get() : toneBuffer;
  const numOfChan = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels = [];
  let offset = 0, pos = 0;

  function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
  function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }

  setUint32(0x46464952); // RIFF
  setUint32(length - 8);
  setUint32(0x45564157); // WAVE
  setUint32(0x20746d66); // fmt
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(audioBuffer.sampleRate);
  setUint32(audioBuffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164); // data
  setUint32(length - 44);

  for (let i = 0; i < numOfChan; i++) channels.push(audioBuffer.getChannelData(i));

  while (pos < audioBuffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][pos]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(44 + offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
