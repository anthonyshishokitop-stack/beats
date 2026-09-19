let currentPlayer = null;
let isPlaying = false;
let offlineBuffer = null;

const stylePresets = {
  amapiano:   { name: "Amapiano", bpmDefault: 112, description: "deep log drum bass, warm Rhodes piano, soft shakers, hypnotic groove" },
  kwaito:     { name: "Kwaito",   bpmDefault: 100, description: "heavy kick, simple bass loop, township energy, laid-back swing" },
  gqom:       { name: "Gqom",     bpmDefault: 125, description: "broken beats, industrial percussion, dark atmosphere, Durban energy" },
  maskandi:   { name: "Maskandi", bpmDefault: 95,  description: "acoustic guitar patterns, traditional Zulu rhythm, concertina-like melody" },
  afrohouse:  { name: "Afro House", bpmDefault: 120, description: "deep four-on-the-floor, soulful keys, African percussion layers" },
  traditional:{ name: "Traditional / Marabi", bpmDefault: 90, description: "piano-driven marabi feel, warm chords, gentle swing" }
};

const styleSelect    = document.getElementById('style');
const promptEl       = document.getElementById('prompt');
const bpmInput       = document.getElementById('bpm');
const durationSelect = document.getElementById('duration');
const generateBtn    = document.getElementById('generateBtn');
const resultSection  = document.getElementById('result');
const trackTitle     = document.getElementById('trackTitle');
const optimizedPrompt= document.getElementById('optimizedPrompt');
const playBtn        = document.getElementById('playBtn');
const stopBtn        = document.getElementById('stopBtn');
const downloadBtn    = document.getElementById('downloadBtn');
const visualizer     = document.getElementById('visualizer');

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    promptEl.value = chip.dataset.prompt;
  });
});

styleSelect.addEventListener('change', () => {
  bpmInput.value = stylePresets[styleSelect.value].bpmDefault;
});

generateBtn.addEventListener('click', async () => {
  if (isPlaying) stopPlayback();

  const style = styleSelect.value;
  const userPrompt = promptEl.value.trim() || stylePresets[style].description;
  const bpm = parseInt(bpmInput.value) || stylePresets[style].bpmDefault;
  const durationSec = parseInt(durationSelect.value) || 16;

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
    alert('Generation failed: ' + (err.message || err));
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

// ---------- Reliable generation ----------
async function createInstrumental(style, bpm, durationSec) {
  const buffer = await Tone.Offline(({ transport }) => {
    transport.bpm.value = bpm;

    // Simple instruments only
    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 5,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.1 }
    }).toDestination();
    kick.volume.value = -4;

    const snare = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0 }
    }).toDestination();
    snare.volume.value = -10;

    const hat = new Tone.MetalSynth({
      frequency: 350,
      envelope: { attack: 0.001, decay: 0.06, release: 0.01 },
      harmonicity: 4.5,
      modulationIndex: 20,
      resonance: 3000,
      octaves: 1.2
    }).toDestination();
    hat.volume.value = -20;

    const bass = new Tone.MembraneSynth({
      pitchDecay: 0.1,
      octaves: 3,
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 0.4 }
    }).toDestination();
    bass.volume.value = -6;

    const keys = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.03, decay: 0.5, sustain: 0.25, release: 1 }
    }).toDestination();
    keys.volume.value = -12;

    // Time helpers
    const t16 = Tone.Time("16n").toSeconds();
    const bars = Math.ceil((durationSec * bpm) / (60 * 4)); // 4 beats per bar
    const total16ths = bars * 16;

    // Chord progressions
    const chords = {
      amapiano:   [["C3","E3","G3","B3"], ["A2","C3","E3","G3"], ["F2","A2","C3","E3"], ["G2","B2","D3","F3"]],
      kwaito:     [["C3","Eb3","G3"], ["F2","Ab2","C3"], ["Bb2","D3","F3"], ["G2","Bb2","D3"]],
      gqom:       [["C3","Eb3","G3"], ["Bb2","D3","F3"], ["Ab2","C3","Eb3"], ["G2","Bb2","D3"]],
      maskandi:   [["C3","E3","G3"], ["G2","B2","D3"], ["A2","C3","E3"], ["F2","A2","C3"]],
      afrohouse:  [["C3","E3","G3","B3"], ["F2","A2","C3","E3"], ["G2","B2","D3","F3"], ["A2","C3","E3","G3"]],
      traditional:[["C3","E3","G3"], ["F2","A2","C3"], ["G2","B2","D3"], ["A2","C3","E3"]]
    };
    const prog = chords[style] || chords.amapiano;

    for (let i = 0; i < total16ths; i++) {
      const time = i * t16;
      const pos = i % 16;          // position inside the bar
      const bar = Math.floor(i / 16);

      // Kick
      if (style === "gqom") {
        if ([0, 3, 6, 10, 12].includes(pos)) kick.triggerAttackRelease("C1", "8n", time);
      } else if (style === "amapiano" || style === "afrohouse") {
        if (pos % 4 === 0) kick.triggerAttackRelease("C1", "8n", time);
      } else {
        if (pos === 0 || pos === 8) kick.triggerAttackRelease("C1", "8n", time);
      }

      // Snare / clap
      if (pos === 4 || pos === 12) {
        snare.triggerAttackRelease("8n", time + 0.01);
      }

      // Hi-hat
      if (style === "amapiano" || style === "afrohouse") {
        if (i % 2 === 0) hat.triggerAttackRelease("32n", time + 0.015, 0.25);
      } else if (pos === 2 || pos === 6 || pos === 10 || pos === 14) {
        hat.triggerAttackRelease("16n", time + 0.015, 0.2);
      }

      // Log-drum style bass (Amapiano)
      if (style === "amapiano") {
        if (pos === 0)  bass.triggerAttackRelease("C2", "8n", time + 0.02);
        if (pos === 6)  bass.triggerAttackRelease("G1", "8n", time + 0.02);
        if (pos === 10) bass.triggerAttackRelease("C2", "8n", time + 0.02);
        if (pos === 14) bass.triggerAttackRelease("G1", "8n", time + 0.02);
      }

      // Simple bass for other styles
      if (style !== "amapiano") {
        if (pos === 0 || pos === 8) bass.triggerAttackRelease("C2", "4n", time + 0.02);
        if (style === "kwaito" && pos === 4) bass.triggerAttackRelease("G1", "8n", time + 0.02);
      }

      // Chords – once per bar
      if (pos === 0) {
        const chord = prog[bar % prog.length];
        keys.triggerAttackRelease(chord, "2n", time + 0.03, 0.55);
      }
    }
  }, durationSec);

  return buffer;
}

