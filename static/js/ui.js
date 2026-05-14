/**
 * HUD — timers, bit rate display, input slots, popups.
 */

export class UI {
  constructor() {
    this._timer        = document.getElementById('timer');
    this._bitrate      = document.getElementById('bitrate');
    this._slotType     = document.getElementById('slot-type');
    this._slotLetter   = document.getElementById('slot-letter');
    this._statN        = document.getElementById('stat-n');
    this._statSc       = document.getElementById('stat-sc');
    this._statSi       = document.getElementById('stat-si');
    this._statTrials   = document.getElementById('stat-trials');
    this._popup        = document.getElementById('feedback-popup');
    this._hud          = document.getElementById('hud');
    this._popupTimeout = null;
  }

  show() {
    this._hud.classList.remove('hidden');
    document.getElementById('identify-section').classList.remove('hidden');
    document.getElementById('post-summary').classList.add('hidden');
    // bring timer and bitrate to full opacity once session is live
    this._timer.classList.remove('idle-dim');
    this._bitrate.classList.remove('idle-dim');
    this._timer.style.color = '';
  }

  hide() {
    this._hud.classList.add('hidden');
    // return top-bar values to dimmed state
    this._timer.textContent   = '—';
    this._bitrate.textContent = '—';
    this._timer.style.color   = '';
    this._timer.classList.add('idle-dim');
    this._bitrate.classList.add('idle-dim');
  }

  /** replace the identify panel with a session summary */
  showPostGameSummary({ bitRate, sc, si, elapsed, N }) {
    this._hud.classList.remove('hidden');
    document.getElementById('identify-section').classList.add('hidden');
    document.getElementById('post-summary').classList.remove('hidden');

    document.getElementById('sum-bitrate').textContent = `${bitRate.toFixed(2)} bps`;

    const acc = sc + si > 0 ? ((sc / (sc + si)) * 100).toFixed(1) : '—';
    const rows = [
      ['Sc (correct)',   sc,        'correct'],
      ['Si (incorrect)', si,        'wrong'],
      ['Accuracy',       `${acc}%`, ''],
      ['N',              N,         ''],
    ];
    const grid = document.getElementById('sum-grid');
    grid.innerHTML = rows.map(([label, val, cls]) =>
      `<div class="sum-row">
         <span class="sum-label">${label}</span>
         <span class="sum-val ${cls}">${val}</span>
       </div>`
    ).join('');

    // dim timer/bitrate when session over
    this._timer.classList.add('idle-dim');
    this._bitrate.classList.add('idle-dim');
  }

  /** @param {number} secondsLeft */
  setTimer(secondsLeft) {
    this._timer.textContent = Math.max(0, secondsLeft).toFixed(1);
    if (secondsLeft <= 10) {
      this._timer.style.color = '#ff4466';
    } else {
      this._timer.style.color = '';
    }
  }

  /** @param {number} bps */
  setBitRate(bps) {
    this._bitrate.textContent = `${bps.toFixed(2)} bps`;
  }

  showTarget(_letter, _type) { }

  clearTarget() {}

  /** update the 2-slot input buffer display
   *  slot 1: synapse type (E or I)
   *  slot 2: neuron label after click, or ⊙ when awaiting click */
  setInputBuffer(typeKey, letterKey, ready = false) {
    this._slotType.textContent   = typeKey ?? '_';
    this._slotLetter.textContent = letterKey ?? (typeKey ? '⊙' : '_');

    const filledCls = ready ? 'filled ready' : 'filled';
    this._slotType.className   = 'input-slot' + (typeKey   ? ` ${filledCls}` : '');
    this._slotLetter.className = 'input-slot' + (letterKey ? ` ${filledCls}` : (typeKey ? ' waiting' : ''));
  }

  /** flash slots green/red to display if correct/incorrect, then clear */
  flashResult(correct) {
    const cls = correct ? 'correct-fill' : 'wrong-fill';
    this._slotType.className   = `input-slot ${cls}`;
    this._slotLetter.className = `input-slot ${cls}`;
    setTimeout(() => this.setInputBuffer(null, null), 280);
  }

  /** update stats counters. */
  updateStats(sc, si, trials) {
    this._statSc.textContent     = sc;
    this._statSi.textContent     = si;
    this._statTrials.textContent = trials;
  }

  /** brief feedback floating text popup */
  showFeedbackPopup(correct) {
    const text  = correct ? '✓ CORRECT' : '✗ WRONG';
    const color = correct ? '#00ff88' : '#ff4466';
    this._popup.textContent  = text;
    this._popup.style.color  = color;
    this._popup.style.opacity = '1';
    clearTimeout(this._popupTimeout);
    this._popupTimeout = setTimeout(() => { this._popup.style.opacity = '0'; }, 600);
  }

  /** spawn a floating score chip that floats upward near a screen position. */
  spawnScoreChip(x, y, correct) {
    const el    = document.createElement('div');
    el.className = `score-popup ${correct ? 'pos' : 'neg'}`;
    el.textContent = correct ? '+2' : '−1';
    el.style.left  = `${x}px`;
    el.style.top   = `${y}px`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  /** show final results. */
  showResults({ bitRate, sc, si, N, elapsed }) {
    document.getElementById('final-bitrate-display').textContent = `${bitRate.toFixed(2)} bps`;
    document.getElementById('res-sc').textContent     = sc;
    document.getElementById('res-si').textContent     = si;
    document.getElementById('res-trials').textContent = sc + si;
    const acc = sc + si > 0 ? ((sc / (sc + si)) * 100).toFixed(1) : '—';
    document.getElementById('res-acc').textContent    = `${acc}%`;

    document.getElementById('results-screen').classList.remove('hidden');
  }
}
