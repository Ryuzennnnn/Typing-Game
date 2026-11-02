document.addEventListener("DOMContentLoaded", () => {

  // ================= PASSAGES =================
  const PASSAGES = {
    easy: [
      "Practice makes progress. Type with steady rhythm and clean form.",
      "Focus on accuracy first; speed follows naturally."
    ],
    medium: [
      "Practice makes progress. Type with steady rhythm and clean form. Keep your eyes on the text, not the keys.",
      "Focus on accuracy first; speed follows naturally. Breathe and relax your hands."
    ],
    hard: [
      "Complex passages with punctuation, commas, and hyphens challenge accuracy; maintain focus and precision.",
      "Consistency in typing is key: avoid mistakes while keeping speed high, and watch punctuation closely."
    ]
  };

  // ================= DOM ELEMENTS =================
  const promptEl = document.getElementById("prompt");
  const timerEl = document.getElementById("timer");
  const wpmEl = document.getElementById("wpm");
  const accEl = document.getElementById("acc");
  const streakBar = document.getElementById("streakBar");
  const speedRankEl = document.getElementById("speedRank");
  const btnStart = document.getElementById("btnStart");
  const btnReset = document.getElementById("btnReset");
  const btnPassage = document.getElementById("btnPassage");
  const btnContrast = document.getElementById("btnContrast");
  const selectTime = document.getElementById("selectTime");
  const selectDifficulty = document.getElementById("selectDifficulty");
  const roundStatus = document.getElementById("roundStatus");

  // ================= STATE =================
  let difficulty = selectDifficulty.value || "medium";
  let passageIndex = 0;
  let active = false;
  let caretIndex = 0;
  let secondsTotal = parseInt(selectTime.value, 10) || 60;
  let secondsLeft = secondsTotal;
  let tickHandle = null;
  let startTime = 0;

  let charsTyped = 0;
  let correctChars = 0;
  let charSpans = [];

  const studentName = localStorage.getItem("studentName") || "Student";

  // ================= RENDER LOGIC =================
  function renderPassage(text) {
    promptEl.innerHTML = "";
    charSpans = [];

    text.split("").forEach(ch => {
      const span = document.createElement("span");
      span.textContent = ch;
      span.classList.add("char");
      if (ch === " ") span.style.width = "0.6ch"; 
      promptEl.appendChild(span);
      charSpans.push(span);
    });

    setCaret(0);
  }

  function setCaret(i) {
    charSpans.forEach(s => s.classList.remove("caret"));
    if (charSpans[i]) {
        charSpans[i].classList.add("caret");
    }
  }

  // ================= CALCULATIONS =================
  function computeWPM(elapsedMs) {
    const minutes = elapsedMs / 60000;
    if (minutes <= 0) return 0;
    return Math.round((correctChars / 5) / minutes);
  }

  function computeAccuracy() {
    if (charsTyped === 0) return 100;
    return Math.round((correctChars / charsTyped) * 100);
  }

  function updateHUD() {
    const now = performance.now();
    const elapsed = now - startTime;
    
    if (active && elapsed > 0) {
      const currentWpm = computeWPM(elapsed);
      wpmEl.textContent = currentWpm;
      
      if (currentWpm < 30) speedRankEl.textContent = "Slow";
      else if (currentWpm < 60) speedRankEl.textContent = "Average";
      else speedRankEl.textContent = "Fast";
    }
    
    accEl.textContent = computeAccuracy() + "%";
    timerEl.textContent = secondsLeft;

    const progress = (caretIndex / charSpans.length) * 100;
    streakBar.style.width = progress + "%";
  }

  function resetMetrics() {
    caretIndex = 0;
    charsTyped = 0;
    correctChars = 0;
    charSpans.forEach(s => s.classList.remove("char--hit", "char--miss", "caret"));
    streakBar.style.width = "0%";
    wpmEl.textContent = "0";
    accEl.textContent = "100%";
    speedRankEl.textContent = "Slow";
    setCaret(0);
  }

  // ================= ROUND CONTROL =================
  function startRound() {
    resetMetrics();
    active = true;
    secondsTotal = parseInt(selectTime.value, 10) || 60;
    secondsLeft = secondsTotal;
    startTime = performance.now();

    tickHandle = setInterval(() => {
      secondsLeft--;
      updateHUD();

      if (secondsLeft <= 0) {
        finishRound();
      }
    }, 1000);

    btnStart.disabled = true;
    btnReset.disabled = false;
    roundStatus.textContent = "Running...";
  }

  function finishRound() {
    clearInterval(tickHandle);
    active = false;

    const elapsedMs = performance.now() - startTime;
    const finalWpm = computeWPM(elapsedMs);
    const finalAcc = computeAccuracy();

    roundStatus.textContent = `Finished • WPM: ${finalWpm} • Accuracy: ${finalAcc}%`;
    btnStart.disabled = false;

    // --- NEW LEADERBOARD STORAGE LOGIC ---
    const newEntry = {
      name: studentName,
      wpm: finalWpm,
      accuracy: finalAcc,
      difficulty: difficulty,
      date: new Date().toLocaleDateString()
    };

    const leaderboard = JSON.parse(localStorage.getItem("leaderboard") || "[]");
    leaderboard.push(newEntry);
    
    // Sort by highest WPM and keep top 10
    leaderboard.sort((a, b) => b.wpm - a.wpm);
    const topScores = leaderboard.slice(0, 10);
    
    localStorage.setItem("leaderboard", JSON.stringify(topScores));
  }

  // ================= KEYBOARD INPUT =================
  window.addEventListener("keydown", (e) => {
    if (!active) {
      if (e.key === "Enter") startRound();
      return;
    }

    if (e.key.length !== 1 && e.key !== "Backspace") return;

    if (e.key === "Backspace") {
      if (caretIndex > 0) {
        caretIndex--;
        if (charSpans[caretIndex].classList.contains("char--hit")) {
          correctChars--;
        }
        charSpans[caretIndex].classList.remove("char--hit", "char--miss");
        charsTyped = Math.max(0, charsTyped - 1);
        setCaret(caretIndex);
        updateHUD();
      }
      return;
    }

    const expected = charSpans[caretIndex]?.textContent;
    if (!expected) return;

    charsTyped++;

    if (e.key === expected) {
      charSpans[caretIndex].classList.add("char--hit");
      correctChars++;
    } else {
      charSpans[caretIndex].classList.add("char--miss");
    }

    caretIndex++;
    setCaret(caretIndex);

    if (caretIndex >= charSpans.length) {
      finishRound();
    }

    updateHUD();
  });

  // ================= UI CONTROLS =================
  btnStart.addEventListener("click", startRound);

  btnReset.addEventListener("click", () => {
    clearInterval(tickHandle);
    active = false;
    resetMetrics();
    timerEl.textContent = selectTime.value;
    roundStatus.textContent = "Ready";
    btnReset.disabled = true;
    btnStart.disabled = false;
  });

  btnPassage.addEventListener("click", () => {
    if (active) return;
    difficulty = selectDifficulty.value;
    passageIndex = (passageIndex + 1) % PASSAGES[difficulty].length;
    renderPassage(PASSAGES[difficulty][passageIndex]);
    resetMetrics();
  });

  selectDifficulty.addEventListener("change", () => {
    difficulty = selectDifficulty.value;
    renderPassage(PASSAGES[difficulty][0]);
    resetMetrics();
  });

  btnContrast.addEventListener("click", () => {
    const isHigh = document.body.getAttribute("data-contrast") === "high";
    document.body.setAttribute("data-contrast", isHigh ? "normal" : "high");
    btnContrast.textContent = "High Contrast: " + (isHigh ? "Off" : "On");
  });

  // ================= INITIALIZE =================
  renderPassage(PASSAGES[difficulty][0]);
  updateHUD();

});