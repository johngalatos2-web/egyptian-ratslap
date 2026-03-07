const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CARD_W = 100;
const CARD_H = 145;

// Card data
const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const suits = ["S","H","D","C"];
const rankValues = Object.fromEntries(ranks.map((r,i)=>[r,i]));
const rankNums = {A:"01","2":"02","3":"03","4":"04","5":"05","6":"06","7":"07","8":"08","9":"09","10":"10",J:"11",Q:"12",K:"13"};
const suitAbbrev = {S:"s",H:"h",D:"d",C:"c"};

let cardImages = {};
let back;

function loadImages(){
  ranks.forEach(r=>{
    suits.forEach(s=>{
      let img = new Image();
      img.src = `cards/${suitAbbrev[s]}${rankNums[r]}.png`;
      cardImages[r+s] = img;
    });
  });
  back = new Image();
  back.src = "cards/Card-Back-01.png";
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

// Slap detection functions
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
  let last3 = [getRank(p[p.length-3]), getRank(p[p.length-2]), getRank(p[p.length-1])];
  let [a,b,c] = last3.map(r => rankValues[r]);
  
  // Standard consecutive
  if((a+1===b && b+1===c) || (a-1===b && b-1===c)) return true;
  
  // Wrap-around (K-A-2 or 2-A-K)
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

// Game state
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

// Animations
let cardAnimation = null;
let burnAnimation = null;
let collectionAnimation = null;
let collectionTimer = 0;
let collectionPlayer = null;

// Slap handling
let slapQueue = [];

function playCard(player){
  if(cardAnimation || burnAnimation || collectionAnimation) return;
  if(turn !== player) return;
  
  let cards = player === 0 ? p1 : p2;
  if(cards.length === 0) return;
  
  let card = cards.shift();
  cardAnimation = {
    card: card,
    player: player,
    progress: 0,
    duration: 300,
    isFace: isFace(card),
    challengeCount: faceChances(card)
  };
}

function slap(player){
  if(cardAnimation || burnAnimation || collectionAnimation) return;
  
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
    // False slap - burn a card
    let cards = player === 0 ? p1 : p2;
    if(cards.length > 0){
      let card = cards.shift();
      pile.unshift(card);
      burnAnimation = {
        progress: 0,
        duration: 300,
        player: player
      };
    }
  }
}

function completeCardPlay(card, player){
  pile.push(card);
  
  if(cardAnimation.isFace){
    challenge = cardAnimation.challengeCount;
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
      // Challenged player keeps their turn
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

function drawPile(){
  let visible = pile.slice(-6);
  
  visible.forEach((card, i)=>{
    let cardIndex = pile.length - visible.length + i;
    let rot = ((cardIndex * 17) % 20 - 10) * (Math.PI/180);
    let offsetX = ((cardIndex * 7) % 10 - 5);
    let offsetY = ((cardIndex * 11) % 6 - 3);
    
    ctx.save();
    ctx.translate(500 + offsetX, 300 - i*2 + offsetY);
    ctx.rotate(rot);
    ctx.drawImage(cardImages[card], -CARD_W/2, -CARD_H/2, CARD_W, CARD_H);
    ctx.restore();
  });
}

function drawAnimatedCard(){
  if(!cardAnimation) return;
  
  let progress = cardAnimation.progress / cardAnimation.duration;
  let player = cardAnimation.player;
  let startX = player === 0 ? 200 : 800;
  let startY = player === 0 ? 572 : 122;
  let endX = 500;
  let endY = 300;
  
  let x = startX + (endX - startX) * progress;
  let y = startY + (endY - startY) * progress;
  
  ctx.drawImage(cardImages[cardAnimation.card], x, y, CARD_W, CARD_H);
}

function drawBurnAnimation(){
  if(!burnAnimation) return;
  
  let progress = burnAnimation.progress / burnAnimation.duration;
  let alpha = Math.floor(255 * (1 - progress));
  let scale = 1 - progress * 0.5;
  
  if(scale > 0){
    let scaledW = CARD_W * scale;
    let scaledH = CARD_H * scale;
    let offsetX = (CARD_W - scaledW) / 2;
    let offsetY = (CARD_H - scaledH) / 2;
    
    ctx.globalAlpha = alpha / 255;
    ctx.drawImage(back, 500 - scaledW/2, 300 - scaledH/2, scaledW, scaledH);
    ctx.globalAlpha = 1;
  }
}

function drawCollectionAnimation(){
  if(!collectionAnimation) return;
  
  let progress = collectionAnimation.progress / collectionAnimation.duration;
  let player = collectionAnimation.player;
  let endX = player === 0 ? 200 : 800;
  let endY = player === 0 ? 572 : 122;
  
  let visibleCards = pile.slice(-5);
  visibleCards.forEach((card, i)=>{
    let cardProgress = Math.min(1, progress + (i * 0.1));
    let x = 500 + (endX - 500) * cardProgress;
    let y = 300 + (endY - 300) * cardProgress;
    ctx.drawImage(cardImages[card], x, y, CARD_W, CARD_H);
  });
}

function draw(){
  ctx.fillStyle = "#1e7a3f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
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
  ctx.font = "22px Arial";
  ctx.fillText(message, 400, 680);
  
  if(slapCondition && collectionAnimation){
    ctx.fillStyle = "#FFD700";
    ctx.font = "22px Arial";
    ctx.fillText(slapCondition, 380, 580);
    
    if(slapper !== null){
      ctx.fillStyle = "#FF6464";
      ctx.fillText("Player " + (slapper + 1) + " slapped!", 380, 545);
    }
  }
}

function update(dt){
  // Card animation
  if(cardAnimation){
    cardAnimation.progress += dt;
    if(cardAnimation.progress >= cardAnimation.duration){
      completeCardPlay(cardAnimation.card, cardAnimation.player);
      cardAnimation = null;
    }
  }
  
  // Burn animation
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
  
  // Collection delay
  if(collectionTimer > 0){
    collectionTimer -= dt;
    if(collectionTimer <= 0){
      collectionAnimation = {
        player: collectionPlayer,
        progress: 0,
        duration: 500,
        cards: pile.slice()
      };
      collectionTimer = 0;
      collectionPlayer = null;
    }
  }
  
  // Collection animation
  if(collectionAnimation){
    collectionAnimation.progress += dt;
    if(collectionAnimation.progress >= collectionAnimation.duration){
      collect(collectionAnimation.player);
      collectionAnimation = null;
      slapCondition = null;
      slapper = null;
    }
  }
  
  // Win condition
  if(p1.length === 0 && pile.length === 0){
    message = "PLAYER 2 WINS!";
  }
  if(p2.length === 0 && pile.length === 0){
    message = "PLAYER 1 WINS!";
  }
}

let last = 0;
function loop(time){
  let dt = time - last;
  last = time;
  
  draw();
  update(dt);
  
  requestAnimationFrame(loop);
}

loadImages();
requestAnimationFrame(loop);
