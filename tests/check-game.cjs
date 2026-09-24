'use strict';

// Run with: node tests/check-game.cjs. No packages or browser required.
const assert = require('node:assert/strict');
const { createGame } = require('./game-harness.cjs');
const KEY = 'near-field-settings';
let checks = 0;

function check(name, fn) {
  fn();
  checks++;
  console.log('PASS ' + name);
}
function event(game, id, type, value) {
  const node = game.elements.get(id);
  if (value !== undefined) node.value = String(value);
  node.dispatchEvent({ type });
}
function adjustRange(game, seconds, direction) {
  game.api.step(seconds, { x: 0, y: 0, shoot: false, rangeAdjust: direction });
}

check('normal play does not expose development hooks', () => {
  assert.equal(createGame(undefined, { search: '' }).api, undefined);
});

check('settings, language and selected map survive reopening', () => {
  const storage = {}, game = createGame(undefined, { storage });
  event(game, 'actorRadius', 'input', 18);
  event(game, 'actorRadius', 'change');
  event(game, 'actorAspect', 'input', -300);
  event(game, 'actorAspect', 'change');
  event(game, 'band', 'input', 800);
  event(game, 'band', 'change');
  event(game, 'map', 'change', 'maze');
  event(game, 'language', 'click');
  const restored = createGame(undefined, { storage });
  const snapshot = restored.api.snapshot();
  assert.equal(snapshot.cfg.actorRadius, 18);
  assert.equal(snapshot.cfg.actorAspect, -300);
  assert.equal(snapshot.cfg.band, 800);
  assert.equal(restored.inspect('mapId'), 'maze');
  assert.equal(restored.inspect('language'), 'en');
  assert.equal(snapshot.p.r, 18);
});

check('invalid and unavailable storage cannot break startup', () => {
  const invalid = { version: 1, map: '__proto__', mode: 'constructor', values: {
    actorRadius: 999, moveSpeed: 237, inertia: '0.6', drag: null,
  } };
  for (const saved of ['{broken', 'null', JSON.stringify(invalid)]) {
    const game = createGame(undefined, { storage: { [KEY]: saved } });
    assert.equal(game.api.snapshot().cfg.actorRadius, 15);
    assert.equal(game.api.snapshot().cfg.moveSpeed, 235);
    assert.equal(game.inspect('mapId'), 'four');
  }
  const game = createGame(undefined, { storageThrows: true });
  event(game, 'moveSpeed', 'input', 250);
  event(game, 'moveSpeed', 'change');
  assert.equal(game.api.snapshot().cfg.moveSpeed, 250);
});

check('controller range stops rewriting the UI at either limit', () => {
  const storage = {}, game = createGame(undefined, { storage });
  event(game, 'mode', 'change', 'practice');
  game.api.config({ sound: false, padRange: 1197.5 });
  adjustRange(game, 1 / 120, 1);
  assert.equal(game.api.snapshot().cfg.padRange, 1200);
  const highWrites = game.stats.writes['padRange-value'];
  adjustRange(game, 0.5, 1);
  assert.equal(game.stats.writes['padRange-value'], highWrites);
  adjustRange(game, 1 / 120, 0);
  assert.equal(JSON.parse(storage[KEY]).values.padRange, 1200);
  game.api.config({ padRange: 102.5 });
  adjustRange(game, 1 / 120, -1);
  assert.equal(game.api.snapshot().cfg.padRange, 100);
  const lowWrites = game.stats.writes['padRange-value'];
  adjustRange(game, 0.5, -1);
  assert.equal(game.stats.writes['padRange-value'], lowWrites);
});

check('pause clears pending fire and map changes preserve play state', () => {
  const game = createGame();
  game.api.reset(true);
  game.inspect('mouse.down=true;mouse.press={x:900,y:375};');
  game.api.pause();
  assert.equal(game.inspect('mouse.down || mouse.press !== null'), false);
  event(game, 'map', 'change', 'crossflow');
  assert.equal(game.api.snapshot().state, 'ready');
  assert.equal(game.api.snapshot().bullets.length, 0);
  game.api.reset(true);
  event(game, 'map', 'change', 'vortices');
  assert.equal(game.api.snapshot().state, 'running');
});