function playBuffer(buffer) {
  stopPlayback();
  const player = new Tone.Player(buffer).toDestination();
  player.start();
  currentPlayer = player;
  isPlaying = true;
  startVisualizer();
  player.onstop = () => {
    isPlaying = false;
    stopVisualizer();
  };
}

function stopPlayback() {
  if (currentPlayer) {
    try { currentPlayer.stop(); } catch(e) {}
    currentPlayer.dispose();
    currentPlayer = null;
  }
  isPlaying = false;
  stopVisualizer();
}

function startVisualizer() {
  visualizer.innerHTML = "";
  for (let i = 0; i < 32; i++) {
    const bar = document.createElement("span");
    bar.style.height = "10%";
    visualizer.appendChild(bar);
  }
  const bars = visualizer.querySelectorAll("span");
  visualizer._interval = setInterval(() => {
    if (!isPlaying) return;
    bars.forEach(b => b.style.height = (10 + Math.random() * 75) + "%");
  }, 90);
}

function stopVisualizer() {
  if (visualizer._interval) clearInterval(visualizer._interval);
  visualizer.querySelectorAll("span").forEach(b => b.style.height = "8%");
}

function downloadWav(toneBuffer, filename) {
  const audioBuffer = toneBuffer.get ? toneBuffer.get() : toneBuffer;
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  const channels = [];
  let offset = 0;
  let pos = 0;

  function writeUint16(data) { view.setUint16(pos, data, true); pos += 2; }
  function writeUint32(data) { view.setUint32(pos, data, true); pos += 4; }

  // WAV header
  writeUint32(0x46464952); // "RIFF"
  writeUint32(length - 8);
  writeUint32(0x45564157); // "WAVE"
  writeUint32(0x20746d66); // "fmt "
  writeUint32(16);
  writeUint16(1); // PCM
  writeUint16(numChannels);
  writeUint32(audioBuffer.sampleRate);
  writeUint32(audioBuffer.sampleRate * 2 * numChannels);
  writeUint16(numChannels * 2);
  writeUint16(16);
  writeUint32(0x61746164); // "data"
  writeUint32(length - 44);

  for (let i = 0; i < numChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  while (pos < audioBuffer.length) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = Math.max(-1, Math.min(1, channels[ch][pos]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(44 + offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  const blob = new Blob([arrayBuffer], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
