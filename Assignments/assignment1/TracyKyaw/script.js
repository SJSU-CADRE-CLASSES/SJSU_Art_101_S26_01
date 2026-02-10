const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particleCount = 80;
const bodyClass = document.body.className;

// Adjust particles per page mood
if(bodyClass==='day3') particleCount = 50;
if(bodyClass==='day2') particleCount = 70;
if(bodyClass==='day1') particleCount = 80;
if(bodyClass==='night') particleCount = 100;
if(bodyClass==='after') particleCount = 40;

let particles = [];

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 3 + 1;
    this.speedX = (Math.random()-0.5)*0.5;
    this.speedY = (Math.random()-0.5)*0.5;
    this.opacity = Math.random() * 0.5 + 0.3;
    this.color = bodyClass==='day3' ? 'rgba(255,200,100,'+this.opacity+')' :
                 bodyClass==='day2' ? 'rgba(255,180,180,'+this.opacity+')' :
                 bodyClass==='day1' ? 'rgba(255,255,255,'+this.opacity+')' :
                 bodyClass==='night' ? 'rgba(255,255,255,'+this.opacity+')' :
                 'rgba(180,200,255,'+this.opacity+')';
  }
  update() { this.x+=this.speedX; this.y+=this.speedY;
    if(this.x<0||this.x>canvas.width||this.y<0||this.y>canvas.height) this.reset();
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.size,0,Math.PI*2);
    ctx.fillStyle=this.color;
    ctx.fill();
  }
}

for(let i=0;i<particleCount;i++) particles.push(new Particle());

function animate() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  particles.forEach(p=>{p.update();p.draw();});
  requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize',()=>{
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});
