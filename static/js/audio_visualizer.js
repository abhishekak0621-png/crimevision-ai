/**
 * CrimeVision AI - Audio Waveform & Forensic Transcription Synchronizer
 */
class AudioVisualizer {
  constructor(canvasId, audioElementId, transcriptContainerId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.audio = document.getElementById(audioElementId);
    this.transcriptContainer = document.getElementById(transcriptContainerId);
    this.currentAudioItem = null;
    this.isPlaying = false;
    this.animationId = null;

    this.audio.addEventListener('timeupdate', () => this.handleTimeUpdate());
    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      cancelAnimationFrame(this.animationId);
      this.drawWaveformStatic();
    });
  }

  loadAudio(evidenceItem) {
    this.currentAudioItem = evidenceItem;
    if (evidenceItem.file_url) {
      this.audio.src = evidenceItem.file_url;
    }
    this.renderTranscripts();
    this.drawWaveformStatic();
  }

  play() {
    this.audio.play().then(() => {
      this.isPlaying = true;
      this.animate();
    }).catch(err => console.log('Audio autoplay prevented:', err));
  }

  pause() {
    this.audio.pause();
    this.isPlaying = false;
    cancelAnimationFrame(this.animationId);
    this.drawWaveformStatic();
  }

  togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  drawWaveformStatic() {
    const width = this.canvas.parentElement.clientWidth || 400;
    const height = this.canvas.parentElement.clientHeight || 70;
    this.canvas.width = width;
    this.canvas.height = height;

    this.ctx.clearRect(0, 0, width, height);

    const bars = 64;
    const barWidth = width / bars;

    for (let i = 0; i < bars; i++) {
      // Deterministic synthetic waveform based on index
      const val = Math.sin(i * 0.35) * Math.cos(i * 0.15) * 0.5 + 0.5;
      const barHeight = val * (height * 0.75) + 6;
      const x = i * barWidth;
      const y = (height - barHeight) / 2;

      this.ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      this.ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
    }
  }

  animate() {
    if (!this.isPlaying) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    this.ctx.clearRect(0, 0, width, height);

    const bars = 64;
    const barWidth = width / bars;
    const currentTime = this.audio.currentTime;

    for (let i = 0; i < bars; i++) {
      const dynamicVal = Math.sin(i * 0.35 + currentTime * 8) * Math.cos(i * 0.2 + currentTime * 4);
      const absVal = Math.abs(dynamicVal);
      const barHeight = absVal * (height * 0.85) + 6;
      const x = i * barWidth;
      const y = (height - barHeight) / 2;

      // Color shifts from cyan to warning red on higher peaks
      if (absVal > 0.7) {
        this.ctx.fillStyle = '#ff2a5f';
      } else if (absVal > 0.45) {
        this.ctx.fillStyle = '#f59e0b';
      } else {
        this.ctx.fillStyle = '#38bdf8';
      }

      this.ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
    }

    // Progress scrub needle
    const progressX = (this.audio.currentTime / (this.audio.duration || 1)) * width;
    this.ctx.strokeStyle = '#00f2fe';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(progressX, 0);
    this.ctx.lineTo(progressX, height);
    this.ctx.stroke();

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  handleTimeUpdate() {
    const curTime = this.audio.currentTime;
    const lines = this.transcriptContainer.querySelectorAll('.transcript-line');

    lines.forEach((line) => {
      const start = parseFloat(line.dataset.start);
      const end = parseFloat(line.dataset.end);
      if (curTime >= start && curTime <= end) {
        line.classList.add('playing');
        line.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        line.classList.remove('playing');
      }
    });
  }

  renderTranscripts() {
    if (!this.transcriptContainer || !this.currentAudioItem) return;
    const transcripts = this.currentAudioItem.transcripts || [];

    if (transcripts.length === 0) {
      this.transcriptContainer.innerHTML = '<div style="color:#64748b; font-size:11px;">No speech transcript stream for this item.</div>';
      return;
    }

    this.transcriptContainer.innerHTML = transcripts.map((t, idx) => {
      // Highlight entities in text
      let markedText = t.text;
      (t.entities || []).forEach((ent) => {
        const span = `<span class="entity-tag" title="Category: ${ent.type}">${ent.text}</span>`;
        markedText = markedText.replace(ent.text, span);
      });

      return `
        <div class="transcript-line" data-start="${t.start}" data-end="${t.end}">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <strong style="color:#38bdf8; font-size:11px;">${t.speaker}</strong>
            <span style="font-family:monospace; color:#64748b; font-size:10px;">${t.start.toFixed(1)}s - ${t.end.toFixed(1)}s</span>
          </div>
          <div>${markedText}</div>
        </div>
      `;
    }).join('');
  }
}

window.AudioVisualizer = AudioVisualizer;
