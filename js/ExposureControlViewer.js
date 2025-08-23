class ExposureControlViewer {
  constructor() {
    this.prefix = 'expcontrol';
    this.n_scenes = 2;

    // Total time (seconds) to go from frame 0 → last frame (one-way sweep)
    this.total_duration_s = 0.2 * (16 - 1);

    this.cur_frame = 0;
    this.base_im = '0000';
    this.method = '2frame';
    this.interval_id = null;
    this.anim_dir = 1;
    this.max_idx = 16; // will be overridden by updateSliderForMethod()

    this.assets_path = `ds_assets`;
    this.ds = true; // optional flag if you toggle resolution elsewhere

    // Cache DOM elements
    this.input_img = document.getElementById(`${this.prefix}-blurry`);
    this.vid       = document.getElementById(`${this.prefix}-vid`);
    this.video_elements = [this.vid];

    // Build scene selector, slider sync
    this.initSceneSelector();
    this.initSliderSync();

    // Prepare slider/ticks for current method
    this.updateSliderForMethod();

    // Start paused; call toggle_play_pause() if you want autoplay
    this.isPlaying = false;

    // Load initial scene
    this.change_scene(this.base_im);
  }

  /* ---------------- Helpers for frames & timing ---------------- */

  getFramesForMethod(method) {
    switch (method) {
      case '2frame':    return 2;
      case '4frame':    return 4;
      case '8frame':    return 8;
      case '16frame':   return 16;
      case '1deadtime': return 16; // special case: still show 16 ticks
      default:          return 16;
    }
  }

  // Per-frame delay so that 0 → last frame always takes total_duration_s
  getFrameDelayMs() {
    const frames = this.getFramesForMethod(this.method);
    const steps  = Math.max(frames - 1, 1); // avoid div by 0
    return (this.total_duration_s * 1000) / steps;
  }

  /* ---------------- UI builders ---------------- */

  initSceneSelector() {
    const selector = document.getElementById(`${this.prefix}-scene-selector`);
    if (!selector) return;

    selector.innerHTML = "";
    for (let i = 0; i < this.n_scenes; i++) {
      const padded = i.toString().padStart(4, '0');

      const div = document.createElement("div");
      div.style.margin = "0.5em";

      const img = document.createElement("img");
      img.src = `${this.assets_path}/${this.prefix}/icons/${padded}.png`;
      img.style.borderRadius = "1em";
      img.style.maxWidth = "7em";
      img.style.cursor = "pointer";

      img.onclick = () => this.change_scene(padded);

      div.appendChild(img);
      selector.appendChild(div);
    }
  }

  initSliderSync() {
    if (!this.vid) return;
    const slider = document.getElementById(`${this.prefix}_frame_control`);
    if (!slider) return;

    this.vid.addEventListener('loadedmetadata', () => {
      this.vid.addEventListener('timeupdate', () => {
        if (!this.vid.duration) return;

        const progress   = this.vid.currentTime / this.vid.duration;
        const maxForCalc = parseInt(slider.max) || this.max_idx;
        let newVal = Math.round(progress * maxForCalc);
        if (newVal < 0) newVal = 0;
        if (newVal > maxForCalc) newVal = maxForCalc;

        if (parseInt(slider.value) !== newVal) {
          slider.value = String(newVal);
          this.cur_frame = newVal;
        }
      });
    });
  }

  updateSliderForMethod() {
    const slider = document.getElementById(`${this.prefix}_frame_control`);
    if (!slider) return;

    const frames = this.getFramesForMethod(this.method);
    this.max_idx = frames - 1;

    // Update slider range
    slider.min  = "0";
    slider.max  = String(this.max_idx);
    slider.step = "1";
    if (parseInt(slider.value) > this.max_idx) slider.value = "0";

    // Rebuild tick marks
    const ticks = slider.closest('.slider-container')?.querySelector('.slider-ticks');
    if (ticks) {
      ticks.innerHTML = "";
      for (let i = 0; i < frames; i++) {
        const span = document.createElement('span');
        ticks.appendChild(span);
      }
    }
  }

  /* ---------------- Scene & media control ---------------- */

  change_scene(scene_id) {
    this.base_im = scene_id;
    this.cur_frame = 0;

    if (this.input_img) {
      this.input_img.src = `${this.assets_path}/${this.prefix}/blurry/${scene_id}_${this.method}.png`;
    }

    this.loadVideos();
    this.change_frame(0);
  }

  setResolution(resolution) {
    this.ds = resolution === "half";
    this.assets_path = this.ds ? `ds_assets` : `assets`;
    this.change_scene(this.base_im);
  }

  loadVideos() {
    const scene  = this.base_im;
    const method = this.method;
    const vid_path = `${this.assets_path}/${this.prefix}/videos/${scene}/${method}.mp4`;

    this.vid.src = vid_path;
    this.vid.load();
    this.vid.currentTime = 0;
    this.vid.pause();
  }

  change_frame(idx) {
    this.cur_frame = parseInt(idx);
    const norm = this.max_idx ? (this.cur_frame / this.max_idx) : 0;
    this.video_elements.forEach(video => {
      if (video && video.duration) {
        video.currentTime = norm * video.duration;
      }
    });
  }

  /* ---------------- Playback controls ---------------- */

  toggle_play_pause() {
    this.isPlaying = !this.isPlaying;

    if (!this.isPlaying) {
      this.stop_anim();
    } else {
      this.stop_anim(); // reset any old timer
      this.cycle_frames(this.getFrameDelayMs());
    }

    this.updatePlayButton();
  }

  updatePlayButton() {
    const btn   = document.getElementById(`${this.prefix}-play-pause-btn`);
    const icon  = document.getElementById(`${this.prefix}-play-pause-icon`);
    if (!btn || !icon) return;

    const label = btn.querySelector("span:last-child");
    if (this.isPlaying) {
      icon.className = "fas fa-pause";
      if (label) label.textContent = "Pause";
    } else {
      icon.className = "fas fa-play";
      if (label) label.textContent = "Play";
    }
  }

  next_frame() {
    if (this.cur_frame >= this.max_idx) this.anim_dir = -1;
    if (this.cur_frame <= 0)            this.anim_dir =  1;
    this.change_frame(this.cur_frame + this.anim_dir);
  }

  cycle_frames(delayMs) {
    this.interval_id = setInterval(() => this.next_frame(), delayMs);
  }

  stop_anim() {
    if (this.interval_id) clearInterval(this.interval_id);
    this.interval_id = null;
  }

  /* ---------------- Method switcher ---------------- */

  set_method(name) {
    if (this.method === name) return;
    this.method = name;

    // Highlight the active button
    document.querySelectorAll(`#${this.prefix}-method-toggle button`).forEach(btn => {
      btn.classList.toggle("is-info",  btn.dataset.method === name);
      btn.classList.toggle("is-light", btn.dataset.method !== name);
    });

    // Update slider/ticks for new method
    this.updateSliderForMethod();

    // Update blurry image (per-method)
    if (this.input_img) {
      this.input_img.src = `${this.assets_path}/${this.prefix}/blurry/${this.base_im}_${this.method}.png`;
    }

    // Reload video + reset frame
    this.loadVideos();
    this.change_frame(0);

    // If currently playing, restart with the new per-frame delay
    if (this.isPlaying) {
      this.stop_anim();
      this.cycle_frames(this.getFrameDelayMs());
    }
  }
}