check('fixed and dodging practice targets never fire', () => {
  for (const mode of ['practice', 'practice-dodge']) {
    const game = createGame();
    event(game, 'mode', 'change', mode);
    game.api.config({ sound: false });
    game.api.step(3, { x: 0, y: 0, shoot: false });
    assert.equal(game.api.snapshot().bullets.length, 0, mode);
    assert.equal(game.inspect('enemy.salvo'), null, mode);
  }
});

check('static fields affect every bullet phase equally', () => {
  const game = createGame();
  const results = game.inspect(`(() => {
    Object.assign(cfg,{propulsion:0,drag:0,spinForce:0});
    return [['barrier',450,300],['vortices',440,300],['crossflow',460,375]].map(([map,x,y])=>{
      setMap(map);
      const base={x,y,vx:800,vy:0,dx:1,dy:0,r:2.8,team:0,travel:0,
        intervalEnd:800,damageEnd:800,spin:0};
      return ['ghost','arming','solid'].map(phase=>{
        const b={...base,fieldStart:phase==='ghost'?500:0,
          damageStart:phase==='solid'?0:null,armedAge:0,armingDelay:1};
        return bulletAcceleration(b,x,y,b.vx,b.vy,0,null);
      });
    });
  })()`);
  for (const phases of results) {
    assert.deepEqual(phases[0], phases[1]);
    assert.deepEqual(phases[1], phases[2]);
    assert.ok(Math.hypot(phases[0].x, phases[0].y) > 0);
  }
});

check('seven maps simulate, render and keep actors clear of walls', () => {
  for (const map of ['open', 'four', 'barrier', 'ellipse', 'vortices', 'crossflow', 'maze']) {
    const game = createGame();
    event(game, 'map', 'change', map);
    game.api.config({ sound: false, maxHealth: 50 });
    game.api.reset(true);
    game.api.step(1 / 120, { x: 0, y: 0, shoot: false });
    for (let frame = 0; frame < 240; frame++) {
      game.api.step(1 / 60, {
        x: 0.4 * Math.sin(frame / 70), y: 0.4 * Math.cos(frame / 80),
        shoot: true, autoFire: true, aimPoint: { x: 880, y: 360 },
      });
      if (frame % 30 !== 0) continue;
      const snapshot = game.api.snapshot();
      for (const body of [snapshot.p, snapshot.enemy, ...snapshot.bullets].filter(Boolean)) {
        for (const key of ['x', 'y', 'vx', 'vy']) assert.ok(Number.isFinite(body[key]), map + ':' + key);
      }
      const clearance = game.inspect(`Math.min(...[p,enemy].filter(Boolean).flatMap(a=>WALLS.map(w=>
        (w.kind?curveClosest(w,a.x,a.y).d:Math.hypot(
          a.x-(w.horizontal?clamp(a.x,w.x0,w.x1):w.x),
          a.y-(w.horizontal?w.y:clamp(a.y,w.y0,w.y1))))-bodyShape(a).rx-w.r)))`);
      assert.ok(clearance >= 2.99, map + ': actor penetrated wall');
      game.api.render();
    }
    assert.ok(game.api.snapshot().shots > 0, map + ': player did not fire');
  }
});

check('changing body size and aspect leaves the maze traversable', () => {
  const game = createGame();
  const result = game.inspect(`(() => {
    setMap('maze');
    const radius=18*2*Math.exp(.29)+3,step=10,cells=new Map();
    for(let y=80;y<=670;y+=step)for(let x=80;x<=1120;x+=step)
      if(!firstWallHit(x,y,x,y,radius))cells.set(x+','+y,{x,y});
    const unseen=new Set(cells.keys()),queue=[cells.values().next().value];
    unseen.delete(queue[0].x+','+queue[0].y);
    for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]){
      const c=queue[i],key=(c.x+dx)+','+(c.y+dy),next=cells.get(key);
      if(next&&unseen.has(key)&&!firstWallHit(c.x,c.y,next.x,next.y,radius)){
        unseen.delete(key);queue.push(next);
      }
    }
    return {cells:cells.size,unreachable:unseen.size};
  })()`);
  assert.ok(result.cells > 0);
  assert.equal(result.unreachable, 0);
});

require('./projectile-expiry.cjs');
console.log(`All ${checks} game checks and projectile expiry regressions passed.`);
