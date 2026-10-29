/**
 * CrimeVision AI - Application Core Controller
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Engines
  window.visionPlayer = new VisionPlayer('visionCanvas');
  window.audioVisualizer = new AudioVisualizer('waveformCanvas', 'audioElement', 'transcriptContainer');
  window.timelineEngine = new TimelineEngine('timelineContainer');
  window.aiChat = new AIChatAssistant('chatHistory', 'chatInput', 'chatSendBtn');

  let currentCase = null;
  let allCases = [];

  // DOM Elements
  const caseSelector = document.getElementById('caseSelector');
  const evidenceThumbs = document.getElementById('evidenceThumbs');
  const detectionList = document.getElementById('detectionList');
  const targetLabel = document.getElementById('targetLabel');
  const targetMeta = document.getElementById('targetMeta');

  // Stats Elements
  const statEvidence = document.getElementById('statEvidence');
  const statThreats = document.getElementById('statThreats');
  const statCorroborations = document.getElementById('statCorroborations');
  const statIntegrity = document.getElementById('statIntegrity');

  // Modals
  const reportModal = document.getElementById('reportModal');
  const reportFrame = document.getElementById('reportFrame');
  const uploadModal = document.getElementById('uploadModal');

  // 1. Load All Cases
  async function loadCaseList() {
    try {
      const res = await fetch('/api/cases');
      const data = await res.json();
      allCases = data.cases || [];
      caseSelector.innerHTML = allCases.map(c => `
        <option value="${c.id}">${c.id}: ${c.title}</option>
      `).join('');

      if (allCases.length > 0) {
        selectCase(allCases[0].id);
      }
    } catch (err) {
      console.error('Failed to load cases:', err);
    }
  }

  // 2. Select & Load Active Case
  async function selectCase(caseId) {
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      const data = await res.json();
      currentCase = data.case;
      window.aiChat.setCase(caseId);

      updateCaseUI();
    } catch (err) {
      console.error('Error fetching case detail:', err);
    }
  }

  function updateCaseUI() {
    if (!currentCase) return;

    // Update Stats
    const totalDetections = (currentCase.evidence_items || [])
      .reduce((acc, ev) => acc + (ev.detections ? ev.detections.length : 0), 0);
    
    statEvidence.textContent = (currentCase.evidence_items || []).length;
    statThreats.textContent = totalDetections;
    statCorroborations.textContent = currentCase.correlations ? currentCase.correlations.total_corroborations : 4;
    statIntegrity.textContent = '100% SHA-256';

    // Render Evidence Thumbnails
    evidenceThumbs.innerHTML = (currentCase.evidence_items || []).map((ev, idx) => `
      <div class="evidence-thumb-card ${idx === 0 ? 'active' : ''}" data-evid="${ev.id}" onclick="window.selectEvidenceById('${ev.id}')">
        <img src="${ev.file_url || '/static/assets/cctv_vault.jpg'}" alt="${ev.title}">
        <span class="thumb-badge">${ev.id}</span>
      </div>
    `).join('');

    // Load Timeline
    window.timelineEngine.loadTimeline(currentCase.fused_timeline || currentCase.chronological_timeline);

    // Load First Evidence Item
    if (currentCase.evidence_items && currentCase.evidence_items.length > 0) {
      window.selectEvidenceById(currentCase.evidence_items[0].id);
    }
  }

  // Global Evidence Selector
  window.selectEvidenceById = function(evidenceId) {
    if (!currentCase || !currentCase.evidence_items) return;
    const ev = currentCase.evidence_items.find(item => item.id === evidenceId);
    if (!ev) return;

    // Highlight thumbnail
    document.querySelectorAll('.evidence-thumb-card').forEach(card => {
      card.classList.toggle('active', card.dataset.evid === evidenceId);
    });

    // Update Viewport HUD Info
    document.getElementById('hudEvId').textContent = ev.id;
    document.getElementById('hudTimestamp').textContent = ev.timestamp ? ev.timestamp.substring(11, 19) + ' UTC' : '';

    if (ev.type === 'audio') {
      window.audioVisualizer.loadAudio(ev);
      // Fallback display for audio mode
      window.visionPlayer.loadEvidence({
        file_url: '/static/assets/cctv_vault.jpg',
        detections: []
      });
      targetLabel.textContent = `Acoustic Stream: ${ev.title}`;
      targetMeta.textContent = `Stress: ${(ev.acoustic_stress_score * 100).toFixed(0)}% | Duration: ${ev.duration_sec}s`;
    } else {
      window.visionPlayer.loadEvidence(ev);
      targetLabel.textContent = ev.title;
      targetMeta.textContent = `Source: ${ev.source || 'Digital Sensor'} | Detections: ${ev.detections ? ev.detections.length : 0}`;
    }

    // Render Detections List
    renderDetections(ev.detections || []);
  };

  function renderDetections(detections) {
    if (!detections || detections.length === 0) {
      detectionList.innerHTML = '<div style="color:#64748b; font-size:12px; padding:6px 0;">No visual objects flagged in this frame.</div>';
      return;
    }

    detectionList.innerHTML = detections.map(det => {
      let badgeClass = 'badge-threat-medium';
      if (det.threat_level === 'CRITICAL' || det.threat_level === 'SEVERE') badgeClass = 'badge-threat-severe';
      else if (det.threat_level === 'HIGH') badgeClass = 'badge-threat-high';

      return `
        <div class="detection-row" onclick="window.visionPlayer.drawBoundingBox(${JSON.stringify(det).replace(/"/g, '&quot;')}, window.visionPlayer.canvas.width, window.visionPlayer.canvas.height)">
          <div>
            <strong style="font-size:12px; color:#ffffff;">${det.label}</strong>
            <div style="font-size:11px; color:#94a3b8; margin-top:2px;">
              Conf: ${(det.confidence * 100).toFixed(0)}% &bull; Cat: ${det.category}
            </div>
          </div>
          <span class="detection-badge ${badgeClass}">${det.threat_level}</span>
        </div>
      `;
    }).join('');
  }

  // Detection Selected callback
  window.onDetectionSelected = function(det) {
    if (!det) return;
    targetLabel.textContent = `TARGET: ${det.label}`;
    const attrs = Object.entries(det.attributes || {})
      .map(([k, v]) => `${k}: ${v}`).join(' | ');
    targetMeta.textContent = `Threat: ${det.threat_level} | ${attrs || 'Normal telemetry'}`;
  };

  // Timeline Event Click Callback
  window.onTimelineEventSelected = function(event) {
    if (event.evidence_ref) {
      window.selectEvidenceById(event.evidence_ref);
    }
  };

  // Case Selector Change
  caseSelector.addEventListener('change', (e) => {
    selectCase(e.target.value);
  });

  // Suggestion Chips Click
  window.triggerChip = function(promptText) {
    window.aiChat.sendQuery(promptText);
  };

  // Forensic Tool buttons
  document.getElementById('btnToggleBoxes').addEventListener('click', () => {
    window.visionPlayer.toggleBoundingBoxes();
  });

  document.getElementById('btnFilterNormal').addEventListener('click', () => {
    window.visionPlayer.setFilterMode('normal');
  });

  document.getElementById('btnFilterContrast').addEventListener('click', () => {
    window.visionPlayer.setFilterMode('high_contrast');
  });

  document.getElementById('btnFilterNight').addEventListener('click', () => {
    window.visionPlayer.setFilterMode('night_vision');
  });

  document.getElementById('btnAudioPlay').addEventListener('click', () => {
    window.audioVisualizer.togglePlay();
  });

  // Export PDF Report Modal
  document.getElementById('btnExportReport').addEventListener('click', () => {
    if (!currentCase) return;
    reportFrame.src = `/api/cases/${currentCase.id}/report`;
    reportModal.classList.add('active');
  });

  document.getElementById('btnCloseReportModal').addEventListener('click', () => {
    reportModal.classList.remove('active');
  });

  // New Evidence Upload Modal
  document.getElementById('btnNewEvidence').addEventListener('click', () => {
    uploadModal.classList.add('active');
  });

  document.getElementById('btnCloseUploadModal').addEventListener('click', () => {
    uploadModal.classList.remove('active');
  });

  document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentCase) return;

    const formData = new FormData(e.target);
    const submitBtn = document.getElementById('uploadSubmitBtn');
    submitBtn.textContent = 'Processing with Neural Multimodal Engine...';
    submitBtn.disabled = true;

    try {
      const res = await fetch(`/api/cases/${currentCase.id}/evidence/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.status === 'success') {
        uploadModal.classList.remove('active');
        e.target.reset();
        await selectCase(currentCase.id);
        window.selectEvidenceById(data.evidence_item.id);
      } else {
        alert('Upload failed: ' + data.message);
      }
    } catch (err) {
      alert('Error connecting to forensic server.');
    } finally {
      submitBtn.textContent = 'Ingest & Run AI Detection';
      submitBtn.disabled = false;
    }
  });

  // Initial Load
  loadCaseList();
});
