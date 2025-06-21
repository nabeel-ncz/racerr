 // --- Game Constants ---
 const canvas = document.getElementById('gameCanvas');
 const ctx = canvas.getContext('2d');
 const FPS = 60;

 // --- Pixel Art Rendering: No smoothing for crisp look ---
 ctx.imageSmoothingEnabled = false;

 // --- Asset Loading ---
 const carImages = [];
 const loadedAssets = {
     cars: false,
     track: false,
     props: false
 };

 // Load car sprites
 const carTypes = ['red', 'blue', 'green', 'yellow'];
 let loadedCarCount = 0;

 carTypes.forEach(color => {
     const img = new Image();
     img.src = `assets/Cars/Player_${color} (16 x 16).png`;
     img.onload = () => {
         loadedCarCount++;
         if (loadedCarCount === carTypes.length) {
             loadedAssets.cars = true;
             checkAllAssetsLoaded();
         }
     };
     carImages.push(img);
 });

 // Load track assets
 const trackAssets = {
     road: new Image(),
     details: new Image(),
     props: new Image(),
     markings: new Image()
 };

 trackAssets.road.src = 'assets/Levels/Summer_road (64 x 64).png';
 trackAssets.details.src = 'assets/Levels/Summer_details (16 x 16).png';
 trackAssets.props.src = 'assets/Props/Misc_props (16 x 16).png';
 trackAssets.markings.src = 'assets/Props/Road_markings (16 x 16).png';

 let loadedTrackAssets = 0;
 const totalTrackAssets = Object.keys(trackAssets).length;

 Object.values(trackAssets).forEach(img => {
     img.onload = () => {
         loadedTrackAssets++;
         if (loadedTrackAssets === totalTrackAssets) {
             loadedAssets.track = true;
             checkAllAssetsLoaded();
         }
     };
 });

 // UI assets
 const uiAssets = {
     speedIndicator: new Image(),
     damageIndicator: new Image()
 };

 uiAssets.speedIndicator.src = 'assets/UI/Speed_indicator_numbers (8 x 8).png';
 uiAssets.damageIndicator.src = 'assets/UI/Damage_indicator (8 x 8).png';

 let loadedUIAssets = 0;
 const totalUIAssets = Object.keys(uiAssets).length;

 Object.values(uiAssets).forEach(img => {
     img.onload = () => {
         loadedUIAssets++;
         if (loadedUIAssets === totalUIAssets) {
             loadedAssets.props = true;
             checkAllAssetsLoaded();
         }
     };
 });

 function checkAllAssetsLoaded() {
     if (Object.values(loadedAssets).every(loaded => loaded)) {
         // All assets loaded, start the game
         gameLoop();
     }
 }

 // --- Sound Effects ---
 const sounds = {
     engine: new Audio(),
     drift: new Audio(),
     crash: new Audio(),
     checkpoint: new Audio()
 };

 // --- Game State ---
 let gameRunning = false;
 let startTime = 0;
 let elapsedTime = 0;
 let lap = 1;
 let maxLaps = 3;
 let bestTime = localStorage.getItem('bestTime') || null;
 let currentCarIndex = 0;

 // --- Car Colors/Styles ---
 const carStyles = [
     { primary: '#ff4444', secondary: '#cc0000', name: 'Red Racer', spriteIndex: 0 },
     { primary: '#4444ff', secondary: '#0000cc', name: 'Blue Thunder', spriteIndex: 1 },
     { primary: '#44ff44', secondary: '#00cc00', name: 'Green Machine', spriteIndex: 2 },
     { primary: '#ffff44', secondary: '#cccc00', name: 'Yellow Lightning', spriteIndex: 3 },
     { primary: '#ff44ff', secondary: '#cc00cc', name: 'Pink Power', spriteIndex: 0 },
     { primary: '#44ffff', secondary: '#00cccc', name: 'Cyan Cruiser', spriteIndex: 1 }
 ];

 // --- Car Object ---
 const car = {
     x: 400,
     y: 300,
     width: 32,  // Increased size for better visibility
     height: 24, // Increased size for better visibility
     angle: 0,
     speed: 0,
     maxSpeed: 7,      // Increased max speed
     accel: 0.15,      // Adjusted for smoother acceleration
     friction: 0.05,   // Reduced for better control
     turnSpeed: 3.0,   // Base turn speed
     driftFactor: 0,   // New drift mechanic
     grip: 1.0,        // New grip mechanic
     health: 100,      // New health mechanic
     isDrifting: false,
     isHandbraking: false,
     engineSound: 0,   // For engine sound effect
     trail: [],
     skidMarks: [],    // New skid marks array
     maxTrailLength: 15,
     maxSkidLength: 60,
     spriteFrame: 0,   // For animation
     damageFlash: 0    // Visual indicator for damage
 };

 // --- Track Definition (Oval with checkpoints) ---
 const track = {
     centerX: 500,
     centerY: 350,
     outerRadiusX: 420,
     outerRadiusY: 320,
     innerRadiusX: 180,
     innerRadiusY: 120,
     checkpoints: [
         { x: 400, y: 80, passed: false, name: "North Turn" },    // Top
         { x: 720, y: 300, passed: false, name: "East Straight" },   // Right
         { x: 400, y: 520, passed: false, name: "South Turn" },   // Bottom
         { x: 80, y: 300, passed: false, name: "Start/Finish" }     // Left (Start/Finish)
     ],
     startLine: { x: 80, y: 300 },
     decorations: [],  // Will hold track decorations
     roadSegments: []  // Will hold road texture segments
 };

 // Function to randomize checkpoint locations
 function randomizeCheckpoints() {
     const centerX = track.centerX;randomizeCheckpoints
     const centerY = track.centerY;
     const outerRadiusX = track.outerRadiusX * 0.8; // Ensure checkpoints are within track
     const outerRadiusY = track.outerRadiusY * 0.8;

     track.checkpoints = [];
     for (let i = 0; i < 4; i++) {
         const angle = Math.random() * Math.PI * 2;
         const x = centerX + Math.cos(angle) * outerRadiusX;
         const y = centerY + Math.sin(angle) * outerRadiusY;
         track.checkpoints.push({
             x: x,
             y: y,
             passed: false,
             name: `Checkpoint ${i + 1}`
         });
     }
 }

 // Generate track decorations
 function generateTrackDecorations() {
     // Clear existing decorations
     track.decorations = [];
     track.roadSegments = [];
     
     // Add road segments along the track
     const segments = 300;
     for (let i = 0; i < segments; i++) {
         const angle = (i / segments) * Math.PI * 2;
         const midRadiusX = (track.outerRadiusX + track.innerRadiusX) / 2;
         const midRadiusY = (track.outerRadiusY + track.innerRadiusY) / 2;
         const width = (track.outerRadiusX - track.innerRadiusX);
         
         track.roadSegments.push({
             x: track.centerX + Math.cos(angle) * midRadiusX,
             y: track.centerY + Math.sin(angle) * midRadiusY,
             angle: angle + Math.PI/2,
             width: width,
             height: 64,
             type: Math.floor(i / 3) % 2 // Alternate road types
         });
     }
     
     // Add decorative elements outside the track
     for (let i = 0; i < 20; i++) {
         const angle = Math.random() * Math.PI * 2;
         const distance = track.outerRadiusX + 30 + Math.random() * 100;
         const x = track.centerX + Math.cos(angle) * distance;
         const y = track.centerY + Math.sin(angle) * distance;
         
         track.decorations.push({
             x: x,
             y: y,
             type: Math.floor(Math.random() * 6), // Random decoration type
             scale: 0.8 + Math.random() * 0.5
         });
     }
     
     // Add decorative elements inside the track
     for (let i = 0; i < 5; i++) {
         const angle = Math.random() * Math.PI * 2;
         const distance = track.innerRadiusX - 30 - Math.random() * 50;
         const x = track.centerX + Math.cos(angle) * distance;
         const y = track.centerY + Math.sin(angle) * distance;
         
         track.decorations.push({
             x: x,
             y: y,
             type: Math.floor(Math.random() * 6), // Random decoration type
             scale: 0.6 + Math.random() * 0.4
         });
     }
 }

 // --- Particle System ---
 const particles = [];
 class Particle {
     constructor(x, y, vx, vy, color, life, type = 'basic') {
         this.x = x;
         this.y = y;
         this.vx = vx;
         this.vy = vy;
         this.color = color;
         this.life = life;
         this.maxLife = life;
         this.size = Math.random() * 3 + 1;
         this.type = type;
         this.rotation = Math.random() * Math.PI * 2;
         this.rotationSpeed = (Math.random() - 0.5) * 0.2;
     }
     
     update() {
         this.x += this.vx;
         this.y += this.vy;
         this.life--;
         this.rotation += this.rotationSpeed;
         
         // Different behavior based on particle type
         switch(this.type) {
             case 'smoke':
                 this.size += 0.05;
                 this.vx *= 0.97;
                 this.vy *= 0.97;
                 break;
             case 'spark':
                 this.vx *= 0.96;
                 this.vy *= 0.96;
                 this.vy += 0.05; // Gravity effect
                 break;
             case 'debris':
                 this.vx *= 0.98;
                 this.vy *= 0.98;
                 this.vy += 0.1; // Stronger gravity
                 this.rotation += this.rotationSpeed;
                 break;
             default: // 'basic'
                 this.vx *= 0.98;
                 this.vy *= 0.98;
         }
     }
     
     draw() {
         const alpha = this.life / this.maxLife;
         ctx.save();
         ctx.globalAlpha = alpha;
         
         switch(this.type) {
             case 'smoke':
                 ctx.fillStyle = this.color;
                 ctx.beginPath();
                 ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                 ctx.fill();
                 break;
             case 'spark':
                 ctx.fillStyle = this.color;
                 ctx.translate(this.x, this.y);
                 ctx.rotate(this.rotation);
                 ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size/2);
                 break;
             case 'debris':
                 ctx.fillStyle = this.color;
                 ctx.translate(this.x, this.y);
                 ctx.rotate(this.rotation);
                 ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
                 break;
             default: // 'basic'
                 ctx.fillStyle = this.color;
                 ctx.fillRect(this.x, this.y, this.size, this.size);
         }
         
         ctx.restore();
     }
 }

 // --- Skid Mark Class ---
 class SkidMark {
     constructor(x, y, angle, width, intensity) {
         this.x = x;
         this.y = y;
         this.angle = angle;
         this.width = width;
         this.intensity = intensity;
         this.life = 300; // Skid marks last longer than particles
     }
     
     update() {
         this.life--;
         return this.life > 0;
     }
     
     draw() {
         const alpha = Math.min(1, this.life / 100) * this.intensity;
         ctx.save();
         ctx.globalAlpha = alpha;
         ctx.translate(this.x, this.y);
         ctx.rotate(this.angle);
         ctx.fillStyle = '#111111';
         ctx.fillRect(-this.width/2, -1, this.width, 2);
         ctx.restore();
     }
 }

 // --- Input State ---
 const keys = {};

 document.addEventListener('keydown', e => {
     keys[e.key.toLowerCase()] = true;
     
     // Prevent arrow keys from scrolling the page
     if(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
         e.preventDefault();
     }
 });
 
 document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

