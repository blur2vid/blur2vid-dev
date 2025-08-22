class EmbeddingViewer {
    constructor() {
        this.prefix = 'emb';
        this.max_idx = 16;
        this.n_scenes = 2;
        this.playback_speed = 0.2;
        
        this.cur_frame = 0;
        this.base_im = '0000';
        // this.method = 'present';
        this.interval_id = null;
        this.anim_dir = 1;
        this.ds = true;
        this.assets_path = `ds_assets`;

        this.input_img = document.getElementById(`${this.prefix}-blurry`);
        this.ground_truth = document.getElementById(`${this.prefix}-ground-truth`);
        this.local = document.getElementById(`${this.prefix}-local`);
        this.global= document.getElementById(`${this.prefix}-global`);
        // this.input_img = document.getElementById(`${this.prefix}-input`);

        this.video_elements = [this.ground_truth, this.local, this.global];

        this.change_scene(this.base_im);  // triggers loadVideos with the default scene
        this.initSceneSelector();
        this.initSliderSync();
        this.isPlaying = true;
        this.toggle_play_pause();
    }

    /* Scene selector from SimulatedViewer */
    initSceneSelector() {
        const selector = document.getElementById(`${this.prefix}-scene-selector`);
        selector.innerHTML = ""; // Clear any previous content
    
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


    /* Slider sync combining both versions */
    initSliderSync() {
        if (!this.ground_truth) return;
        const slider = document.getElementById(`${this.prefix}_frame_control`);
        if (!slider) return;
        this.ground_truth.addEventListener('loadedmetadata', () => {
            this.ground_truth.addEventListener('timeupdate', () => {
                if (!this.ground_truth.duration) return;
                const progress = this.ground_truth.currentTime / this.ground_truth.duration;

                const newVal = Math.round(progress * ((this.max_idx) || parseInt(slider.max) ));
                if (parseInt(slider.value) !== newVal) {
                    slider.value = newVal;
                    this.cur_frame = newVal;
                    // this.applyGlowEffect();
                }
            });
        });
    }
    /* Update frame on slider change */
    change_frame(idx) {
        //this.stop_anim();
        this.cur_frame = parseInt(idx);
        const norm = this.cur_frame / (this.max_idx);
        this.video_elements.forEach(video => {
            if (video && video.duration) {
                video.currentTime = norm * video.duration;

            }

        });
        // this.applyGlowEffect();
    }

    /* Scene change handler */
    change_scene(scene_id) {
        this.base_im = scene_id;
        this.cur_frame = 0;
        if (this.input_img) {
            this.input_img.src = `${this.assets_path}/${this.prefix}/blurry/${scene_id}_present.png`; //present and pastfuture are the same
        }
        this.loadVideos();
        this.change_frame(0);
    }

    setResolution(resolution) {
        console.log(`Setting resolution to: ${resolution}`);
        this.ds = resolution === "half";
        this.assets_path = this.ds ? `ds_assets` : `assets`;
        this.change_scene(this.base_im);  // reload videos with new resolution
    }

    /* Load video sources */
    loadVideos() {
        const scene = this.base_im;
        // const method = this.method;
        const ground_truth_path = `${this.assets_path}/${this.prefix}/videos/${scene}/GT.mp4`;
        const local_path = `${this.assets_path}/${this.prefix}/videos/${scene}/Local.mp4`;
        const global_path = `${this.assets_path}/${this.prefix}/videos/${scene}/Global.mp4`;

        this.ground_truth.src = ground_truth_path;
        this.ground_truth.load();
        this.ground_truth.currentTime = 0;

        this.local.src = local_path;
        this.local.load();
        this.local.currentTime = 0;

        this.global.src = global_path;
        this.global.load();
        this.global.currentTime = 0;
    }

    toggle_play_pause() {
        this.isPlaying = !this.isPlaying;

        //this.change_frame(this.cur_frame+1);
        if (! this.isPlaying) {
            // stop advancing the slider
            this.stop_anim();
        } else {
            // start cycling the slider frames
            // interpret playback_speed as seconds per frame
            const delayMs = 100;
            this.cycle_frames(delayMs);
        }
        // flip the play/pause button state
        this.updatePlayButton();
    }

    /* Update UI play button */
    updatePlayButton() {
        const btn = document.getElementById(`${this.prefix}-play-pause-btn`);
        const icon = document.getElementById(`${this.prefix}-play-pause-icon`);
        const label = btn.querySelector("span:last-child");
        if (this.isPlaying) { //show pause button while playing
            icon.className = "fas fa-pause";
            label.textContent = "Pause";
        } else {
            icon.className = "fas fa-play";
            label.textContent = "Play";
        }
    }


    /* Animation controls */
    next_frame() {
        if (this.cur_frame >= this.max_idx) this.anim_dir = -1;
        if (this.cur_frame === 0) this.anim_dir = 1;
        this.change_frame(this.cur_frame + this.anim_dir);
    }
    cycle_frames(delay = 200) {
        this.interval_id = setInterval(() => this.next_frame(), delay);
    }
    stop_anim() {
        if (this.interval_id) clearInterval(this.interval_id);
        this.interval_id = null;
    }

//     /* Glow effect for pastfuture method */
//     applyGlowEffect() {
//         const classes = ['video-glow-past', 'video-glow-present', 'video-glow-future'];
//         this.video_elements.forEach(video => video.classList.remove(...classes));
//         if (this.method !== 'pastfuture') return;

//         const region = this.getTemporalRegion(this.cur_frame);
//         this.video_elements.forEach(video => video.classList.add(`video-glow-${region}`));
//     }
//     getTemporalRegion(frameIndex) {
//         if (frameIndex <= 4) return 'past';
//         if (frameIndex >= 12) return 'future';
//         return 'present';
//     }

//     /* Method switcher */
//     set_method(name) {
//         this.method = name;
//         this.loadVideos();
//         document.querySelectorAll(`#${this.prefix}-method-toggle button`).forEach(btn => {
//             btn.classList.toggle("is-info", btn.dataset.method === name);
//             btn.classList.toggle("is-light", btn.dataset.method !== name);
//         });
//         const slider = document.getElementById(`${this.prefix}_frame_control`);
//         if (slider) slider.classList.toggle("pastfuture", name === "pastfuture");
//         ['past', 'future'].forEach(region => {
//             const el = document.getElementById(`${this.prefix}-legend-${region}`);
//             if (el) el.style.display = name === "pastfuture" ? "inline-flex" : "none";
//         });
//         this.change_frame(this.cur_frame);
//     }
}
