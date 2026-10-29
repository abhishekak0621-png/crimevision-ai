/**
 * CrimeVision AI - Persistent AI Chat Assistant
 */
class AIChatAssistant {
  constructor(historyContainerId, inputId, sendBtnId) {
    this.historyContainer = document.getElementById(historyContainerId);
    this.input = document.getElementById(inputId);
    this.sendBtn = document.getElementById(sendBtnId);
    this.currentCaseId = 'CASE-2026-884';

    this.sendBtn.addEventListener('click', () => this.sendQuery());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendQuery();
    });
  }

  setCase(caseId) {
    this.currentCaseId = caseId;
  }

  addMessage(role, text, citations = []) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;

    // Convert markdown basic formatting (**bold**, `code`)
    let formattedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.4); padding:1px 4px; border-radius:3px; color:#38bdf8;">$1</code>')
      .replace(/\n/g, '<br>');

    let citationsHtml = '';
    if (citations && citations.length > 0) {
      citationsHtml = '<div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:4px;">' +
        citations.map(c => `
          <span class="citation-pill" onclick="window.selectEvidenceById('${c.evidence_id}')">
            &#128269; ${c.evidence_id} ${c.timestamp ? '(' + c.timestamp + ')' : ''}
          </span>
        `).join('') + '</div>';
    }

    bubble.innerHTML = `<div>${formattedText}</div>${citationsHtml}`;
    this.historyContainer.appendChild(bubble);
    this.historyContainer.scrollTop = this.historyContainer.scrollHeight;
  }

  async sendQuery(customPrompt = null) {
    const query = customPrompt || this.input.value.trim();
    if (!query) return;

    this.input.value = '';
    this.addMessage('user', query);

    // Typing indicator
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble ai';
    typingBubble.innerHTML = '<span style="color:#38bdf8;">Analyzing multimodal crime scene context...</span>';
    this.historyContainer.appendChild(typingBubble);
    this.historyContainer.scrollTop = this.historyContainer.scrollHeight;

    try {
      const res = await fetch(`/api/cases/${this.currentCaseId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query })
      });
      const data = await res.json();
      this.historyContainer.removeChild(typingBubble);

      if (data.status === 'success' && data.data) {
        this.addMessage('ai', data.data.response, data.data.citations);
      } else {
        this.addMessage('ai', 'Error generating response: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      this.historyContainer.removeChild(typingBubble);
      this.addMessage('ai', 'Connection error to Forensic AI server.');
      console.error(err);
    }
  }
}

window.AIChatAssistant = AIChatAssistant;
