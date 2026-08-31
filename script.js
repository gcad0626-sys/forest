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
  const discoveryLayer = document.getElementById("discoveryLayer");

  /* ---------------------------------------------------
     FOREST DISCOVERY DATA
  --------------------------------------------------- */
  const discoveryData = [
    { start: 0.08, end: 0.18, x: 25, y: 55, title: '숲의 시작', desc: '비어 있던 산에 작은 묘목이<br>자리 잡기 시작합니다.' },
    { start: 0.22, end: 0.32, x: 65, y: 45, title: '어린 묘목', desc: '작은 나무들이 자라며<br>새로운 숲을 만들어갑니다.' },
    { start: 0.35, end: 0.45, x: 40, y: 75, title: '숲의 물길', desc: '계곡과 물길은 숲의<br>생명을 이어줍니다.' },
    { start: 0.65, end: 0.75, x: 35, y: 40, title: '성장한 나무', desc: '나무가 높아지고 수관이 넓어지며<br>숲이 연결됩니다.' },
    { start: 0.82, end: 0.92, x: 50, y: 35, title: '숲의 완성', desc: '성장한 나무들이 하나의<br>울창한 숲을 이룹니다.' }
  ];
  let discoveryPoints = [];

  function initDiscoveryPoints() {
    if (!discoveryLayer) return;
    discoveryPoints = discoveryData.map(data => {
      const pt = document.createElement("div");
      pt.className = "discovery-point";
      pt.style.left = data.x + "%";
      pt.style.top = data.y + "%";
      pt.innerHTML = `
        <div class="d-marker">
          <div class="d-dot"></div>
          <div class="d-ring"></div>
        </div>
        <div class="d-lines">
          <div class="d-line-v"></div>
          <div class="d-line-h"></div>
        </div>
        <div class="d-content">
          <h4 class="d-title">${data.title}</h4>
          <p class="d-desc">${data.desc}</p>
        </div>
      `;
      discoveryLayer.appendChild(pt);
      
      return {
        data: data,
        lastP: -1,
        dot: pt.querySelector(".d-dot"),
        ring: pt.querySelector(".d-ring"),
        lineV: pt.querySelector(".d-line-v"),
        lineH: pt.querySelector(".d-line-h"),
        content: pt.querySelector(".d-content")
      };
    });
  }
  initDiscoveryPoints();

  /* ---------------------------------------------------
     ECOLOGY LAYER DATA (Birds)
  --------------------------------------------------- */
  const ecologyLayer = document.getElementById("ecologyLayer");
  const birdsData = [
    {
      id: 'bird-1', start: 0.53, end: 0.72,
      startX: 10, startY: 20, endX: 90, endY: 35,
      scale: 1.0, baseRotate: 5
    },
    {
      id: 'bird-2', start: 0.60, end: 0.76,
      startX: 85, startY: 45, endX: 20, endY: 15,
      scale: 0.8, baseRotate: -10
    }
  ];
  let birds = [];

  function initEcologyLayer() {
    if (!ecologyLayer) return;
    const BIRD_SVG = `<svg viewBox="0 0 32 32" fill="rgba(0,0,0,0.6)" xmlns="http://www.w3.org/2000/svg"><path d="M3.2,16 C8,12 12,13 16,16 C20,13 24,12 28.8,16 C25,14 20,14.5 16,18 C12,14.5 7,14 3.2,16 Z"/></svg>`;
    
    birds = birdsData.map(data => {
      const pt = document.createElement("div");
      pt.className = "bird-svg";
      pt.innerHTML = BIRD_SVG;
      ecologyLayer.appendChild(pt);
      
      return {
        data: data,
        el: pt,
        lastP: -1
      };
    });
  }
  initEcologyLayer();

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

    // Update Discovery Points Interpolation
    discoveryPoints.forEach(pt => {
      const { start, end } = pt.data;
      let p = 0;
      if (progress >= start && progress <= end) {
        const fadeZone = 0.02;
        if (progress < start + fadeZone) {
          p = (progress - start) / fadeZone;
        } else if (progress > end - fadeZone) {
          p = (end - progress) / fadeZone;
        } else {
          p = 1;
        }
      }
      
      if (p === 0 && pt.lastP === 0) return;
      pt.lastP = p;

      const pDots = Math.max(0, Math.min(1, p / 0.2));
      const pRing = Math.max(0, Math.min(1, (p - 0.1) / 0.3));
      const pRingOp = Math.max(0, Math.min(1, (p - 0.1) / 0.1)) * (1 - Math.max(0, Math.min(1, (p - 0.2) / 0.2)));
      const pLineV = Math.max(0, Math.min(1, (p - 0.2) / 0.3));
      const pLineH = Math.max(0, Math.min(1, (p - 0.4) / 0.3));
      const pText = Math.max(0, Math.min(1, (p - 0.6) / 0.4));

      pt.dot.style.transform = `scale(${pDots})`;
      pt.dot.style.opacity = pDots;
      
      pt.ring.style.transform = `scale(${1 + pRing * 1.5})`;
      pt.ring.style.opacity = pRingOp;

      pt.lineV.style.height = `${pLineV * 30}px`;
      pt.lineH.style.width = `${pLineH * 20}px`;

      pt.content.style.opacity = pText;
      pt.content.style.transform = `translateY(${(1 - pText) * 10}px)`;
    });

    // Update Ecology Birds Interpolation
    birds.forEach(bird => {
      const { start, end, startX, startY, endX, endY, scale, baseRotate } = bird.data;
      let p = 0;
      if (progress > start && progress < end) {
        p = (progress - start) / (end - start);
      }
      
      if (p === 0 && bird.lastP === 0) return;
      bird.lastP = p;

      if (p === 0) {
        bird.el.style.opacity = 0;
        return;
      }

      const currentX = startX + (endX - startX) * p;
      const currentY = startY + (endY - startY) * p;
      const bounce = Math.sin(p * Math.PI * 8) * 5; // 4 bounces
      const opacity = Math.sin(p * Math.PI); // smooth fade in and out

      bird.el.style.opacity = opacity;
      bird.el.style.transform = `translate3d(${currentX}vw, calc(${currentY}vh + ${bounce}px), 0) scale(${scale}) rotate(${baseRotate + bounce*0.5}deg)`;
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
