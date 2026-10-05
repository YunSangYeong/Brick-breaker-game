const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements={};const context=new Proxy({},{get:()=>()=>{}});const get=s=>elements[s]??={style:{},textContent:'',innerHTML:'',setAttribute(){},addEventListener(){},getContext:()=>context};
const sandbox={document:{querySelector:get},localStorage:{getItem:()=>null,setItem(){}},window:{},addEventListener(){},requestAnimationFrame(){},Math,console};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../game.js'),'utf8'),sandbox);
vm.runInContext(`
beep=async()=>{};
start(); if(mode!=='playing'||bricks.length!==60)throw Error('start');
bricks[0].bonus=null;ball.x=bricks[0].x+20;ball.y=bricks[0].y-8;ball.vx=0;ball.vy=5;update(1);if(bricks[0].alive||score!==50||ball.vy>=0)throw Error('brick collision');
ball.x=paddle.x+60;ball.y=paddle.y-8;ball.vy=5;update(1);if(ball.vy>=0)throw Error('paddle collision');
pause();let y=ball.y;update(1);if(ball.y!==y||mode!=='paused')throw Error('pause');pause();
ball.y=550;ball.vy=5;update(1);if(lives!==2||mode!=='serve')throw Error('life');
launch();bricks.forEach(b=>b.alive=false);update(1);if(stage!==2||bricks.length!==60||mode!=='serve')throw Error('stage');
lives=1;launch();ball.y=550;ball.vy=5;update(1);if(mode!=='over')throw Error('game over');
start();if(lives!==3||score!==0||stage!==1)throw Error('restart');
const check=(v,m)=>{if(!v)throw Error(m)};
check(sound,'sound defaults on');setSound(false);start();check(sound,'restart enables sound');
check(bricks.filter(b=>b.bonus).length===6,'six special bricks');for(const t of giftTypes)check(bricks.filter(b=>b.bonus===t).length===2,'each bonus present');
for(const type of giftTypes){serve();launch();const b=bricks.find(b=>b.alive&&b.bonus===type);ball.x=b.x+b.w/2;ball.y=b.y+b.h+8;ball.vx=0;ball.vy=-5;update(1);check(!b.alive&&effects[type]>0,'instant acquisition '+type);check(effects[type]<=({wide:720,slow:600,shield:900}[type]),'effect duration')}
serve();launch();const plain=bricks.find(b=>b.alive&&!b.bonus);ball.x=plain.x+plain.w/2;ball.y=plain.y+plain.h+8;ball.vx=0;ball.vy=-5;update(1);check(!plain.alive&&giftTypes.every(t=>!effects[t]),'normal brick has no bonus');
collectGift('wide');check(paddle.w===180,'wide');effects.wide=1;updateBonuses(1);check(paddle.w===120,'wide expires');
const v=ball.vy;collectGift('slow');check(Math.abs(ball.vy-v*.7)<.0001,'slow');collectGift('slow');check(Math.abs(ball.vy-v*.7)<.0001,'slow refresh');effects.slow=1;updateBonuses(1);check(Math.abs(ball.vy-v)<.0001,'slow expires');
collectGift('shield');ball.x=20;ball.y=H-19-ball.r-1;ball.vy=5;update(1);check(ball.vy<0&&effects.shield===0&&lives===3,'shield saves once');
collectGift('wide');pause();const remaining=effects.wide;update(2);check(effects.wide===remaining,'pause freezes timer');pause();
serve();check(paddle.w===120&&giftTypes.every(t=>!effects[t]),'life reset');draw(1);
`,sandbox);console.log('PASS: start, brick collision, paddle bounce, pause, life loss, next stage, game over, restart, render, marked special bricks, instant acquisition, sound defaults, effect refresh and expiration, shield, pause timers, cleanup');
