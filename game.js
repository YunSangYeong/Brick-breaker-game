'use strict';
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const $=s=>document.querySelector(s),W=900,H=540,colors=['#92665e','#9a7561','#9a8667','#7d886e','#6c8586'];
let best=0;try{best=Number(localStorage.getItem('brick-best'))||0}catch{}
let score=0,stage=1,lives=3,mode='ready',bricks=[],particles=[],effects={wide:0,slow:0,shield:0},keys={},sound=true,audio,paddle={x:390,y:488,w:120,h:12},ball={x:450,y:477,r:7,vx:3,vy:-5},last=0;
function hud(){$('#score').textContent=String(score).padStart(6,'0');$('#best').textContent=String(best).padStart(6,'0');$('#stage').textContent=String(stage).padStart(2,'0');$('#lives').textContent='♥ '.repeat(lives).trim();$('#status').textContent=mode==='playing'?'KEEP THE BALL ALIVE':mode==='paused'?'PAUSED':mode==='serve'?'PRESS SPACE TO LAUNCH':'READY PLAYER ONE'}
function layout(){
 bricks=[];
 for(let row=0;row<5;row++)for(let col=0;col<12;col++)bricks.push({x:47+col*68,y:64+row*28,w:62,h:19,color:colors[row],alive:true,bonus:null});
 const positions=bricks.map((_,i)=>i);
 for(let i=positions.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[positions[i],positions[j]]=[positions[j],positions[i]]}
 // Every stage has two clearly marked bricks for each bonus type.
 for(let i=0;i<6;i++)bricks[positions[i]].bonus=giftTypes[i%giftTypes.length];
}
function serve(){clearBonuses();paddle.x=(W-paddle.w)/2;ball={x:paddle.x+paddle.w/2,y:paddle.y-10,r:7,vx:3,vy:-5};mode='serve';hud()}
async function beep(freq){
 if(!sound)return;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)throw Error('Web Audio unavailable');
  if(!audio||audio.state==='closed')audio=new Audio();
  if(audio.state!=='running')await audio.resume();
  if(!sound)return;
  const now=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();
  o.type='square';o.frequency.setValueAtTime(freq,now);
  g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.06,now+.005);g.gain.exponentialRampToValueAtTime(.001,now+.12);
  o.connect(g);g.connect(audio.destination);o.onended=()=>{o.disconnect();g.disconnect()};o.start(now);o.stop(now+.13);
 }catch(error){sound=false;$('#sound').setAttribute('aria-pressed','false');$('#sound').innerHTML='♪ <span>SOUND UNAVAILABLE</span>';$('#sound').title='브라우저의 오디오 권한과 지원 여부를 확인해 주세요';console.warn('Audio playback unavailable',error)}
}
function start(){setSound(true);score=0;stage=1;lives=3;particles=[];layout();serve();$('#overlay').style.display='none';launch()}
const giftTypes=['wide','slow','shield'];
const giftNames={wide:'패들 확장',slow:'슬로우 볼',shield:'보호막'};
function clearBonuses(){effects={wide:0,slow:0,shield:0};paddle.w=120;bonusHud()}
function bonusHud(){const active=giftTypes.filter(t=>effects[t]>0).map(t=>`${giftNames[t]} ${Math.ceil(effects[t]/60)}초`);$('#bonus-status').textContent=active.length?active.join(' · '):'W · S · G 표시 벽돌을 깨면 즉시 효과 획득';}

