(() => {
  "use strict";

  /* ---------------------------------------------------
     Config
  --------------------------------------------------- */
  const FRAME_COUNT = 300;
  const FRAME_PATH = (i) => `frames/frame_${String(i).padStart(4, "0")}.jpg`;

  /* ---------------------------------------------------
     Elements
  --------------------------------------------------- */
  const loader = document.getElementById("loader");
  const loaderFill = document.getElementById("loaderFill");
  const loaderPct = document.getElementById("loaderPct");

  const scrubber = document.getElementById("scrubber");
  const canvas = document.getElementById("frameCanvas");
  const ctx = canvas.getContext("2d");
  const timelineFill = document.getElementById("timelineFill");
  const timelineIndicator = document.getElementById("timelineIndicator");
  const timelineYear = document.getElementById("timelineYear");
  const scrollGuide = document.getElementById("scrollGuide");
  const stageItems = Array.from(document.querySelectorAll(".stage-item"));
  const beats = Array.from(document.querySelectorAll(".beat"));
  const replayBtn = document.getElementById("replayBtn");

  /* ---------------------------------------------------
     Preload frames
  --------------------------------------------------- */
  const images = new Array(FRAME_COUNT);
  let loadedCount = 0;

  function updateLoaderUI() {
    const pct = Math.round((loadedCount / FRAME_COUNT) * 100);
    loaderFill.style.width = pct + "%";
    loaderPct.textContent = pct;
  }

  function preloadFrames() {
    return new Promise((resolve) => {
      let settled = 0;
      for (let i = 0; i < FRAME_COUNT; i++) {
        const img = new Image();
        img.onload = img.onerror = () => {
          loadedCount++;
          settled++;
          updateLoaderUI();
          if (settled === FRAME_COUNT) resolve();
        };
        img.src = FRAME_PATH(i + 1);
        images[i] = img;
      }
    });
  }

  /* ---------------------------------------------------
     Canvas sizing (cover-fit, device-pixel aware)
  --------------------------------------------------- */
  let cw = 0, ch = 0, dpr = 1;

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = canvas.clientWidth;
    ch = canvas.clientHeight;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawFrame(index) {
    const img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const canvasRatio = cw / ch;
    const imgRatio = img.naturalWidth / img.naturalHeight;

    let dw, dh, dx, dy;
    if (imgRatio > canvasRatio) {
      dh = ch;
      dw = dh * imgRatio;
      dx = (cw - dw) / 2;
      dy = 0;
    } else {
      dw = cw;
      dh = dw / imgRatio;
      dx = 0;
      dy = (ch - dh) / 2;
    }

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  /* ---------------------------------------------------
     Scroll -> progress -> frame + narrative
  --------------------------------------------------- */
  let currentFrame = -1;
  let ticking = false;

  function getProgress() {
    const rect = scrubber.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) return 0;
    const raw = -rect.top / total;
    return Math.min(1, Math.max(0, raw));
  }

  function updateBeats(progress) {
    beats.forEach((beat) => {
      const start = parseFloat(beat.dataset.start);
      const end = parseFloat(beat.dataset.end);
      const isActive = progress >= start && progress <= end;
      beat.classList.toggle("is-active", isActive);
    });
  }

  function updateTimeline(progress) {
    if (progress > 0) {
      scrollGuide.classList.add("is-hidden");
    } else {
      scrollGuide.classList.remove("is-hidden");
    }

    const pct = (progress * 100).toFixed(2) + "%";
    const isMobile = window.innerWidth <= 640;
    
    if (isMobile) {
      timelineFill.style.width = pct;
      timelineFill.style.height = "1px";
      timelineIndicator.style.left = pct;
      timelineIndicator.style.top = "15.5px";
    } else {
      timelineFill.style.height = pct;
      timelineFill.style.width = "1px";
      timelineIndicator.style.top = pct;
      timelineIndicator.style.left = "5.5px";
    }
    
    const MAX_YEARS = 50;
    const currentYear = Math.floor(progress * MAX_YEARS);
    if (timelineYear) {
      timelineYear.textContent = currentYear;
    }
    
    const stageIndex = Math.min(4, Math.floor(progress * 5));
    stageItems.forEach((item, i) => {
      item.classList.toggle("is-active", i === stageIndex);
      
      // Keep past dots filled
      const dot = item.querySelector(".stage-dot");
      if (dot) {
        if (i < stageIndex) {
          dot.style.background = "var(--forest-mid)";
          dot.style.borderColor = "var(--forest-mid)";
        } else if (i > stageIndex) {
          dot.style.background = "transparent";
          dot.style.borderColor = "rgba(201, 214, 184, 0.4)";
        } else {
          // Current stage dot style is handled by .is-active CSS
          dot.style.background = "";
          dot.style.borderColor = "";
        }
      }
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const progress = getProgress();

      const frameIndex = Math.min(
        FRAME_COUNT - 1,
        Math.floor(progress * (FRAME_COUNT - 1))
      );
      if (frameIndex !== currentFrame) {
        currentFrame = frameIndex;
        drawFrame(frameIndex);
      }

      updateTimeline(progress);
      updateBeats(progress);

      ticking = false;
    });
  }

  /* ---------------------------------------------------
     Init
  --------------------------------------------------- */
  async function init() {
    resizeCanvas();

    await preloadFrames();
    drawFrame(0);

    // brief settle so the fill animation reads as complete
    setTimeout(() => {
      loader.classList.add("is-hidden");
    }, 250);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      resizeCanvas();
      drawFrame(currentFrame === -1 ? 0 : currentFrame);
    });

    onScroll();
  }

  replayBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  init();
})();
