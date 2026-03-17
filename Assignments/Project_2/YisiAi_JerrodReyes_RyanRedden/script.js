/* =========================
TERMINAL TYPING EFFECT
========================= */

const msg="Connecting to Shadow Market encrypted node..."
let i=0

function typeText(){

const el=document.getElementById("terminal")
if(!el) return

if(i<msg.length){

el.innerHTML+=msg.charAt(i)
i++

setTimeout(typeText,40)

}

}


/* =========================
SYSTEM INITIALIZATION
========================= */

window.addEventListener("load",()=>{

initStorage()
initTrader()
updateBalance()
loadTransactions()

typeText()

initNetwork()
initNeuralMap()

initMarketFeed()
initHomeFeed()
initCategoryCounts()

initNeuralWave()
initNeuralSync()

})


/* =========================
LOCAL STORAGE SETUP
========================= */

function initStorage(){

if(!localStorage.getItem("credits")){
localStorage.setItem("credits",2500000)
}

if(!localStorage.getItem("transactions")){
localStorage.setItem("transactions","[]")
}

if(!localStorage.getItem("walletID")){

let id="WALLET-"+Math.floor(Math.random()*900000+100000)
localStorage.setItem("walletID",id)

}

}


/* =========================
TRADER ID SYSTEM
========================= */

function initTrader(){

if(!localStorage.getItem("traderID")){

let id="NODE-"+Math.floor(Math.random()*9000+1000)
localStorage.setItem("traderID",id)

}

let trader=document.getElementById("trader-id")
if(trader) trader.innerText=localStorage.getItem("traderID")

let wallet=document.getElementById("wallet-id")
if(wallet) wallet.innerText=localStorage.getItem("walletID")

}


/* =========================
HOME TERMINAL FEED
========================= */

function initHomeFeed(){

const logs=[
"new seller joined network",
"identity pack purchased",
"dataset uploaded",
"price spike detected",
"government scan detected",
"encrypted trade completed"
]

const feed=document.getElementById("feed")
if(!feed) return

setInterval(()=>{

let r=Math.floor(Math.random()*logs.length)

feed.innerHTML="> "+logs[r]

},3000)

}


/* =========================
MARKETPLACE LIVE FEED
========================= */

function initMarketFeed(){

const trades=[
"ghost_logistics sold CARBINE",
"uncle_zero shipped Whiteout",
"DataGhost listed identity kit",
"encrypted trade completed",
"buyer from Sector 9 purchased item"
]

const marketFeed=document.getElementById("market-feed")
if(!marketFeed) return

setInterval(()=>{

let r=Math.floor(Math.random()*trades.length)
let price=Math.floor(Math.random()*2000000+10000)

marketFeed.innerText="> "+trades[r]+" | "+price.toLocaleString()+" CR"

},2500)

}


/* =========================
KEYBOARD SHORTCUTS
========================= */

document.addEventListener("keydown",(e)=>{

if(window.self!==window.top) return

if(e.key==="Escape") location.href="index.html"
if(e.key==="m") location.href="marketplace.html"
if(e.key==="w") location.href="wallet.html"

})


/* =========================
CATEGORY COUNTS
========================= */

function initCategoryCounts(){

const categories=document.querySelectorAll(".cat")

categories.forEach(cat=>{

let base=parseInt(cat.dataset.base)

setInterval(()=>{

let change=Math.floor((Math.random()-0.5)*4)
let value=base+change

if(value<0) value=0

let name=cat.innerText.split("(")[0].trim()
cat.innerText=name+" ("+value+")"

},4000)

})

}


/* =========================
NETWORK MAP (Marketplace)
========================= */

function initNetwork(){

const canvas=document.getElementById("network")
if(!canvas) return

const ctx=canvas.getContext("2d")

canvas.width=canvas.clientWidth
canvas.height=canvas.clientHeight

let nodes=[]

for(let i=0;i<12;i++){

nodes.push({

x:Math.random()*canvas.width,
y:Math.random()*canvas.height,
vx:(Math.random()-0.5)*0.4,
vy:(Math.random()-0.5)*0.4

})

}

function draw(){

ctx.clearRect(0,0,canvas.width,canvas.height)

nodes.forEach(n=>{

n.x+=n.vx
n.y+=n.vy

if(n.x<0||n.x>canvas.width) n.vx*=-1
if(n.y<0||n.y>canvas.height) n.vy*=-1

ctx.fillStyle="#00ffd5"

ctx.beginPath()
ctx.arc(n.x,n.y,3,0,Math.PI*2)
ctx.fill()

})

nodes.forEach(a=>{

nodes.forEach(b=>{

let dx=a.x-b.x
let dy=a.y-b.y

let dist=Math.sqrt(dx*dx+dy*dy)

if(dist<70){

ctx.strokeStyle="rgba(0,255,200,.15)"

ctx.beginPath()
ctx.moveTo(a.x,a.y)
ctx.lineTo(b.x,b.y)
ctx.stroke()

}

})

})

requestAnimationFrame(draw)

}

draw()

}


/* =========================
NEURAL BROADCAST MAP
========================= */