function resizePaddle(width){const center=paddle.x+paddle.w/2;paddle.w=width;paddle.x=Math.max(0,Math.min(W-width,center-width/2))}
function collectGift(type){
 if(type==='wide'){effects.wide=720;resizePaddle(180)}
 if(type==='slow'){if(!effects.slow){ball.vx*=.7;ball.vy*=.7}effects.slow=600}
 if(type==='shield')effects.shield=900;
 beep(660);bonusHud();
}
function updateBonuses(dt){
 for(const type of giftTypes){if(effects[type]<=0)continue;effects[type]=Math.max(0,effects[type]-dt);if(!effects[type]){if(type==='wide')resizePaddle(120);if(type==='slow'){ball.vx/=.7;ball.vy/=.7}}}
 bonusHud();
}
function drawShield(){if(effects.shield>0){ctx.fillStyle='#8b9baf';ctx.fillRect(0,H-19,W,3)}}
function drawBrick(b){
 const seed=Math.round(b.x*3+b.y*7);
 ctx.fillStyle='#0006';ctx.fillRect(b.x+2,b.y+3,b.w,b.h);
 ctx.fillStyle='#4a4641';ctx.fillRect(b.x,b.y,b.w,b.h);
 ctx.fillStyle=b.color;ctx.fillRect(b.x+2,b.y+2,b.w-4,b.h-4);
 ctx.fillStyle='#d3bda32b';ctx.fillRect(b.x+2,b.y+2,b.w-4,2);ctx.fillRect(b.x+2,b.y+2,2,b.h-4);
 ctx.fillStyle='#0004';ctx.fillRect(b.x+3,b.y+b.h-4,b.w-5,2);ctx.fillRect(b.x+b.w-4,b.y+3,2,b.h-5);
 for(let i=0;i<16;i++){const x=b.x+5+(seed+i*17)%(b.w-10),y=b.y+5+(seed+i*11)%(b.h-9);ctx.fillStyle=i%2?'#30271f38':'#dac2a329';ctx.fillRect(x,y,i%3+1,1)}
 ctx.strokeStyle='#44342d55';ctx.beginPath();ctx.moveTo(b.x+15,b.y+5);ctx.lineTo(b.x+18,b.y+8);ctx.lineTo(b.x+17,b.y+12);ctx.stroke();
 if(b.bonus){
  ctx.save();ctx.globalAlpha=1;
  const accent={wide:'#9cbaad',slow:'#aaa4c0',shield:'#bea381'}[b.bonus];
  ctx.fillStyle={wide:'#344c45',slow:'#464156',shield:'#504334'}[b.bonus];ctx.fillRect(b.x,b.y,b.w,b.h);
  ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.strokeRect(b.x+1,b.y+1,b.w-2,b.h-2);
  // Solid corner tabs and an icon distinguish rewards even without reading a letter.
  ctx.fillStyle=accent;ctx.fillRect(b.x,b.y,5,b.h);ctx.fillRect(b.x+b.w-5,b.y,5,b.h);
  const x=b.x+17,y=b.y+9;ctx.beginPath();
  if(b.bonus==='wide'){
   ctx.moveTo(x-6,y);ctx.lineTo(x+6,y);ctx.moveTo(x-2,y-4);ctx.lineTo(x-6,y);ctx.lineTo(x-2,y+4);ctx.moveTo(x+2,y-4);ctx.lineTo(x+6,y);ctx.lineTo(x+2,y+4);
  }else if(b.bonus==='slow'){
   ctx.moveTo(x-5,y-5);ctx.lineTo(x+5,y-5);ctx.lineTo(x-5,y+5);ctx.lineTo(x+5,y+5);ctx.lineTo(x-5,y-5);
  }else{
   ctx.moveTo(x,y-6);ctx.lineTo(x+6,y-3);ctx.lineTo(x+5,y+2);ctx.lineTo(x,y+6);ctx.lineTo(x-5,y+2);ctx.lineTo(x-6,y-3);ctx.closePath();
  }
  ctx.stroke();ctx.textAlign='center';ctx.fillStyle=accent;ctx.font='bold 16px monospace';ctx.fillText({wide:'W',slow:'S',shield:'G'}[b.bonus],b.x+42,b.y+15);ctx.restore();
 }
}
function launch(){if(mode==='serve'){mode='playing';beep(440);hud()}}
function pause(){if(mode==='playing'){mode='paused';$('#pause').innerHTML='▶ <span>RESUME</span>'}else if(mode==='paused'){mode='playing';$('#pause').innerHTML='Ⅱ <span>PAUSE</span>'}hud()}
function finish(){mode='over';$('#overlay').style.display='flex';$('#overlay h2').innerHTML='GAME<br><span>OVER.</span>';$('#message').textContent=`최종 점수 ${score.toLocaleString()} · 스테이지 ${stage} — 다시 도전해 보세요!`;$('#start').textContent='↻ PLAY AGAIN';hud()}
function update(dt){if(mode!=='playing'&&mode!=='serve')return;if(keys.ArrowLeft||keys.a)paddle.x-=8*dt;if(keys.ArrowRight||keys.d)paddle.x+=8*dt;paddle.x=Math.max(0,Math.min(W-paddle.w,paddle.x));if(mode==='serve'){ball.x=paddle.x+paddle.w/2;return}
updateBonuses(dt);const steps=Math.ceil(dt*2);for(let n=0;n<steps;n++){const d=dt/steps,oldY=ball.y;ball.x+=ball.vx*d;ball.y+=ball.vy*d;if(ball.x<ball.r){ball.x=ball.r;ball.vx=Math.abs(ball.vx);beep(220)}if(ball.x>W-ball.r){ball.x=W-ball.r;ball.vx=-Math.abs(ball.vx);beep(220)}if(ball.y<ball.r){ball.y=ball.r;ball.vy=Math.abs(ball.vy);beep(220)}
if(ball.vy>0&&oldY+ball.r<=paddle.y&&ball.y+ball.r>=paddle.y&&ball.x>=paddle.x-ball.r&&ball.x<=paddle.x+paddle.w+ball.r){const angle=((ball.x-paddle.x)/paddle.w-.5)*2*1.05,speed=Math.min(9,6+stage*.45)*(effects.slow?.7:1);ball.vx=Math.sin(angle)*speed;ball.vy=-Math.cos(angle)*speed;ball.y=paddle.y-ball.r;beep(330)}
for(const b of bricks){if(!b.alive||ball.x+ball.r<b.x||ball.x-ball.r>b.x+b.w||ball.y+ball.r<b.y||ball.y-ball.r>b.y+b.h)continue;b.alive=false;if(oldY+ball.r<=b.y||oldY-ball.r>=b.y+b.h)ball.vy*=-1;else ball.vx*=-1;if(b.bonus)collectGift(b.bonus);score+=10*(5-colors.indexOf(b.color));if(score>best){best=score;try{localStorage.setItem('brick-best',String(best))}catch{}}for(let i=0;i<8;i++)particles.push({x:ball.x,y:ball.y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:30,color:b.color});beep(500+colors.indexOf(b.color)*100);hud();break}
if(effects.shield>0&&ball.vy>0&&oldY+ball.r<=H-19&&ball.y+ball.r>=H-19){ball.y=H-19-ball.r;ball.vy=-Math.abs(ball.vy);effects.shield=0;beep(280);bonusHud()}
if(ball.y>H+ball.r){lives--;beep(110);if(!lives)finish();else serve();break}if(bricks.every(b=>!b.alive)){stage++;layout();serve();break}}
}
function draw(dt){ctx.fillStyle='#090d13';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#17202b';ctx.lineWidth=1;for(let x=0;x<W;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}for(const b of bricks){if(!b.alive)continue;ctx.globalAlpha=mode==='ready'?.55:1;drawBrick(b);}ctx.globalAlpha=1;drawShield();ctx.shadowBlur=0;ctx.fillStyle='#8fa89f';ctx.fillRect(paddle.x,paddle.y,paddle.w,paddle.h);ctx.fillStyle='#b0bfb0';ctx.fillRect(paddle.x+2,paddle.y+1,paddle.w-4,2);ctx.fillStyle='#d1c6b5';ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;if(mode!=='paused')particles=particles.filter(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;ctx.globalAlpha=Math.max(0,p.life/30);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3);return p.life>0});ctx.globalAlpha=1;if(mode==='paused'||mode==='serve'){ctx.textAlign='center';ctx.fillStyle='#a8b89b';ctx.font='16px monospace';ctx.fillText(mode==='paused'?'PAUSED — PRESS P':'PRESS SPACE / TAP TO LAUNCH',W/2,350)}}
function frame(t){const dt=Math.min(2,(t-last)/16.667||1);last=t;update(dt);draw(dt);requestAnimationFrame(frame)}
function setSound(enabled){sound=enabled;$('#sound').setAttribute('aria-pressed',String(sound));$('#sound').innerHTML=`♪ <span>SOUND ${sound?'ON':'OFF'}</span>`;$('#sound').title=sound?'사운드 끄기':'사운드 켜기'}
$('#start').onclick=start;$('#pause').onclick=pause;$('#reset').onclick=()=>{start();mode='serve';hud()};$('#sound').onclick=()=>{setSound(!sound);beep(440)};
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys[e.key]=true;if(e.repeat)return;if(e.code==='Space'){if(mode==='ready'||mode==='over')start();else if(mode==='paused')pause();else launch()}if(e.key.toLowerCase()==='p')pause()});addEventListener('keyup',e=>keys[e.key]=false);addEventListener('blur',()=>{keys={};if(mode==='playing')pause()});
canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();paddle.x=Math.max(0,Math.min(W-paddle.w,(e.clientX-r.left)*W/r.width-paddle.w/2))});canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);const r=canvas.getBoundingClientRect();paddle.x=Math.max(0,Math.min(W-paddle.w,(e.clientX-r.left)*W/r.width-paddle.w/2));launch()});setSound(true);layout();hud();requestAnimationFrame(frame);
