/**
 * CrimeVision AI - Vision Player & Canvas Object Detection HUD
 */
class VisionPlayer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.currentEvidence = null;
    this.currentImage = new Image();
    this.selectedDetection = null;
    this.showBoundingBoxes = true;
    this.filterMode = 'normal'; // 'normal', 'high_contrast', 'night_vision'

    this.currentImage.onload = () => this.render();
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
  }

  loadEvidence(evidenceItem) {
    this.currentEvidence = evidenceItem;
    this.selectedDetection = null;
    if (evidenceItem.file_url) {
      this.currentImage.src = evidenceItem.file_url;
    }
  }

  toggleBoundingBoxes() {
    this.showBoundingBoxes = !this.showBoundingBoxes;
    this.render();
  }

  setFilterMode(mode) {
    this.filterMode = mode;
    this.render();
  }

  render() {
    if (!this.currentImage.src || !this.currentImage.complete) return;

    // Set canvas dimensions to match aspect ratio
    const container = this.canvas.parentElement;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 320;
    this.canvas.width = width;
    this.canvas.height = height;

    this.ctx.clearRect(0, 0, width, height);

    // Apply forensic filter
    this.ctx.save();
    if (this.filterMode === 'high_contrast') {
      this.ctx.filter = 'contrast(170%) brightness(110%)';
    } else if (this.filterMode === 'night_vision') {
      this.ctx.filter = 'sepia(100%) hue-rotate(90deg) saturate(300%) contrast(140%)';
    }
    this.ctx.drawImage(this.currentImage, 0, 0, width, height);
    this.ctx.restore();

    // Render Bounding Boxes
    if (this.showBoundingBoxes && this.currentEvidence && this.currentEvidence.detections) {
      this.currentEvidence.detections.forEach((det) => {
        this.drawBoundingBox(det, width, height);
      });
    }

    // Render Forensic Telemetry HUD (corners & grid)
    this.drawHudOverlay(width, height);
  }

  drawBoundingBox(det, width, height) {
    const [ymin, xmin, ymax, xmax] = det.box;
    const bx = xmin * width;
    const by = ymin * height;
    const bw = (xmax - xmin) * width;
    const bh = (ymax - ymin) * height;

    const isSelected = this.selectedDetection && this.selectedDetection.id === det.id;

    let color = '#38bdf8'; // medium
    if (det.threat_level === 'CRITICAL' || det.threat_level === 'SEVERE') color = '#ff2a5f';
    else if (det.threat_level === 'HIGH') color = '#f59e0b';

    this.ctx.save();
    this.ctx.lineWidth = isSelected ? 3 : 2;
    this.ctx.strokeStyle = color;
    this.ctx.strokeRect(bx, by, bw, bh);

    // Corner brackets
    const bracketSize = Math.min(12, bw / 3, bh / 3);
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = '#ffffff';

    // Top-left
    this.ctx.beginPath();
    this.ctx.moveTo(bx, by + bracketSize);
    this.ctx.lineTo(bx, by);
    this.ctx.lineTo(bx + bracketSize, by);
    this.ctx.stroke();

    // Bottom-right
    this.ctx.beginPath();
    this.ctx.moveTo(bx + bw - bracketSize, by + bh);
    this.ctx.lineTo(bx + bw, by + bh);
    this.ctx.lineTo(bx + bw, by + bh - bracketSize);
    this.ctx.stroke();

    // Label tag
    const labelText = `${det.label} [${Math.round(det.confidence * 100)}%]`;
    this.ctx.font = 'bold 11px JetBrains Mono, monospace';
    const textWidth = this.ctx.measureText(labelText).width;

    this.ctx.fillStyle = 'rgba(7, 10, 18, 0.9)';
    this.ctx.fillRect(bx, by - 18, textWidth + 10, 18);
    this.ctx.fillStyle = color;
    this.ctx.fillText(labelText, bx + 5, by - 5);

    this.ctx.restore();
  }

  drawHudOverlay(width, height) {
    this.ctx.save();
    // Grid tick lines
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
    this.ctx.lineWidth = 1;

    // Crosshair in center
    const cx = width / 2;
    const cy = height / 2;
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 15, cy);
    this.ctx.lineTo(cx + 15, cy);
    this.ctx.moveTo(cx, cy - 15);
    this.ctx.lineTo(cx, cy + 15);
    this.ctx.stroke();

    this.ctx.restore();
  }

  handleMouseMove(e) {
    if (!this.currentEvidence || !this.currentEvidence.detections) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hit = this.findDetectionAt(x, y);
    this.canvas.style.cursor = hit ? 'pointer' : 'crosshair';
  }

  handleClick(e) {
    if (!this.currentEvidence || !this.currentEvidence.detections) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hit = this.findDetectionAt(x, y);
    this.selectedDetection = hit;
    this.render();

    if (window.onDetectionSelected) {
      window.onDetectionSelected(hit);
    }
  }

  findDetectionAt(x, y) {
    const width = this.canvas.width;
    const height = this.canvas.height;

    for (const det of this.currentEvidence.detections) {
      const [ymin, xmin, ymax, xmax] = det.box;
      const bx = xmin * width;
      const by = ymin * height;
      const bw = (xmax - xmin) * width;
      const bh = (ymax - ymin) * height;

      if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
        return det;
      }
    }
    return null;
  }
}

window.VisionPlayer = VisionPlayer;
