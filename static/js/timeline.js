/**
 * CrimeVision AI - Chronological Timeline Engine
 */
class TimelineEngine {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.events = [];
    this.selectedEventIndex = 0;
  }

  loadTimeline(timelineEvents) {
    this.events = timelineEvents || [];
    this.render();
  }

  render() {
    if (!this.container) return;
    if (this.events.length === 0) {
      this.container.innerHTML = '<div style="color:#64748b; font-size:12px;">No reconstructed timeline events for this case.</div>';
      return;
    }

    this.container.innerHTML = this.events.map((ev, index) => {
      const isCritical = ev.threat_flag === 'CRITICAL' || ev.threat_flag === 'SEVERE';
      const threatClass = isCritical ? 'threat-critical' : '';
      const isActive = index === this.selectedEventIndex ? 'active' : '';

      return `
        <div class="timeline-event-card ${threatClass} ${isActive}" data-index="${index}" onclick="window.timelineEngine.selectEvent(${index})">
          <div class="tl-header">
            <span class="tl-time">${ev.time_utc ? ev.time_utc.substring(11, 19) : ''} UTC &bull; ${ev.relative_time || ''}</span>
            <span class="tl-phase">${ev.phase || 'Event'}</span>
          </div>
          <div class="tl-title">${ev.event_title}</div>
          <div class="tl-summary">${ev.summary}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
            <span style="font-size:10px; color:#38bdf8; font-family:monospace; background:rgba(56,189,248,0.1); padding:2px 6px; border-radius:3px;">
              REF: ${ev.evidence_ref}
            </span>
            <span style="font-size:10px; color:#10b981; font-weight:bold;">
              ${Math.round((ev.confidence || 0.95) * 100)}% Match
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  selectEvent(index) {
    this.selectedEventIndex = index;
    this.render();

    const ev = this.events[index];
    if (window.onTimelineEventSelected && ev) {
      window.onTimelineEventSelected(ev);
    }
  }
}

window.TimelineEngine = TimelineEngine;
