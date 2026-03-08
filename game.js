console.log("Script loading...");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

console.log("Canvas found:", !!canvas);
console.log("Context found:", !!ctx);

const CARD_W = 100;
const CARD_H = 145;

const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const suits = ["S","H","D","C"];
const rankValues = Object.fromEntries(ranks.map((r,i)=>[r,i]));
const rankNums = {A:"01","2":"02","3":"03","4":"04","5":"05","6":"06","7":"07","8":"08","9":"09","10":"10",J:"11",Q:"12",K:"13"};
const suitAbbrev = {S:"s",H:"h",D:"d",C:"c"};

let cardImages = {};
let back = null;
let imagesReady = false;

function loadImages(){
  console.log("Loading card images from cards/ folder");
  let loaded = 0;
  let total = ranks.length * suits.length + 1;
  
  function checkReady(){
    loaded++;
    if(loaded === total){
      console.log("All images loaded!");
      imagesReady = true;
    }
  }
  
  ranks.forEach(r=>{
    suits.forEach(s=>{
      let img = new Image();
      img.onload = checkReady;
      img.onerror = () => { console.error(`Failed to load ${r}${s}`); checkReady(); };
      img.src = `cards/${suitAbbrev[s]}${rankNums[r]}.png`;
      cardImages[r+s] = img;
    });
  });
  back = new Image();
  back.onload = checkReady;
  back.onerror = () => { console.error("Failed to load card back"); checkReady(); };
  back.src = "cards/Card-Back-01.png";
  console.log("Card images loading initiated");
}