function initNeuralMap(){

const canvas=document.getElementById("neural-map")
if(!canvas) return

const ctx=canvas.getContext("2d")

canvas.width=canvas.clientWidth
canvas.height=canvas.clientHeight

let nodes=[]

for(let i=0;i<10;i++){

nodes.push({

x:Math.random()*canvas.width,
y:Math.random()*canvas.height,
vx:(Math.random()-0.5)*0.6,
vy:(Math.random()-0.5)*0.6

})

}

function draw(){

ctx.clearRect(0,0,canvas.width,canvas.height)

nodes.forEach(n=>{

n.x+=n.vx
n.y+=n.vy

if(n.x<0||n.x>canvas.width) n.vx*=-1
if(n.y<0||n.y>canvas.height) n.vy*=-1

ctx.fillStyle="#00ffd5"

ctx.beginPath()
ctx.arc(n.x,n.y,4,0,Math.PI*2)
ctx.fill()

})

nodes.forEach(a=>{

nodes.forEach(b=>{

let dx=a.x-b.x
let dy=a.y-b.y

let dist=Math.sqrt(dx*dx+dy*dy)

if(dist<80){

ctx.strokeStyle="rgba(0,255,200,.2)"

ctx.beginPath()
ctx.moveTo(a.x,a.y)
ctx.lineTo(b.x,b.y)
ctx.stroke()

}

})

})

requestAnimationFrame(draw)

}

draw()

}


/* =========================
TRACE ALERT
========================= */

function triggerTrace(){

let feed=document.getElementById("market-feed")
if(!feed) return

feed.innerText="> WARNING: GOVERNMENT TRACE DETECTED"
feed.style.color="#ff4040"

setTimeout(()=>{

feed.innerText="> rerouting traffic..."
feed.style.color="#00ffd5"

},2000)

}


/* =========================
BALANCE SYSTEM
========================= */

function updateBalance(){

let credits=localStorage.getItem("credits")

let el1=document.getElementById("balance")
let el2=document.getElementById("balance-display")

if(el1) el1.innerText=credits+" CR"
if(el2) el2.innerText=credits+" CR"

}


/* =========================
PURCHASE SYSTEM
========================= */

function buyItem(name,price){

let credits=parseInt(localStorage.getItem("credits"))

if(credits<price){

alert("Insufficient Credits")
return

}

credits-=price
localStorage.setItem("credits",credits)

let tx=JSON.parse(localStorage.getItem("transactions"))
tx.unshift("Purchased "+name+" - "+price+" CR")

localStorage.setItem("transactions",JSON.stringify(tx))

updateBalance()

let hash="0x"+Math.random().toString(16).substring(2,10).toUpperCase()

let confirm=document.getElementById("tx-confirm")

if(confirm){

confirm.innerHTML=
"PURCHASE SUCCESSFUL<br>TRANSACTION HASH: "+hash

}

}


/* =========================
TRANSACTION HISTORY
========================= */

function loadTransactions(){

let el=document.getElementById("transactions")
if(!el) return

el.innerHTML=""

let tx=JSON.parse(localStorage.getItem("transactions"))

tx.slice(0,10).forEach(t=>{

let p=document.createElement("p")
p.innerText=t
el.appendChild(p)

})

}


/* =========================
TRANSFER CREDITS
========================= */

function sendCredits(){

let amount=parseInt(document.getElementById("amount").value)
let receiver=document.getElementById("receiver").value

let credits=parseInt(localStorage.getItem("credits"))

if(!amount||amount<=0){

alert("Invalid amount")
return

}

if(amount>credits){

alert("Insufficient credits")
return

}

credits-=amount
localStorage.setItem("credits",credits)

let tx=JSON.parse(localStorage.getItem("transactions"))
tx.unshift("Sent "+amount+" CR to "+receiver)

localStorage.setItem("transactions",JSON.stringify(tx))

updateBalance()
loadTransactions()

}


/* =========================
TEST DEPOSIT
========================= */

function deposit(){

let credits=parseInt(localStorage.getItem("credits"))

credits+=100000

localStorage.setItem("credits",credits)

let tx=JSON.parse(localStorage.getItem("transactions"))
tx.unshift("Deposit +100000 CR")

localStorage.setItem("transactions",JSON.stringify(tx))

updateBalance()
loadTransactions()

}


/* =========================
NEURAL STREAM
========================= */

function tapStream(){

const states=[
"Adrenaline spike detected",
"Fear response detected",
"Memory fragment intercepted",
"Spatial vertigo signal",
"Limbic synchronization active",
"Foreign sensory echo detected"
]

let r=Math.floor(Math.random()*states.length)

let el=document.getElementById("neural-status")

if(el){
el.innerText="> "+states[r]
}

}


/* =========================
NEURAL LOGIN
========================= */

function neuralLogin(){

let el=document.getElementById("login-status")
if(!el) return

el.innerText="> scanning neural signature..."

setTimeout(()=>{
el.innerText="> identity verified — access granted"
},2000)

setTimeout(()=>{
location.href="marketplace.html"
},3000)

}


/* =========================
NEURAL SYNC LEVEL
========================= */

function initNeuralSync(){

setInterval(()=>{

let sync=document.getElementById("sync-level")

if(sync){

let value=Math.floor(Math.random()*20+70)

sync.innerText=value+"%"

}

},3000)

}


/* =========================
NEURAL WAVE VISUALIZER
========================= */

function initNeuralWave(){

const canvas=document.getElementById("neural-wave")
if(!canvas) return

const ctx=canvas.getContext("2d")

canvas.width=canvas.clientWidth
canvas.height=canvas.clientHeight

let t=0

function draw(){

ctx.clearRect(0,0,canvas.width,canvas.height)

ctx.beginPath()

ctx.strokeStyle="#00ffd5"
ctx.lineWidth=2

for(let x=0;x<canvas.width;x++){

let y=canvas.height/2 +
Math.sin((x+t)*0.03)*20 +
Math.sin((x+t)*0.01)*40

if(x===0){
ctx.moveTo(x,y)
}else{
ctx.lineTo(x,y)
}

}

ctx.stroke()

t+=2

requestAnimationFrame(draw)

}

draw()

}