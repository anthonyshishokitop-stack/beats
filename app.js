let currentPlayer = null;
let isPlaying = false;
let offlineBuffer = null;

const stylePresets = {
  amapiano:   { name: "Amapiano", bpmDefault: 112 },
  kwaito:     { name: "Kwaito",   bpmDefault: 100 },
  gqom:       { name: "Gqom",     bpmDefault: 125 },
  maskandi:   { name: "Maskandi", bpmDefault: 95 },
  afrohouse:  { name: "Afro House", bpmDefault: 120 },
  traditional:{ name: "Traditional", bpmDefault: 90 }
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
  chip.addEventListener('click', () => promptEl.value = chip.dataset.prompt);
});

styleSelect.addEventListener('change', () => {
  bpmInput.value = stylePresets[styleSelect.value].bpmDefault;
});

generateBtn.addEventListener('click', async () => {
  if (isPlaying) stopPlayback();

  const style = styleSelect.value;
  const bpm = parseInt(bpmInput.value) || 112;
  const durationSec = parseInt(durationSelect.value) || 12;

  generateBtn.disabled = true;
  generateBtn.querySelector('.btn-text').textContent = 'Generating...';
  generateBtn.querySelector('.spinner').classList.remove('hidden');

  try {
    await Tone.start();

    optimizedPrompt.textContent = `South African ${stylePresets[style].name}, ${bpm} BPM, instrumental`;
    trackTitle.textContent = `${stylePresets[style].name} Instrumental`;

    offlineBuffer = await generateBeat(style, bpm, durationSec);

    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth' });
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
  if (offlineBuffer) playBuffer(offlineBuffer);
});

stopBtn.addEventListener('click', stopPlayback);

downloadBtn.addEventListener('click', () => {
  if (offlineBuffer) downloadWav(offlineBuffer, `SA-${styleSelect.value}.wav`);
});

// ========== SIMPLE & RELIABLE GENERATOR ==========
async function generateBeat(style, bpm, durationSec) {
  return await Tone.Offline(({ transport }) => {
    transport.bpm.value = bpm;

    // Only 3 simple instruments – very stable
    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 }
    }).toDestination();
    kick.volume.value = -3;

    const snare = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
    }).toDestination();
    snare.volume.value = -12;

    const bass = new Tone.MembraneSynth({
      pitchDecay: 0.08,
      octaves: 4,
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.05, release: 0.3 }
    }).toDestination();
    bass.volume.value = -5;

    const keys = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.4, sustain: 0.2, release: 0.8 }
    }).toDestination();
    keys.volume.value = -14;

    // Calculate step time in seconds (16th notes)
    const step = 60 / bpm / 4;
    const totalSteps = Math.floor(durationSec / step);

    for (let i = 0; i < totalSteps; i++) {
      const t = i * step;
      const pos = i % 16;

      // Kick patterns
      if (style === "gqom") {
        if (pos === 0 || pos === 3 || pos === 6 || pos === 10 || pos === 12) {
          kick.triggerAttackRelease("C1", "8n", t);
        }
      } else if (style === "amapiano" || style === "afrohouse") {
        if (pos % 4 === 0) kick.triggerAttackRelease("C1", "8n", t);
      } else {
        if (pos === 0 || pos === 8) kick.triggerAttackRelease("C1", "8n", t);
      }

      // Snare
      if (pos === 4 || pos === 12) {
        snare.triggerAttackRelease("8n", t + 0.005);
      }

      // Log drum / bass (Amapiano style)
      if (style === "amapiano") {
        if (pos === 0) bass.triggerAttackRelease("C2", "8n", t + 0.01);
        if (pos === 6) bass.triggerAttackRelease("G1", "8n", t + 0.01);
        if (pos === 10) bass.triggerAttackRelease("C2", "8n", t + 0.01);
        if (pos === 14) bass.triggerAttackRelease("G1", "8n", t + 0.01);
      } else {
        if (pos === 0 || pos === 8) {
          bass.triggerAttackRelease("C2", "4n", t + 0.01);
        }
      }

      // Simple chord every bar
      if (pos === 0) {
        const chord = (Math.floor(i / 16) % 2 === 0)
          ? ["C3", "E3", "G3"]
          : ["A2", "C3", "E3"];
        keys.triggerAttackRelease(chord, "2n", t + 0.015);
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
  player.onstop = () => {
    isPlaying = false;
    stopVisualizer();
  };
}

function stopPlayback() {
  if (currentPlayer) {
    try { currentPlayer.stop(); } catch (e) {}
    currentPlayer.dispose();
    currentPlayer = null;
  }
  isPlaying = false;
  stopVisualizer();
}

function startVisualizer() {
  visualizer.innerHTML = "";
  for (let i = 0; i < 24; i++) {
    const bar = document.createElement("span");
    bar.style.height = "8%";
    visualizer.appendChild(bar);
  }
  const bars = visualizer.querySelectorAll("span");
  visualizer._interval = setInterval(() => {
    if (!isPlaying) return;
    bars.forEach(b => b.style.height = (8 + Math.random() * 80) + "%");
  }, 100);
}

function stopVisualizer() {
  if (visualizer._interval) clearInterval(visualizer._interval);
  visualizer.querySelectorAll("span").forEach(b => b.style.height = "8%");
}

function downloadWav(toneBuffer, filename) {
  const audioBuffer = toneBuffer.get();
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numChannels * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  let pos = 0;

  const write16 = d => { view.setUint16(pos, d, true); pos += 2; };
  const write32 = d => { view.setUint32(pos, d, true); pos += 4; };

  write32(0x46464952); // RIFF
  write32(length - 8);
  write32(0x45564157); // WAVE
  write32(0x20746d66); // fmt
  write32(16);
  write16(1);
  write16(numChannels);
  write32(audioBuffer.sampleRate);
  write32(audioBuffer.sampleRate * 2 * numChannels);
  write16(numChannels * 2);
  write16(16);
  write32(0x61746164); // data
  write32(length - 44);

  const channels = [];
  for (let i = 0; i < numChannels; i++) channels.push(audioBuffer.getChannelData(i));

  let offset = 0;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = Math.max(-1, Math.min(1, channels[ch][i]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(44 + offset, sample, true);
      offset += 2;
    }
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