function shuffle(arr){
  for(let i=arr.length-1; i>0; i--){
    let j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function buildDeck(){
  let deck = [];
  ranks.forEach(r => suits.forEach(s => deck.push(r+s)));
  shuffle(deck);
  return deck;
}

function getRank(card){
  return card.startsWith("10") ? "10" : card[0];
}

function isFace(card){
  return ["J","Q","K","A"].includes(getRank(card));
}

function faceChances(card){
  return {J:1, Q:2, K:3, A:4}[getRank(card)] || 0;
}

function pair(p){
  return p.length >= 2 && getRank(p[p.length-1]) === getRank(p[p.length-2]);
}

function sandwich(p){
  return p.length >= 3 && getRank(p[p.length-1]) === getRank(p[p.length-3]);
}

function marriage(p){
  if(p.length < 2) return false;
  let r1 = getRank(p[p.length-1]);
  let r2 = getRank(p[p.length-2]);
  return (r1==="K" && r2==="Q") || (r1==="Q" && r2==="K");
}

function divorce(p){
  if(p.length < 3) return false;
  let r1 = getRank(p[p.length-3]);
  let r2 = getRank(p[p.length-1]);
  return ["K","Q"].includes(r1) && ["K","Q"].includes(r2);
}

function jackTen(p){
  if(p.length < 2) return false;
  let r1 = getRank(p[p.length-1]);
  let r2 = getRank(p[p.length-2]);
  return (r1==="J" && r2==="10") || (r1==="10" && r2==="J");
}

function sixSeven(p){
  return p.length >= 2 && getRank(p[p.length-2]) === "6" && getRank(p[p.length-1]) === "7";
}

function run(p){
  if(p.length < 3) return false;
  let [a,b,c] = [getRank(p[p.length-3]), getRank(p[p.length-2]), getRank(p[p.length-1])].map(r => rankValues[r]);
  if((a+1===b && b+1===c) || (a-1===b && b-1===c)) return true;
  if(a===12 && b===0 && c===1) return true;
  if(a===1 && b===0 && c===12) return true;
  return false;
}

function validSlap(p){
  if(pair(p)) return "Pair";
  if(sandwich(p)) return "Sandwich";
  if(marriage(p)) return "Marriage";
  if(divorce(p)) return "Divorce";
  if(jackTen(p)) return "Jack-Ten";
  if(sixSeven(p)) return "Six-Seven";
  if(run(p)) return "Run";
  return null;
}

let deck = buildDeck();
let p1 = deck.slice(0, 26);
let p2 = deck.slice(26);
let pile = [];

let turn = 0;
let challenge = 0;
let challenger = null;

let message = "";
let slapCondition = null;
let slapper = null;

let cardAnimation = null;
let burnAnimation = null;
let collectionAnimation = null;
let collectionTimer = 0;
let collectionPlayer = null;

function playCard(player){
  if(cardAnimation || burnAnimation || collectionAnimation || collectionTimer > 0) return;
  if(turn !== player) return;
  
  let cards = player === 0 ? p1 : p2;
  if(cards.length === 0) return;
  
  let card = cards.shift();
  cardAnimation = { card, player, progress: 0, duration: 300 };
}

function slap(player){
  if(cardAnimation || burnAnimation || collectionAnimation || collectionTimer > 0) return;
  
  let result = validSlap(pile);
  if(result){
    slapCondition = result;
    slapper = player;
    collectionTimer = 500;
    collectionPlayer = player;
    challenge = 0;
    challenger = null;
  }
  else{
    let cards = player === 0 ? p1 : p2;
    if(cards.length > 0){
      let card = cards.shift();
      pile.unshift(card);
      burnAnimation = { progress: 0, duration: 300, player };
    }
  }
}

function completeCardPlay(card, player){
  pile.push(card);
  
  if(isFace(card)){
    challenge = faceChances(card);
    challenger = player;
    turn = 1 - player;
  }
  else{
    if(challenge > 0 && player === (1 - challenger)){
      challenge--;
      if(challenge === 0){
        collectionTimer = 500;
        collectionPlayer = challenger;
      }
      else{
        turn = player;
      }
    }
    else{
      turn = 1 - player;
    }
  }
}

function collect(player){
  if(player === 0) p1.push(...pile);
  else p2.push(...pile);
  pile = [];
  turn = player;
}

document.addEventListener("keydown", e=>{
  if(e.key === "a") playCard(0);
  if(e.key === "l") playCard(1);
  if(e.code === "ShiftLeft") slap(0);
  if(e.code === "ShiftRight") slap(1);
});

function getCardOffset(card, index){
  let seed = 0;
  for(let i=0; i<card.length; i++) seed += card.charCodeAt(i);
  seed = (seed * 7 + index * 11) % 100;
  
  return {
    offsetX: (seed % 10) - 5,
    offsetY: ((seed * 13) % 6) - 3,
    rot: ((seed * 17) % 20 - 10) * (Math.PI/180)
  };
}

function drawPile(){
  if(!imagesReady) return;
  let visible = pile.slice(-6);
  visible.forEach((card, i)=>{
    if(!cardImages[card]) return;
    let offset = getCardOffset(card, pile.length - i);
    ctx.save();
    ctx.translate(500 + offset.offsetX, 300 - i*2 + offset.offsetY);
    ctx.rotate(offset.rot);
    ctx.drawImage(cardImages[card], -CARD_W/2, -CARD_H/2, CARD_W, CARD_H);
    ctx.restore();
  });
}

function drawAnimatedCard(){
  if(!cardAnimation || !imagesReady) return;
  if(!cardImages[cardAnimation.card]) return;
  let progress = cardAnimation.progress / cardAnimation.duration;
  let sx = cardAnimation.player === 0 ? 200 : 800;
  let sy = cardAnimation.player === 0 ? 572 : 122;
  let x = sx + (500 - sx) * progress;
  let y = sy + (300 - sy) * progress;
  ctx.drawImage(cardImages[cardAnimation.card], x, y, CARD_W, CARD_H);
}

function drawBurnAnimation(){
  if(!burnAnimation || !imagesReady || !back) return;
  let progress = burnAnimation.progress / burnAnimation.duration;
  let scale = 1 - progress * 0.5;
  if(scale > 0){
    ctx.globalAlpha = 1 - progress;
    ctx.drawImage(back, 500 - (CARD_W*scale)/2, 300 - (CARD_H*scale)/2, CARD_W*scale, CARD_H*scale);
    ctx.globalAlpha = 1;
  }
}

function drawCollectionAnimation(){
  if(!collectionAnimation || !imagesReady) return;
  let progress = collectionAnimation.progress / collectionAnimation.duration;
  let endX = collectionAnimation.player === 0 ? 200 : 800;
  let endY = collectionAnimation.player === 0 ? 572 : 122;
  pile.slice(-5).forEach((card, i)=>{
    if(!cardImages[card]) return;
    let p = Math.min(1, progress + (i * 0.1));
    let x = 500 + (endX - 500) * p;
    let y = 300 + (endY - 300) * p;
    ctx.drawImage(cardImages[card], x, y, CARD_W, CARD_H);
  });
}

function draw(){
  ctx.fillStyle = "#1e7a3f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  if(!imagesReady){
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Loading card images...", 350, 350);
    return;
  }
  
  ctx.drawImage(back, 150, 500, CARD_W, CARD_H);
  ctx.drawImage(back, 750, 50, CARD_W, CARD_H);
  
  ctx.fillStyle = "white";
  ctx.font = "22px Arial";
  ctx.fillText("P1 cards: " + p1.length, 130, 660);
  ctx.fillText("P2 cards: " + p2.length, 730, 40);
  
  ctx.fillStyle = "yellow";
  ctx.fillText("Turn: Player " + (turn + 1), 430, 40);
  
  drawPile();
  drawAnimatedCard();
  drawBurnAnimation();
  drawCollectionAnimation();
  
  ctx.fillStyle = "white";
  ctx.fillText(message, 380, 680);
  
  if(slapCondition && collectionAnimation){
    ctx.fillStyle = "#FFD700";
    ctx.fillText(slapCondition, 380, 580);
    if(slapper !== null){
      ctx.fillStyle = "#FF6464";
      ctx.fillText("Player " + (slapper + 1) + " slapped!", 380, 545);
    }
  }
}

function update(dt){
  if(cardAnimation){
    cardAnimation.progress += dt;
    if(cardAnimation.progress >= cardAnimation.duration){
      completeCardPlay(cardAnimation.card, cardAnimation.player);
      cardAnimation = null;
    }
  }
  
  if(burnAnimation){
    burnAnimation.progress += dt;
    if(burnAnimation.progress >= burnAnimation.duration){
      let player = burnAnimation.player;
      burnAnimation = null;
      if(challenge > 0 && player === (1 - challenger)){
        turn = player;
      }
      else{
        turn = 1 - player;
      }
    }
  }
  
  if(collectionTimer > 0){
    collectionTimer -= dt;
    if(collectionTimer <= 0){
      collectionAnimation = { player: collectionPlayer, progress: 0, duration: 500, cards: pile.slice() };
      collectionTimer = 0;
      collectionPlayer = null;
    }
  }
  
  if(collectionAnimation){
    collectionAnimation.progress += dt;
    if(collectionAnimation.progress >= collectionAnimation.duration){
      collect(collectionAnimation.player);
      collectionAnimation = null;
      slapCondition = null;
      slapper = null;
    }
  }
  
  if(p1.length === 0 && pile.length === 0) message = "PLAYER 2 WINS!";
  if(p2.length === 0 && pile.length === 0) message = "PLAYER 1 WINS!";
}

let frameCount = 0;
let last = 0;
function loop(time){
  frameCount++;
  if(frameCount % 60 === 0) console.log("Frame", frameCount, "- P1:", p1.length, "P2:", p2.length);
  
  let dt = time - last;
  last = time;
  draw();
  update(dt);
  requestAnimationFrame(loop);
}

console.log("Initializing game...");
loadImages();
console.log("Starting animation loop...");
requestAnimationFrame(loop);
console.log("Game started!");