(() => {
  // Render the driving game as a centered, 80%-size foreground overlay.
  if (window.__carGameActive) return;
  window.__carGameActive = true;

  const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  const start = () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111122);
    scene.fog = new THREE.FogExp2(0x111122, 0.0015);

    const view = document.createElement('div');
    Object.assign(view.style, {
      position: 'fixed',
      left: '10vw',
      top: '10vh',
      width: '80vw',
      height: '80vh',
      overflow: 'hidden',
      background: '#111122',
      border: '2px solid rgba(0, 255, 200, .85)',
      borderRadius: '12px',
      boxShadow: '0 0 32px rgba(0, 255, 200, .35)',
      zIndex: '2147483000'
    });
    document.body.appendChild(view);

    const width = view.clientWidth;
    const height = view.clientHeight;
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    Object.assign(renderer.domElement.style, {
      display: 'block',
      width: '100%',
      height: '100%'
    });
    view.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xb9d8ff, 0x303040, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(20, 40, 15);
    scene.add(sun);

    // A broad, visible loop track with a contrasting center line.
    const points = [];
    for (let i = 0; i < 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      const r = 95 + Math.sin(i * 0.2) * 12 + Math.cos(i * 0.11) * 8;
      points.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    const curve = new THREE.CatmullRomCurve3(points, true);
    const track = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 500, 7, 12, true),
      new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.85 })
    );
    scene.add(track);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshStandardMaterial({ color: 0x17251d, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -8;
    scene.add(ground);
    const grid = new THREE.GridHelper(500, 50, 0x00aa88, 0x24443c);
    grid.position.y = -7.9;
    scene.add(grid);

    const car = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0055,
      metalness: 0.35,
      roughness: 0.25
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 4.2), bodyMaterial);
    body.position.y = 1.1;
    car.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.8, 2),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2 })
    );
    cabin.position.set(0, 1.85, -0.25);
    car.add(cabin);
    const wheelGeometry = new THREE.CylinderGeometry(0.48, 0.48, 0.35, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    for (const [x, z] of [[-1.25, 1.3], [1.25, 1.3], [-1.25, -1.3], [1.25, -1.3]]) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.55, z);
      car.add(wheel);
    }
    scene.add(car);

    const hud = document.createElement('div');
    hud.textContent = 'SPEED: 0 km/h';
    Object.assign(hud.style, {
      position: 'absolute', top: '14px', left: '18px',
      color: '#00ffcc', font: 'bold 20px monospace',
      textShadow: '0 2px 6px #000', pointerEvents: 'none'
    });
    view.appendChild(hud);

    const keys = { up: false, down: false, left: false, right: false };
    const keyMap = {
      ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down',
      ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right'
    };
    const onKeyDown = (event) => {
      const key = keyMap[event.key];
      if (key) {
        keys[key] = true;
        event.preventDefault();
      }
    };
    const onKeyUp = (event) => {
      const key = keyMap[event.key];
      if (key) keys[key] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Touch/mouse steering controls stay inside the game overlay.
    const joystick = document.createElement('div');
    Object.assign(joystick.style, {
      position: 'absolute', bottom: '18px', right: '18px',
      width: '104px', height: '104px', borderRadius: '50%',
      background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.5)',
      touchAction: 'none'
    });
    const knob = document.createElement('div');
    Object.assign(knob.style, {
      position: 'absolute', left: '27px', top: '27px', width: '50px', height: '50px',
      borderRadius: '50%', background: '#00ffcc', boxShadow: '0 0 12px #00ffcc'
    });
    joystick.appendChild(knob);
    view.appendChild(joystick);

    let steering = 0;
    let pointerId = null;
    const steer = (event) => {
      const rect = joystick.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      steering = Math.max(-1, Math.min(1, dx / 45));
      knob.style.transform = `translate(${steering * 22}px, 0)`;
    };
    joystick.addEventListener('pointerdown', (event) => {
      pointerId = event.pointerId;
      joystick.setPointerCapture(pointerId);
      steer(event);
    });
    joystick.addEventListener('pointermove', (event) => {
      if (event.pointerId === pointerId) steer(event);
    });
    const release = () => {
      pointerId = null;
      steering = 0;
      knob.style.transform = '';
    };
    joystick.addEventListener('pointerup', release);
    joystick.addEventListener('pointercancel', release);

    let progress = 0;
    let speed = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      const accelerating = keys.up ? 1 : 0;
      const braking = keys.down ? 1 : 0;
      speed = Math.max(0, Math.min(0.004, speed + accelerating * 0.00008 - braking * 0.00012));
      if (!accelerating && !braking) speed *= 0.995;
      const turn = (keys.left ? -1 : 0) + (keys.right ? 1 : 0) + steering;
      progress = (progress + speed) % 1;

      const t = progress;
      const position = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      car.position.copy(position);
      car.position.y = 0;
      car.rotation.y = Math.atan2(tangent.x, tangent.z) + turn * 0.12;

      const behind = position.clone().addScaledVector(tangent, -13);
      behind.y += 7;
      camera.position.lerp(behind, 0.12);
      const lookAt = position.clone().addScaledVector(tangent, 8);
      lookAt.y += 1;
      camera.lookAt(lookAt);

      hud.textContent = `SPEED: ${Math.round(speed * 30000)} km/h`;
      renderer.render(scene, camera);
    };

    const resize = () => {
      const w = view.clientWidth;
      const h = view.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', resize);
    animate();
  };

  const script = document.createElement('script');
  script.src = THREE_CDN;
  script.onload = start;
  script.onerror = () => {
    window.__carGameActive = false;
    console.error('Car game could not load Three.js. Check the network connection.');
  };
  document.head.appendChild(script);
})();
