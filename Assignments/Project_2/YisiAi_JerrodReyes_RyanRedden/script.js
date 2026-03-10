/* =========================
TERMINAL TYPING EFFECT
========================= */

const msg = "Connecting to Shadow Market encrypted node...";
let i = 0;

function typeText(){

const el = document.getElementById("terminal");
if(!el) return;

if(i < msg.length){

el.innerHTML += msg.charAt(i);
i++;

setTimeout(typeText,40);

}

}


/* =========================
PAGE LOAD INITIALIZATION
========================= */

window.addEventListener("load",()=>{

typeText();
updateBalance();
loadTransactions();
showBalance();

})


/* =========================
MARKET FEED (Homepage)
========================= */

const logs=[

"new seller joined network",
"identity pack purchased",
"dataset uploaded",
"price spike detected",
"government scan detected",
"encrypted trade completed"

]

setInterval(()=>{

const el=document.getElementById("feed")

if(el){

let r=Math.floor(Math.random()*logs.length)

el.innerHTML="> "+logs[r]

}

},3000)


/* =========================
MARKETPLACE LIVE FEED
========================= */

const trades=[

"ghost_logistics sold CARBINE",
"uncle_zero shipped Whiteout",
"DataGhost listed identity kit",
"encrypted trade completed",
"buyer from Sector 9 purchased item"

]

setInterval(()=>{

let el=document.getElementById("market-feed")

if(el){

let r=Math.floor(Math.random()*trades.length)

let price=Math.floor(Math.random()*900000+10000)

el.innerText="> "+trades[r]+" | "+price.toLocaleString()+" CR"

}

},2500)


/* =========================
KEYBOARD SHORTCUTS
========================= */

document.addEventListener("keydown",(e)=>{

if(e.key==="Escape"){
location.href="index.html"
}

if(e.key==="m"){
location.href="marketplace.html"
}

if(e.key==="w"){
location.href="wallet.html"
}

})


/* =========================
DYNAMIC PRICE SYSTEM
========================= */

const prices=document.querySelectorAll(".dynamic-price")

prices.forEach(p=>{

let base=parseInt(p.dataset.base)

setInterval(()=>{

let change=(Math.random()-0.5)*50000

let price=Math.floor(base+change)

p.innerText=price.toLocaleString()+" CR"

},4000)

})


/* =========================
TERMINAL COMMAND SYSTEM
========================= */

const cmd=document.getElementById("cmd")

if(cmd){

cmd.addEventListener("keydown",(e)=>{

if(e.key==="Enter"){

let v=cmd.value

if(v==="market") location.href="marketplace.html"
if(v==="login") location.href="login.html"
if(v==="wallet") location.href="wallet.html"
if(v==="home") location.href="index.html"
if(v==="trace") triggerTrace()

cmd.value=""

}

})

}


/* =========================
NETWORK MAP (Nearby Buyers)
========================= */

const canvas=document.getElementById("network")

if(canvas){

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
HACK ALERT
========================= */

setTimeout(()=>{

const alert=document.getElementById("alert")

if(alert){

alert.style.display="block"

}

},20000)


/* =========================
WALLET SYSTEM
========================= */

if(!localStorage.getItem("credits")){
localStorage.setItem("credits",2500000)
}

if(!localStorage.getItem("transactions")){
localStorage.setItem("transactions","[]")
}


/* BALANCE UPDATE */

function updateBalance(){

let credits=localStorage.getItem("credits")

let el1=document.getElementById("balance")
let el2=document.getElementById("balance-display")

if(el1) el1.innerText=credits+" CR"
if(el2) el2.innerText=credits+" CR"

}


/* PURCHASE FUNCTION */

function buyItem(name,price){

let credits=parseInt(localStorage.getItem("credits"))

if(credits<price){

alert("Insufficient Credits")
return

}

credits-=price

localStorage.setItem("credits",credits)

let tx=JSON.parse(localStorage.getItem("transactions"))

tx.unshift(name+" -"+price+" CR")

localStorage.setItem("transactions",JSON.stringify(tx))

updateBalance()

let hash="0x"+Math.random().toString(16).substring(2,10).toUpperCase()

let confirm=document.getElementById("tx-confirm")

if(confirm){

confirm.innerHTML=
"PURCHASE SUCCESSFUL<br>TRANSACTION HASH: "+hash

}

}


/* LOAD WALLET HISTORY */

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


/* CATEGORY LIVE COUNTS */

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


/* WALLET ID */

if(!localStorage.getItem("walletID")){

let id="WALLET-"+Math.floor(Math.random()*900000+100000)

localStorage.setItem("walletID",id)

}

let walletID=document.getElementById("wallet-id")

if(walletID){

walletID.innerText=localStorage.getItem("walletID")

}


/* SEND CREDITS */

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


/* TEST DEPOSIT */

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


/* PRODUCT PAGE BALANCE */

function showBalance(){

let credits=localStorage.getItem("credits")

let el=document.getElementById("balance-display")

if(el){

el.innerText=credits+" CR"

}

}