document.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'enter') {
        startGame();
    } else if (e.key.toLowerCase() === 'r') {
        resetGame();
    } else if (e.key.toLowerCase() === 'c') {
        changeCar();
    }
});

function changeCar() {
     currentCarIndex = (currentCarIndex + 1) % carStyles.length;
     const style = carStyles[currentCarIndex];
     
     // Create particles for car change effect
     for (let i = 0; i < 20; i++) {
         particles.push(new Particle(
             car.x + car.width/2,
             car.y + car.height/2,
             (Math.random() - 0.5) * 5,
             (Math.random() - 0.5) * 5,
             style.primary,
             40,
             'spark'
         ));
     }
     
     // Flash effect
     canvas.style.filter = 'brightness(1.5)';
     setTimeout(() => canvas.style.filter = 'brightness(1)', 200);
     
     // Update UI
     document.getElementById('car-name').textContent = style.name;
 }

 function startGame() {
     if (!gameRunning) {
         // Generate track decorations if not already done
         if (track.decorations.length === 0) {
             generateTrackDecorations();
         }
         
         gameRunning = true;
         startTime = performance.now();
         lap = 1;
         car.x = 120;
         car.y = 290;
         car.angle = 0;
         car.speed = 1;
         car.health = 100;
         car.driftFactor = 0;
         car.trail = [];
         car.skidMarks = [];
         
         // Randomize checkpoints
         randomizeCheckpoints();

         // Reset checkpoints
         track.checkpoints.forEach(cp => cp.passed = false);
         
         // Create start effect
         for (let i = 0; i < 30; i++) {
             particles.push(new Particle(
                 track.startLine.x,
                 track.startLine.y + (Math.random() - 0.5) * 40,
                 (Math.random() - 0.5) * 3,
                 (Math.random() - 0.5) * 3,
                 '#ffffff',
                 60,
                 'spark'
             ));
         }
         
         requestAnimationFrame(gameLoop);
     }
 }

 function resetGame() {
     gameRunning = false;
     lap = 1;
     elapsedTime = 0;
     car.x = 120;
     car.y = 290;
     car.angle = 0;
     car.speed = 0;
     car.health = 100;
     car.driftFactor = 0;
     car.trail = [];
     car.skidMarks = [];
     track.checkpoints.forEach(cp => cp.passed = false);
     particles.length = 0;
 }

 function isPointInTrack(x, y) {
     const dx = x - track.centerX;
     const dy = y - track.centerY;
     
     const outerCheck = (dx * dx) / (track.outerRadiusX * track.outerRadiusX) + 
                       (dy * dy) / (track.outerRadiusY * track.outerRadiusY) <= 1;
     const innerCheck = (dx * dx) / (track.innerRadiusX * track.innerRadiusX) + 
                       (dy * dy) / (track.innerRadiusY * track.innerRadiusY) >= 1;
     
     return outerCheck && innerCheck;
 }

 // Calculate the distance from a point to the track edge
 function distanceToTrackEdge(x, y) {
     const dx = x - track.centerX;
     const dy = y - track.centerY;
     
     // Calculate normalized distance from center
     const distRatio = Math.sqrt((dx * dx) / (track.outerRadiusX * track.outerRadiusX) + 
                                (dy * dy) / (track.outerRadiusY * track.outerRadiusY));
     
     if (distRatio > 1) {
         // Outside outer edge
         return -1 * Math.min(
             Math.abs(x - (track.centerX + track.outerRadiusX)),
             Math.abs(x - (track.centerX - track.outerRadiusX)),
             Math.abs(y - (track.centerY + track.outerRadiusY)),
             Math.abs(y - (track.centerY - track.outerRadiusY))
         );
     } else {
         const innerDistRatio = Math.sqrt((dx * dx) / (track.innerRadiusX * track.innerRadiusX) + 
                                        (dy * dy) / (track.innerRadiusY * track.innerRadiusY));
         
         if (innerDistRatio < 1) {
             // Inside inner edge
             return -1 * Math.min(
                 Math.abs(x - (track.centerX + track.innerRadiusX)),
                 Math.abs(x - (track.centerX - track.innerRadiusX)),
                 Math.abs(y - (track.centerY + track.innerRadiusY)),
                 Math.abs(y - (track.centerY - track.innerRadiusY))
             );
         } else {
             // On the track - calculate distance to nearest edge
             const distToOuter = Math.abs(1 - distRatio) * Math.min(track.outerRadiusX, track.outerRadiusY);
             const distToInner = Math.abs(1 - innerDistRatio) * Math.min(track.innerRadiusX, track.innerRadiusY);
             return Math.min(distToOuter, distToInner);
         }
     }
 }

 function checkCollisions() {
     // Calculate car corners based on rotation
     const cos = Math.cos(car.angle * Math.PI / 180);
     const sin = Math.sin(car.angle * Math.PI / 180);
     const cx = car.x + car.width/2;
     const cy = car.y + car.height/2;
     
     const corners = [
         { 
             x: cx + (cos * car.width/2 - sin * car.height/2),
             y: cy + (sin * car.width/2 + cos * car.height/2)
         },
         { 
             x: cx + (cos * car.width/2 + sin * car.height/2),
             y: cy + (sin * car.width/2 - cos * car.height/2)
         },
         { 
             x: cx + (-cos * car.width/2 - sin * car.height/2),
             y: cy + (-sin * car.width/2 + cos * car.height/2)
         },
         { 
             x: cx + (-cos * car.width/2 + sin * car.height/2),
             y: cy + (-sin * car.width/2 - cos * car.height/2)
         }
     ];
     
     let collision = false;
     let minDistance = Infinity;
     
     for (let corner of corners) {
         if (!isPointInTrack(corner.x, corner.y)) {
             collision = true;
             const distance = distanceToTrackEdge(corner.x, corner.y);
             if (Math.abs(distance) < Math.abs(minDistance)) {
                 minDistance = distance;
             }
         }
     }
     
     if (collision) {
         // Calculate impact force based on speed
         const impactForce = Math.abs(car.speed) * 10;
         
         // Reduce health based on impact force
         const damage = Math.min(30, impactForce);
         car.health = Math.max(0, car.health - damage);
         
         // Visual feedback
         car.damageFlash = 10;
         
         // Create crash particles
         const particleCount = Math.floor(10 + impactForce);
         for (let i = 0; i < particleCount; i++) {
             // Sparks
             particles.push(new Particle(
                 car.x + car.width/2,
                 car.y + car.height/2,
                 (Math.random() - 0.5) * 8,
                 (Math.random() - 0.5) * 8,
                 '#ff6666',
                 30,
                 'spark'
             ));
             
             // Debris
             if (i % 3 === 0) {
                 particles.push(new Particle(
                     car.x + car.width/2,
                     car.y + car.height/2,
                     (Math.random() - 0.5) * 4,
                     (Math.random() - 0.5) * 4,
                     carStyles[currentCarIndex].primary,
                     45,
                     'debris'
                 ));
             }
         }
         
         // Bounce effect - more realistic collision response
         const bounceDirection = Math.atan2(car.y - track.centerY, car.x - track.centerX);
         const currentDirection = car.angle * Math.PI / 180;
         const impactAngle = bounceDirection - currentDirection;
         
         // Apply bounce force
         car.speed = -car.speed * 0.5;
         
         // Push car away from wall slightly to prevent getting stuck
         car.x += Math.cos(bounceDirection) * Math.min(5, Math.abs(minDistance));
         car.y += Math.sin(bounceDirection) * Math.min(5, Math.abs(minDistance));
         
         return true;
     }
     return false;
 }

 function checkCheckpoints() {
     const carCenterX = car.x + car.width / 2;
     const carCenterY = car.y + car.height / 2;
     
     track.checkpoints.forEach((checkpoint, index) => {
         const distance = Math.sqrt(
             Math.pow(carCenterX - checkpoint.x, 2) + 
             Math.pow(carCenterY - checkpoint.y, 2)
         );
         
         if (distance < 30 && !checkpoint.passed) {
             checkpoint.passed = true;
             
             // Create checkpoint particles
             for (let i = 0; i < 15; i++) {
                 particles.push(new Particle(
                     checkpoint.x + (Math.random() - 0.5) * 20,
                     checkpoint.y + (Math.random() - 0.5) * 20,
                     (Math.random() - 0.5) * 4,
                     (Math.random() - 0.5) * 4,
                     '#44ff44',
                     40
                 ));
             }
             
             // Check if all checkpoints passed
             if (track.checkpoints.every(cp => cp.passed)) {
                 lap++;
                 track.checkpoints.forEach(cp => cp.passed = false);
                 
                 if (lap > maxLaps) {
                     // Race finished!
                     gameRunning = false;
                     if (!bestTime || elapsedTime < bestTime) {
                         bestTime = elapsedTime;
                         localStorage.setItem('bestTime', bestTime);
                         alert(`NEW BEST TIME! ${elapsedTime.toFixed(2)}s`);
                     } else {
                         alert(`Race Complete! Time: ${elapsedTime.toFixed(2)}s`);
                     }
                 }
             }
         }
     });
 }

 function update() {
     if (!gameRunning) return;
     
     // Handle handbrake (space bar)
     car.isHandbraking = keys[' '];
     
     // Adjust grip based on handbrake
     car.grip = car.isHandbraking ? 0.3 : 1.0;
     
     // Car movement with improved physics
     if (keys['arrowup'] || keys['w']) {
         // Progressive acceleration (faster at lower speeds, slower at high speeds)
         const accelFactor = 1 - (Math.abs(car.speed) / car.maxSpeed) * 0.6;
         car.speed += car.accel * accelFactor;
         
         // Engine particles
         if (Math.random() < 0.3) {
             const angle = car.angle + 180 + (Math.random() - 0.5) * 30;
             const rad = angle * Math.PI / 180;
             particles.push(new Particle(
                 car.x + car.width/2 - Math.sin(rad) * 15,
                 car.y + car.height/2 + Math.cos(rad) * 15,
                 -Math.sin(rad) * 2 + (Math.random() - 0.5) * 2,
                 Math.cos(rad) * 2 + (Math.random() - 0.5) * 2,
                 '#888888',
                 20,
                 'smoke'
             ));
         }
     } else {
         // Progressive deceleration
         if (car.speed > 0) {
             car.speed -= car.friction * (1 + Math.abs(car.speed) * 0.1);
         } else {
             car.speed += car.friction * (1 + Math.abs(car.speed) * 0.1);
         }
     }
     
     // Braking/Reverse
     if (keys['arrowdown'] || keys['s']) {
         if (car.speed > 0) {
             // Braking is stronger than coasting
             car.speed -= car.accel * 1.5;
         } else {
             // Reverse is slower than forward
             car.speed -= car.accel * 0.5;
         }
     }
     
     // Steering with improved handling
     const turnFactor = car.isHandbraking ? 1.8 : 1.0; // Sharper turns with handbrake
     const speedFactor = Math.min(1, Math.abs(car.speed) / 2); // More responsive at lower speeds
     
     if (keys['arrowleft'] || keys['a']) {
         // Apply steering
         car.angle -= car.turnSpeed * speedFactor * turnFactor;
         
         // Apply drift when handbraking or at high speeds
         if (car.isHandbraking && Math.abs(car.speed) > 1) {
             car.isDrifting = true;
             car.driftFactor = -0.8;
             
             // Create skid marks
             if (Math.random() < 0.4 && Math.abs(car.speed) > 2) {
                 const rad = car.angle * Math.PI / 180;
                 const intensity = Math.min(1, Math.abs(car.speed) / car.maxSpeed);
                 
                 car.skidMarks.push(new SkidMark(
                     car.x + car.width/2,
                     car.y + car.height/2,
                     rad,
                     car.width * 0.6,
                     intensity
                 ));
                 
                 if (car.skidMarks.length > car.maxSkidLength) {
                     car.skidMarks.shift();
                 }
             }
         }
     } else if (keys['arrowright'] || keys['d']) {
         // Apply steering
         car.angle += car.turnSpeed * speedFactor * turnFactor;
         
         // Apply drift when handbraking or at high speeds
         if (car.isHandbraking && Math.abs(car.speed) > 1) {
             car.isDrifting = true;
             car.driftFactor = 0.8;
             
             // Create skid marks
             if (Math.random() < 0.4 && Math.abs(car.speed) > 2) {
                 const rad = car.angle * Math.PI / 180;
                 const intensity = Math.min(1, Math.abs(car.speed) / car.maxSpeed);
                 
                 car.skidMarks.push(new SkidMark(
                     car.x + car.width/2,
                     car.y + car.height/2,
                     rad,
                     car.width * 0.6,
                     intensity
                 ));
                 
                 if (car.skidMarks.length > car.maxSkidLength) {
                     car.skidMarks.shift();
                 }
             }
         }
     } else {
         // Gradually reduce drift when not steering
         car.driftFactor *= 0.9;
         if (Math.abs(car.driftFactor) < 0.1) {
             car.driftFactor = 0;
             car.isDrifting = false;
         }
     }
     
     // Clamp speed
     car.speed = Math.max(Math.min(car.speed, car.maxSpeed), -car.maxSpeed/2);
     if (Math.abs(car.speed) < 0.01) car.speed = 0;
     
     // Update position with drift physics
     const prevX = car.x;
     const prevY = car.y;
     
     // Calculate movement direction (with drift)
     const moveAngle = car.angle + car.driftFactor * 15; // Drift affects movement direction
     const rad = moveAngle * Math.PI / 180;
     
     // Apply movement
     car.x += Math.sin(rad) * car.speed;
     car.y -= Math.cos(rad) * car.speed;
     
     // Add to trail
     if (car.speed > 1) {
         car.trail.push({ x: prevX + car.width/2, y: prevY + car.height/2 });
         if (car.trail.length > car.maxTrailLength) {
             car.trail.shift();
         }
     }
     
     // Update skid marks
     for (let i = car.skidMarks.length - 1; i >= 0; i--) {
         if (!car.skidMarks[i].update()) {
             car.skidMarks.splice(i, 1);
         }
     }
     
     // Animate car sprite
     car.spriteFrame = (car.spriteFrame + 1) % 10;
     
     // Reduce damage flash
     if (car.damageFlash > 0) {
         car.damageFlash--;
     }
     
     // Check collisions
     checkCollisions();
     
     // Check checkpoints
     checkCheckpoints();
     
     // Update particles
     for (let i = particles.length - 1; i >= 0; i--) {
         particles[i].update();
         if (particles[i].life <= 0) {
             particles.splice(i, 1);
         }
     }
 }

 function drawTrack() {
     // Draw track background (grass)
     ctx.fillStyle = '#1a4a3a';
     ctx.fillRect(0, 0, canvas.width, canvas.height);
     
     // Draw skid marks first (they appear on the track)
     car.skidMarks.forEach(skidMark => skidMark.draw());
     
     // Draw track decorations that are behind the track
     track.decorations.forEach(decoration => {
         // Only draw decorations that are "behind" the track
         if (decoration.x < track.centerX - track.outerRadiusX || 
             decoration.x > track.centerX + track.outerRadiusX ||
             decoration.y < track.centerY - track.outerRadiusY || 
             decoration.y > track.centerY + track.outerRadiusY) {
             
             ctx.save();
             ctx.translate(decoration.x, decoration.y);
             ctx.scale(decoration.scale, decoration.scale);
             
             // Draw decoration based on type
             if (loadedAssets.track) {
                 const size = 16;
                 const typeX = (decoration.type % 3) * size;
                 const typeY = Math.floor(decoration.type / 3) * size;
                 
                 ctx.drawImage(
                     trackAssets.details,
                     typeX, typeY, size, size,
                     -size/2, -size/2, size, size
                 );
             } else {
                 // Fallback if assets not loaded
                 ctx.fillStyle = '#2d5a2d';
                 ctx.fillRect(-8, -8, 16, 16);
             }
             
             ctx.restore();
         }
     });
     
     // Draw outer boundary
     ctx.beginPath();
     ctx.ellipse(track.centerX, track.centerY, track.outerRadiusX, track.outerRadiusY, 0, 0, 2 * Math.PI);
     ctx.fillStyle = '#2d5a2d';
     ctx.fill();
     
     // Draw road segments
     if (loadedAssets.track) {
         track.roadSegments.forEach(segment => {
             ctx.save();
             ctx.translate(segment.x, segment.y);
             ctx.rotate(segment.angle - Math.PI/2); // Corrected angle
             
             // Draw road texture
             const roadTileSize = 64;
             ctx.drawImage(
                 trackAssets.road,
                 segment.type * roadTileSize, 0, roadTileSize, roadTileSize,
                 -segment.width/2, -segment.height/2, segment.width, segment.height
             );
             
             // Draw road markings
             if (Math.random() < 0.3) {
                 const markingSize = 16;
                 const markingType = Math.floor(Math.random() * 4);
                 const markingX = markingType * markingSize;
                 
                 ctx.drawImage(
                     trackAssets.markings,
                     markingX, 0, markingSize, markingSize,
                     -markingSize/2, -markingSize/2, markingSize, markingSize
                 );
             }
             
             ctx.restore();
         });
     } else {
         // Fallback if assets not loaded
         ctx.beginPath();
         ctx.ellipse(track.centerX, track.centerY, 
                    (track.outerRadiusX + track.innerRadiusX) / 2, 
                    (track.outerRadiusY + track.innerRadiusY) / 2, 
                    0, 0, 2 * Math.PI);
         ctx.lineWidth = track.outerRadiusX - track.innerRadiusX;
         ctx.strokeStyle = '#555555';
         ctx.stroke();
     }
     
     // Draw inner hole
     ctx.beginPath();
     ctx.ellipse(track.centerX, track.centerY, track.innerRadiusX, track.innerRadiusY, 0, 0, 2 * Math.PI);
     ctx.fillStyle = '#1a4a3a';
     ctx.fill();
     
     // Draw track decorations that are inside the track
     track.decorations.forEach(decoration => {
         // Only draw decorations that are inside the inner track area
         const dx = decoration.x - track.centerX;
         const dy = decoration.y - track.centerY;
         const distRatio = Math.sqrt((dx * dx) / (track.innerRadiusX * track.innerRadiusX) + 
                                    (dy * dy) / (track.innerRadiusY * track.innerRadiusY));
         
         if (distRatio < 0.9) {
             ctx.save();
             ctx.translate(decoration.x, decoration.y);
             ctx.scale(decoration.scale, decoration.scale);
             
             // Draw decoration based on type
             if (loadedAssets.track) {
                 const size = 16;
                 const typeX = (decoration.type % 3) * size;
                 const typeY = Math.floor(decoration.type / 3) * size;
                 
                 ctx.drawImage(
                     trackAssets.details,
                     typeX, typeY, size, size,
                     -size/2, -size/2, size, size
                 );
             } else {
                 // Fallback if assets not loaded
                 ctx.fillStyle = '#2d5a2d';
                 ctx.fillRect(-8, -8, 16, 16);
             }
             
             ctx.restore();
         }
     });
     
     // Draw track lines
     ctx.strokeStyle = '#ffffff';
     ctx.lineWidth = 2;
     ctx.setLineDash([10, 10]);
     
     // Middle line
     const midRadiusX = (track.outerRadiusX + track.innerRadiusX) / 2;
     const midRadiusY = (track.outerRadiusY + track.innerRadiusY) / 2;
     ctx.beginPath();
     ctx.ellipse(track.centerX, track.centerY, midRadiusX, midRadiusY, 0, 0, 2 * Math.PI);
     ctx.stroke();
     
     ctx.setLineDash([]);
     
     // Draw checkpoints
     track.checkpoints.forEach((checkpoint, index) => {
         ctx.fillStyle = checkpoint.passed ? 'rgba(68, 255, 68, 0.7)' : 'rgba(255, 255, 68, 0.7)';
         ctx.beginPath();
         ctx.arc(checkpoint.x, checkpoint.y, 15, 0, Math.PI * 2);
         ctx.fill();
         
         ctx.fillStyle = '#000';
         ctx.beginPath();
         ctx.arc(checkpoint.x, checkpoint.y, 10, 0, Math.PI * 2);
         ctx.fill();
         
         ctx.fillStyle = checkpoint.passed ? '#44ff44' : '#ffff44';
         ctx.font = '12px monospace';
         ctx.textAlign = 'center';
         ctx.fillText(index + 1, checkpoint.x, checkpoint.y + 4);
     });
     
     // Draw start/finish line
     ctx.strokeStyle = '#ffffff';
     ctx.lineWidth = 4;
     ctx.beginPath();
     ctx.moveTo(50, 280);
     ctx.lineTo(110, 280);
     ctx.moveTo(50, 320);
     ctx.lineTo(110, 320);
     ctx.stroke();
     
     // Draw checkered pattern at start/finish
     const checkerSize = 8;
     const checkerRows = 5;
     const checkerCols = 8;
     const startX = 50;
     const startY = 280 + checkerSize;
     
     for (let row = 0; row < checkerRows; row++) {
         for (let col = 0; col < checkerCols; col++) {
             if ((row + col) % 2 === 0) {
                 ctx.fillStyle = '#000000';
             } else {
                 ctx.fillStyle = '#ffffff';
             }
             ctx.fillRect(startX + col * checkerSize, startY + row * checkerSize, checkerSize, checkerSize);
         }
     }
 }

 function drawCar() {
     const style = carStyles[currentCarIndex];
     
     // Draw trail
     if (car.speed > 3) {
         const trailAlpha = Math.min(0.6, car.speed / car.maxSpeed);
         ctx.strokeStyle = style.primary + Math.floor(trailAlpha * 255).toString(16).padStart(2, '0');
         ctx.lineWidth = 3;
         ctx.lineCap = 'round';
         if (car.trail.length > 1) {
             ctx.beginPath();
             ctx.moveTo(car.trail[0].x, car.trail[0].y);
             for (let i = 1; i < car.trail.length; i++) {
                 ctx.lineTo(car.trail[i].x, car.trail[i].y);
             }
             ctx.stroke();
         }
     }
     
     ctx.save();
     ctx.translate(car.x + car.width/2, car.y + car.height/2);
     ctx.rotate(car.angle * Math.PI / 180);
     
     // Draw car using sprite if available
     if (loadedAssets.cars && carImages[style.spriteIndex]) {
         const spriteSize = 16;
         const scale = car.width / spriteSize;
         
         // Apply damage flash effect
         if (car.damageFlash > 0 && car.damageFlash % 2 === 0) {
             ctx.globalAlpha = 0.7;
             ctx.fillStyle = '#ff0000';
             ctx.fillRect(-car.width/2, -car.height/2, car.width, car.height);
             ctx.globalAlpha = 1.0;
         }
         
         // Draw the car sprite
         ctx.drawImage(
             carImages[style.spriteIndex],
             0, 0, spriteSize, spriteSize,
             -car.width/2, -car.height/2, car.width, car.height
         );
         
         // Draw drift effect
         if (car.isDrifting) {
             const driftDirection = car.driftFactor > 0 ? -1 : 1;
             const driftIntensity = Math.abs(car.driftFactor) * 0.8;
             
             // Drift particles
             if (Math.random() < driftIntensity * 0.8) {
                 const offsetX = driftDirection * car.width * 0.3;
                 const offsetY = car.height * 0.3;
                 
                 particles.push(new Particle(
                     car.x + car.width/2 + offsetX,
                     car.y + car.height/2 + offsetY,
                     (Math.random() - 0.5) * 2,
                     (Math.random() - 0.5) * 2,
                     '#cccccc',
                     20,
                     'smoke'
                 ));
             }
         }
     } else {
         // Fallback if sprites not loaded
         // Car body
         ctx.fillStyle = style.primary;
         ctx.fillRect(-car.width/2, -car.height/2, car.width, car.height);
         
         // Car details
         ctx.fillStyle = style.secondary;
         ctx.fillRect(-car.width/2 + 2, -car.height/2 + 1, car.width - 4, 2);
         ctx.fillRect(-car.width/2 + 2, car.height/2 - 3, car.width - 4, 2);
         
         // Windshield
         ctx.fillStyle = '#444444';
         ctx.fillRect(-car.width/2 + 3, -car.height/2 + 3, car.width - 6, 3);
         
         // Apply damage flash effect
         if (car.damageFlash > 0 && car.damageFlash % 2 === 0) {
             ctx.globalAlpha = 0.5;
             ctx.fillStyle = '#ff0000';
             ctx.fillRect(-car.width/2, -car.height/2, car.width, car.height);
             ctx.globalAlpha = 1.0;
         }
     }
     
     ctx.restore();
 }

 function drawParticles() {
     particles.forEach(particle => particle.draw());
 }

 function drawMinimap() {
     // Draw minimap background
     const mapSize = 120;
     const mapX = canvas.width - mapSize - 10;
     const mapY = 10;
     const scale = mapSize / (track.outerRadiusX * 2.2);
     
     ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
     ctx.fillRect(mapX, mapY, mapSize, mapSize);
     ctx.strokeStyle = '#ffffff';
     ctx.strokeRect(mapX, mapY, mapSize, mapSize);
     
     // Draw track on minimap
     ctx.save();
     ctx.translate(mapX + mapSize/2, mapY + mapSize/2);
     ctx.scale(scale, scale);
     ctx.translate(-track.centerX, -track.centerY);
     
     // Outer track
     ctx.beginPath();
     ctx.ellipse(track.centerX, track.centerY, track.outerRadiusX, track.outerRadiusY, 0, 0, 2 * Math.PI);
     ctx.fillStyle = '#555555';
     ctx.fill();
     
     // Inner track
     ctx.beginPath();
     ctx.ellipse(track.centerX, track.centerY, track.innerRadiusX, track.innerRadiusY, 0, 0, 2 * Math.PI);
     ctx.fillStyle = '#000000';
     ctx.fill();
     
     // Draw checkpoints
     track.checkpoints.forEach((checkpoint, index) => {
         ctx.fillStyle = checkpoint.passed ? '#44ff44' : '#ffff44';
         ctx.beginPath();
         ctx.arc(checkpoint.x, checkpoint.y, 10, 0, Math.PI * 2);
         ctx.fill();
     });
     
     // Draw car on minimap
     ctx.translate(car.x + car.width/2, car.y + car.height/2);
     ctx.rotate(car.angle * Math.PI / 180);
     ctx.fillStyle = carStyles[currentCarIndex].primary;
     ctx.fillRect(-10, -6, 20, 12);
     
     ctx.restore();
 }

 function drawUI() {
     // Update HTML UI elements
     document.getElementById('time').textContent = elapsedTime.toFixed(2);
     document.getElementById('lap-count').textContent = lap;
     document.getElementById('speed').textContent = Math.floor(Math.abs(car.speed) * 20);
     
     // Draw car health bar
     const healthBarWidth = 150;
     const healthBarHeight = 15;
     const healthBarX = 10;
     const healthBarY = 10;
     
     // Health bar background
     ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
     ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
     
     // Health bar fill
     const healthPercent = car.health / 100;
     let healthColor;
     
     if (healthPercent > 0.6) {
         healthColor = '#44ff44'; // Green
     } else if (healthPercent > 0.3) {
         healthColor = '#ffff44'; // Yellow
     } else {
         healthColor = '#ff4444'; // Red
     }
     
     ctx.fillStyle = healthColor;
     ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
     
     // Health bar border
     ctx.strokeStyle = '#ffffff';
     ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
     
     // Draw health text
     ctx.fillStyle = '#ffffff';
     ctx.font = '10px monospace';
     ctx.textAlign = 'center';
     ctx.fillText(`HEALTH: ${Math.floor(car.health)}%`, healthBarX + healthBarWidth / 2, healthBarY + healthBarHeight - 3);
     
     // Draw car name
     ctx.fillStyle = carStyles[currentCarIndex].primary;
     ctx.font = '14px monospace';
     ctx.textAlign = 'left';
     ctx.fillText(carStyles[currentCarIndex].name, healthBarX, healthBarY + healthBarHeight + 20);
     
     // Draw drift indicator
     if (car.isDrifting) {
         ctx.fillStyle = '#ff9900';
         ctx.font = '14px monospace';
         ctx.textAlign = 'left';
         ctx.fillText('DRIFT!', healthBarX + 150, healthBarY + healthBarHeight + 20);
     }
     
     // Draw handbrake indicator
     if (car.isHandbraking) {
         ctx.fillStyle = '#ff4444';
         ctx.font = '14px monospace';
         ctx.textAlign = 'left';
         ctx.fillText('HANDBRAKE', healthBarX + 220, healthBarY + healthBarHeight + 20);
     }
     
     // Draw best time on canvas
     if (bestTime) {
         ctx.fillStyle = '#06a50c';
         ctx.font = '14px monospace';
         ctx.textAlign = 'right';
         ctx.fillText(`Best: ${bestTime.toFixed(2)}s`, canvas.width - 10, 25);
     }
     
     // Draw minimap
     drawMinimap();
     
     // Draw controls hint
     if (!gameRunning) {
         ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
         ctx.fillRect(canvas.width / 2 - 150, canvas.height - 60, 300, 50);
         ctx.strokeStyle = '#ffffff';
         ctx.strokeRect(canvas.width / 2 - 150, canvas.height - 60, 300, 50);
         
         ctx.fillStyle = '#ffffff';
         ctx.font = '14px monospace';
         ctx.textAlign = 'center';
         ctx.fillText('PRESS SPACE FOR HANDBRAKE', canvas.width / 2, canvas.height - 35);
         ctx.fillText('DRIFT FOR FASTER TURNS!', canvas.width / 2, canvas.height - 15);
     }
     
     // Draw keybindings
     ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
     ctx.fillRect(canvas.width / 2 - 250, canvas.height - 60, 500, 50);
     ctx.strokeStyle = '#ffffff';
     ctx.strokeRect(canvas.width / 2 - 250, canvas.height - 60, 500, 50);
     
     ctx.fillStyle = '#ffffff';
     ctx.font = '14px monospace';
     ctx.textAlign = 'center';
     ctx.fillText('ENTER: Start Race | R: Reset | C: Change Car', canvas.width / 2, canvas.height - 25);
 }

 function gameLoop() {
     if (gameRunning) {
         elapsedTime = (performance.now() - startTime) / 1000;
     }
     
     update();
     
     ctx.clearRect(0, 0, canvas.width, canvas.height);
     drawTrack();
     drawParticles();
     drawCar();
     drawUI();
     
     if (gameRunning) {
         requestAnimationFrame(gameLoop);
     } else {
         // Draw "Press Start" message when not running
         ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
         ctx.fillRect(canvas.width / 2 - 170, canvas.height / 2 - 40, 340, 80);
         ctx.strokeStyle = '#06a50c';
         ctx.lineWidth = 2;
         ctx.strokeRect(canvas.width / 2 - 170, canvas.height / 2 - 40, 340, 80);
         
         ctx.fillStyle = '#06a50c';
         ctx.font = '24px monospace';
         ctx.textAlign = 'center';
         ctx.fillText('PRESS ENTER ↵ TO RACE!', canvas.width / 2, canvas.height / 2);
         ctx.font = '14px monospace';
         ctx.fillText('Use WASD or Arrow Keys to drive', canvas.width / 2, canvas.height / 2 + 25);
     }
 }

 // Start the initial render
 gameLoop();
