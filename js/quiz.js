// ══════════════════════════════════════
//  QUANTUM AR — quiz.js
//  True/False quiz — neutral buttons, color on answer
// ══════════════════════════════════════

class Quiz {
  constructor({ data, container, onPass, onFail }) {
    this.questions = data.questions;
    this.threshold = data.pass_threshold;
    this.container = document.querySelector(container);
    this.onPass = onPass || (() => {});
    this.onFail = onFail || (() => {});
    this.answers = {};
    this.score = 0;
    this.answered = 0;
  }

  render() {
    if (!this.container) return;
    let html = '';

    this.questions.forEach((q, i) => {
      html += `
        <div class="quiz-card fade-in-up stagger-${Math.min(i + 1, 4)}" id="quiz-${q.id}">
          <p class="quiz-question">
            <span style="color:var(--neon-cyan);font-family:'Orbitron',sans-serif;font-size:0.8rem;margin-right:8px;">
              ${String(i + 1).padStart(2, '0')}
            </span>
            ${q.text}
          </p>
          <div class="quiz-buttons">
            <button class="quiz-btn quiz-btn-neutral" data-qid="${q.id}" data-answer="true">VERO</button>
            <button class="quiz-btn quiz-btn-neutral" data-qid="${q.id}" data-answer="false">FALSO</button>
          </div>
          <div class="quiz-explanation" id="exp-${q.id}">
            ${q.explanation}
          </div>
        </div>
      `;
    });

    html += `
      <div class="quiz-result" id="quiz-result">
        <div class="quiz-score" id="quiz-score-text"></div>
        <p class="quiz-message" id="quiz-message"></p>
        <div id="quiz-result-actions"></div>
      </div>
    `;

    this.container.innerHTML = html;
    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelectorAll('.quiz-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleAnswer(e));
    });
  }

  handleAnswer(e) {
    const btn = e.currentTarget;
    const qid = btn.dataset.qid;
    const userAnswer = btn.dataset.answer === 'true';

    if (this.answers[qid] !== undefined) return;

    const question = this.questions.find(q => q.id === qid);
    const isCorrect = userAnswer === question.answer;

    this.answers[qid] = userAnswer;
    this.answered++;
    if (isCorrect) this.score++;

    // Disable all buttons for this question
    const card = document.getElementById(`quiz-${qid}`);
    card.querySelectorAll('.quiz-btn').forEach(b => {
      b.disabled = true;
      b.classList.remove('quiz-btn-neutral');
    });

    // Color the selected button
    if (isCorrect) {
      btn.classList.add('quiz-btn-correct');
    } else {
      btn.classList.add('quiz-btn-wrong');
      // Also highlight the correct answer
      const correctAnswer = question.answer ? 'true' : 'false';
      card.querySelector(`[data-answer="${correctAnswer}"]`).classList.add('quiz-btn-correct');
    }

    // Show explanation
    const exp = document.getElementById(`exp-${qid}`);
    exp.classList.add('visible', isCorrect ? 'quiz-correct' : 'quiz-wrong');

    if (this.answered === this.questions.length) {
      setTimeout(() => this.showResult(), 600);
    }
  }

  showResult() {
    const passed = this.score >= this.threshold;
    const result = document.getElementById('quiz-result');
    const scoreText = document.getElementById('quiz-score-text');
    const message = document.getElementById('quiz-message');
    const actions = document.getElementById('quiz-result-actions');

    scoreText.textContent = `${this.score} / ${this.questions.length}`;
    scoreText.classList.add(passed ? 'pass' : 'fail');

    if (passed) {
      message.textContent = 'Ottimo! BLINK ha ricevuto cibo quantico!';
      actions.innerHTML = `
        <button class="btn btn-primary" id="quiz-done">✦ Torna a BLINK</button>
      `;
      actions.querySelector('#quiz-done').addEventListener('click', () => this.onPass());
    } else {
      message.textContent = `Servono almeno ${this.threshold} risposte corrette. Riprova!`;
      actions.innerHTML = `
        <button class="btn btn-secondary" id="quiz-retry">↻ Riprova</button>
      `;
      actions.querySelector('#quiz-retry').addEventListener('click', () => this.retry());
      this.onFail();
    }

    result.classList.add('visible');
    result.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  retry() {
    this.answers = {};
    this.score = 0;
    this.answered = 0;
    this.render();
    this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
