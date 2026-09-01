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
  const beats = Array.from(document.querySelectorAll(".beat")).map(beat => {
    return {
      el: beat,
      start: parseFloat(beat.dataset.start),
      end: parseFloat(beat.dataset.end),
      kicker: beat.querySelector(".beat-kicker"),
      lines: Array.from(beat.querySelectorAll(".beat-title .line")),
      text: beat.querySelector(".beat-text"),
      emphasis: beat.querySelector(".title-emphasis"),
      lastLocalP: -1
    };
  });
  const replayBtn = document.getElementById("replayBtn");
  const discoveryLayer = document.getElementById("discoveryLayer");

  /* ---------------------------------------------------
     FOREST DISCOVERY DATA
  --------------------------------------------------- */
  const discoveryData = [
    { start: 0.08, end: 0.18, x: 25, y: 55, title: '숲의 시작', desc: '비어 있던 산에 작은 묘목이<br>자리 잡기 시작합니다.' },
    { start: 0.22, end: 0.32, x: 65, y: 45, title: '어린 묘목', desc: '작은 나무들이 자라며<br>새로운 숲을 만들어갑니다.' },
    { start: 0.26, end: 0.36, x: 52, y: 68, title: '숲의 물길', desc: '계곡과 물길은 숲의<br>생명을 이어줍니다.' },
    { start: 0.65, end: 0.75, x: 35, y: 40, title: '성장한 나무', desc: '나무가 높아지고 수관이 넓어지며<br>숲이 연결됩니다.' },
    { start: 0.82, end: 0.94, x: 50, y: 35, title: '숲의 완성', desc: '성장한 나무들이 하나의<br>울창한 숲을 이룹니다.' }
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
    },
    {
      id: 'bird-ending', start: 0.96, end: 0.99,
      startX: 15, startY: 60, endX: 85, endY: 40,
      scale: 0.9, baseRotate: 5
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
     FOREST NOTES DATA
  --------------------------------------------------- */
  const notesLayer = document.getElementById("notesLayer");
  const notesData = [
    { start: 0.12, end: 0.20, x: 35, y: 65, align: 'top-right', kicker: 'FOREST ARCHIVE / 1970s', title: '산림녹화의 기록', desc: '1970년대 우리나라는 황폐한 산림을 되살리기 위해 전국적인 산림녹화 사업을 추진했습니다.' },
    { start: 0.25, end: 0.40, x: 60, y: 55, align: 'top-left', kicker: 'FOREST NOTE / TREE SPECIES', title: '한반도의 대표 수종', desc: '우리나라 산림에는 소나무, 참나무류, 낙엽송 등 지역과 환경에 맞는 다양한 나무가 자랍니다. 조림에서도 지역의 환경과 나무의 특성을 고려합니다.' },
    { start: 0.43, end: 0.60, x: 50, y: 60, align: 'top-right', kicker: 'FOREST ECOLOGY / HABITAT', title: '숲이 만드는 작은 생태계', desc: '나무가 자라면 그늘과 습도가 달라지고, 곤충과 새를 비롯한 다양한 생물이 살아갈 환경이 만들어집니다.' },
    { start: 0.65, end: 0.82, x: 70, y: 30, align: 'bottom-left', kicker: 'FOREST ECOLOGY / CARBON', title: '숲의 탄소 저장', desc: '나무는 성장하면서 대기 중의 이산화탄소를 흡수하고 탄소를 나무와 토양에 저장합니다. 숲의 성장은 기후를 지키는 과정이기도 합니다.' },
    { start: 0.86, end: 0.92, x: 25, y: 35, align: 'bottom-right', kicker: 'FOREST ECOLOGY / BIODIVERSITY', title: '숲이 품은 생명', desc: '성숙한 숲은 나무뿐 아니라 다양한 식물과 곤충, 새, 포유류가 함께 살아가는 하나의 생태계가 됩니다.' }
  ];
  let forestNotes = [];

  function initNotes() {
    if (!notesLayer) return;

    // Close other notes when one is clicked
    const closeAllNotes = (exceptIndex = -1) => {
      forestNotes.forEach((n, i) => {
        if (i !== exceptIndex && n.el.classList.contains("is-open")) {
          n.el.classList.remove("is-open");
        }
      });
    };

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!e.target.closest('.forest-note')) {
        closeAllNotes();
      }
    });

    forestNotes = notesData.map((data, index) => {
      const pt = document.createElement("div");
      pt.className = "forest-note";
      pt.style.left = data.x + "%";
      pt.style.top = data.y + "%";

      pt.innerHTML = `
        <button class="note-icon" aria-label="숲의 기록 열기"></button>
        <div class="note-panel panel-align-${data.align}">
          <div class="note-panel-kicker">${data.kicker}</div>
          <div class="note-panel-title">${data.title}</div>
          <p class="note-panel-desc">${data.desc}</p>
        </div>
      `;

      const iconBtn = pt.querySelector('.note-icon');
      iconBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = pt.classList.contains("is-open");
        closeAllNotes(index);
        if (!isOpen) {
          pt.classList.add("is-open");
        } else {
          pt.classList.remove("is-open");
        }
      });

      notesLayer.appendChild(pt);

      return {
        data: data,
        el: pt,
        lastP: -1
      };
    });
  }
  initNotes();

  /* ---------------------------------------------------
     FOREST MINIMAP & DRONE VIEW DATA
  --------------------------------------------------- */
  const minimapDrone = document.getElementById("minimapDrone");
  const minimapHitAreas = document.getElementById("minimapHitAreas");
  const droneViewStatus = document.getElementById("droneViewStatus");

  const mapNodes = [
    { p: 0.08, x: 10, y: 20, text: "01 / BARE LAND" },
    { p: 0.29, x: 40, y: 10, text: "02 / PLANTING" },
    { p: 0.51, x: 80, y: 40, text: "03 / YOUNG FOREST" },
    { p: 0.73, x: 90, y: 80, text: "04 / GROWTH" },
    { p: 0.93, x: 50, y: 90, text: "05 / MATURE FOREST" }
  ];

  function initMinimap() {
    if (!minimapHitAreas) return;
    mapNodes.forEach(node => {
      const hit = document.createElement("div");
      hit.className = "minimap-hit";
      hit.style.left = node.x + "%";
      hit.style.top = node.y + "%";
      hit.addEventListener("click", () => {
        // Find corresponding scroll position
        const rect = scrubber.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const targetScroll = (node.p * total) + window.scrollY + rect.top;
        window.scrollTo({ top: targetScroll, behavior: "smooth" });
      });
      minimapHitAreas.appendChild(hit);
    });
  }
  initMinimap();

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
      const { start, end, kicker, lines, text, emphasis } = beat;

      let localP = 0;
      if (progress >= start && progress <= end) {
        localP = (progress - start) / (end - start);
      }

      if (localP === 0 && beat.lastLocalP === 0) return;
      beat.lastLocalP = localP;

      const mapRange = (val, inMin, inMax) => Math.max(0, Math.min(1, (val - inMin) / (inMax - inMin)));

      // Kicker: entrance 0.00-0.08, exit 0.92-1.00
      const pKicker = mapRange(localP, 0.00, 0.08) - mapRange(localP, 0.92, 1.00);

      // Line 1: entrance 0.04-0.12, exit 0.88-0.96
      const pLine1 = mapRange(localP, 0.04, 0.12) - mapRange(localP, 0.88, 0.96);

      // Line 2: entrance 0.08-0.16, exit 0.84-0.92
      const pLine2 = mapRange(localP, 0.08, 0.16) - mapRange(localP, 0.84, 0.92);

      // Text: entrance 0.12-0.20, exit 0.80-0.88
      const pText = mapRange(localP, 0.12, 0.20) - mapRange(localP, 0.80, 0.88);

      if (kicker) {
        kicker.style.opacity = pKicker;
        kicker.style.transform = `translateY(${(1 - pKicker) * 8}px)`;
      }
      if (lines[0]) {
        lines[0].style.opacity = pLine1;
        lines[0].style.transform = `translateY(${(1 - pLine1) * 8}px)`;
      }
      if (lines[1]) {
        lines[1].style.opacity = pLine2;
        lines[1].style.transform = `translateY(${(1 - pLine2) * 8}px)`;
      }
      if (text) {
        text.style.opacity = pText;
        text.style.transform = `translateY(${(1 - pText) * 8}px)`;
      }
      if (emphasis) {
        emphasis.classList.toggle('is-highlighted', pLine2 > 0.8);
      }
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

    // Update Drone View & Minimap
    if (minimapDrone && droneViewStatus) {
      let currentStage = mapNodes[0];
      let nextStage = mapNodes[0];
      let localPct = 0;

      for (let i = 0; i < mapNodes.length - 1; i++) {
        if (progress >= mapNodes[i].p && progress <= mapNodes[i + 1].p) {
          currentStage = mapNodes[i];
          nextStage = mapNodes[i + 1];
          localPct = (progress - mapNodes[i].p) / (mapNodes[i + 1].p - mapNodes[i].p);
          break;
        } else if (progress < mapNodes[0].p) {
          currentStage = mapNodes[0];
          nextStage = mapNodes[0];
          localPct = 0;
        } else if (progress > mapNodes[mapNodes.length - 1].p) {
          currentStage = mapNodes[mapNodes.length - 1];
          nextStage = mapNodes[mapNodes.length - 1];
          localPct = 1;
        }
      }

      const x = currentStage.x + (nextStage.x - currentStage.x) * localPct;
      const y = currentStage.y + (nextStage.y - currentStage.y) * localPct;
      minimapDrone.style.transform = `translate(-50%, -50%)`;
      minimapDrone.style.left = x + "px";
      minimapDrone.style.top = (24 + y) + "px";

      // Update Drone View text
      const activeNode = mapNodes.slice().reverse().find(n => progress >= n.p - 0.05) || mapNodes[0];
      if (droneViewStatus.textContent !== activeNode.text) {
        droneViewStatus.style.opacity = 0;
        setTimeout(() => {
          droneViewStatus.textContent = activeNode.text;
          droneViewStatus.style.opacity = 1;
        }, 150);
      }
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
      bird.el.style.transform = `translate3d(${currentX}vw, calc(${currentY}vh + ${bounce}px), 0) scale(${scale}) rotate(${baseRotate + bounce * 0.5}deg)`;
    });

    // Update Forest Notes Interpolation
    forestNotes.forEach(note => {
      const { start, end } = note.data;
      let isVisible = false;

      if (progress >= start && progress <= end) {
        isVisible = true;
      }

      if (isVisible) {
        note.el.classList.add("is-visible");
      } else {
        note.el.classList.remove("is-visible");
        // Auto-close if out of range
        if (note.el.classList.contains("is-open")) {
          note.el.classList.remove("is-open");
        }
      }
    });

    // -------------------------------------------------
    // FOREST COMPLETION ENDING UI FADE
    // -------------------------------------------------
    const forestMinimap = document.getElementById("forestMinimap");
    const droneView = document.getElementById("droneView");
    const forestTimeline = document.querySelector(".forest-timeline");
    const forestRestored = document.getElementById("forestRestored");

    // Fade out UI between 0.94 and 0.97
    let uiOpacity = 1;
    if (progress > 0.94) {
      uiOpacity = Math.max(0, 1 - (progress - 0.94) / 0.03);
    }
    if (forestMinimap) forestMinimap.style.opacity = uiOpacity;
    if (droneView) droneView.style.opacity = uiOpacity;
    if (forestTimeline) forestTimeline.style.opacity = uiOpacity;

    // FOREST RESTORED: 0.985 ~ 0.995 (fade in and out)
    if (forestRestored) {
      let restoredOpacity = 0;
      let restoredY = 10;
      if (progress > 0.985 && progress < 0.995) {
        if (progress <= 0.99) {
          const p = (progress - 0.985) / 0.005;
          restoredOpacity = p;
          restoredY = 10 * (1 - p);
        } else {
          const p = (0.995 - progress) / 0.005;
          restoredOpacity = p;
          restoredY = 10 * (1 - p); // Goes back down slightly or stays up. Let's just keep Y mostly driven by entrance or steady.
          // Actually, if it goes back down it looks like it sinks. 
          // Let's just make Y float up and opacity fade.
        }
      }
      // Movie credits style: start from bottom, move up continuously off screen
      // Narrative fully disappears by 0.93. The credit starts rising right after.
      if (progress >= 0.93 && progress <= 1.0) {
        const fullP = (progress - 0.93) / 0.07; // 0 to 1

        // Starts at +10vh (below screen center), goes to -100vh (off screen top)
        const yVh = 10 - (110 * fullP);

        // Fade in gradually
        if (fullP < 0.2) {
          restoredOpacity = fullP / 0.2;
        } else {
          restoredOpacity = 1;
        }

        forestRestored.style.opacity = restoredOpacity;
        forestRestored.style.transform = `translate(-50%, ${yVh}vh)`;
      } else {
        forestRestored.style.opacity = restoredOpacity;
        forestRestored.style.transform = `translate(-50%, ${restoredY}px)`;
      }
    }
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

  /* ---------------------------------------------------
     FOREST CURSOR
  --------------------------------------------------- */
  const cursorLayer = document.getElementById("cursorLayer");

  if (cursorLayer) {
    const POOL_SIZE = 12;
    const particles = [];
    let poolIndex = 0;

    // Create pool
    for (let i = 0; i < POOL_SIZE; i++) {
      const el = document.createElement("div");
      el.className = "leaf-particle";
      cursorLayer.appendChild(el);
      particles.push(el);
    }

    let lastMouseX = 0;
    let lastMouseY = 0;

    const triggerDistance = 20; // pixels

    document.addEventListener("mousemove", (e) => {
      // Exclusion zones
      const excluded = e.target.closest('.narrative, .beat, .forest-note, .forest-minimap, .forest-timeline, .drone-view, header, footer');
      if (excluded) return;

      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      const dist = Math.hypot(dx, dy);

      if (dist > triggerDistance) {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        // Spawn chance based on progress
        const p = getProgress();
        let spawnChance = 0;
        let useDot = false;

        if (p < 0.25) spawnChance = 0.15; // increased from 0
        else if (p < 0.43) spawnChance = 0.4;
        else if (p < 0.65) spawnChance = 0.7;
        else if (p < 0.90) { spawnChance = 1.0; useDot = Math.random() > 0.6; }
        else spawnChance = 0.2;

        if (Math.random() < spawnChance) {
          const el = particles[poolIndex];
          poolIndex = (poolIndex + 1) % POOL_SIZE;

          el.className = useDot ? "dot-particle" : "leaf-particle";
          el.style.left = `${e.clientX}px`;
          el.style.top = `${e.clientY}px`;

          // Randomize animation variables
          const tx = (Math.random() - 0.5) * 20; // -10 to 10
          const ty = (Math.random() * -15) - 5; // -20 to -5
          const rot = (Math.random() - 0.5) * 90; // -45 to 45
          const duration = 0.6 + Math.random() * 0.6; // 0.6 to 1.2

          el.style.setProperty('--tx', `${tx}px`);
          el.style.setProperty('--ty', `${ty}px`);
          el.style.setProperty('--rot', `${rot}deg`);

          // Reset animation by removing and adding
          el.style.animation = 'none';
          void el.offsetWidth; // trigger reflow
          el.style.animation = `${useDot ? 'dotFade' : 'leafFade'} ${duration}s ease-out forwards`;
        }
      }
    });
  }

  init();
})();
