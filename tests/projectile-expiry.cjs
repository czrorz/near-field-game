const assert=require('node:assert/strict');
const path=require('node:path');
const {createGame}=require('./game-harness.cjs');

const game=createGame(path.join(__dirname,'..','index.html'));
const results=game.inspect(`(()=>{
 setMap('open');cfg.drag=0;cfg.spinForce=0;cfg.propulsion=300;
 p=createActor(0,600,375);enemy=createActor(1,900,375);
 const make=(changes={})=>({id:1,x:580,y:375,vx:800,vy:0,dx:1,dy:0,
  team:1,r:2.8,age:0,spin:0,travel:0,fieldStart:0,intervalEnd:800,
  damageStart:0,damageEnd:800,armedAge:0,armingDelay:0,...changes});
 const simulate=(b,target=p,dt=STEP)=>{stepBullet(b,dt);return{b,contact:collisionEvent(b,target)};};
 const afterLifetime=simulate(make({age:11.999}));
 const beforeLifetime=simulate(make({age:11.996}));
 const ordinary=simulate(make());
 const ordinaryTime=ordinary.contact?.t;
 ordinary.b.collisionEnd=ordinaryTime;
 const atLifetimeEnd=collisionEvent(ordinary.b,p);
 const shortRange=simulate(make({intervalEnd:1,damageEnd:1}));
 const beforeRangeEnd=simulate(make({intervalEnd:4,damageEnd:4}));
 const rangeBoundary=simulate(make());
 rangeBoundary.b.endPoint={t:rangeBoundary.contact?.t};
 const atRangeEnd=collisionEvent(rangeBoundary.b,p);
 WALLS=[{x:590,y0:300,y1:450,r:7,type:'absorb'}];
 const wallBeforeTarget=simulate(make({x:575}));
 WALLS=[{x:630,y0:300,y1:450,r:7,type:'absorb'}];
 const targetBeforeWall=simulate(make(),p,.06);
 return{
  afterLifetime:{expired:afterLifetime.b.expired,cutoff:afterLifetime.b.collisionEnd,hit:!!afterLifetime.contact},
  beforeLifetime:{expired:beforeLifetime.b.expired,cutoff:beforeLifetime.b.collisionEnd,hitTime:beforeLifetime.contact?.t},
  atLifetimeEnd:!!atLifetimeEnd,
  shortRange:{ended:shortRange.b.ended,hit:!!shortRange.contact},
  beforeRangeEnd:{ended:beforeRangeEnd.b.ended,hitTime:beforeRangeEnd.contact?.t,endTime:beforeRangeEnd.b.endPoint?.t},
  atRangeEnd:!!atRangeEnd,
  wallBeforeTarget:{absorbed:wallBeforeTarget.b.wallAbsorbed,hit:!!wallBeforeTarget.contact},
  targetBeforeWall:{absorbed:targetBeforeWall.b.wallAbsorbed,hitTime:targetBeforeWall.contact?.t,wallTime:targetBeforeWall.b.wallEnd?.t}
 };
})()`);

assert.equal(results.afterLifetime.expired,true);
assert.equal(results.afterLifetime.hit,false,'a projectile must not hit after its lifetime cutoff');
assert.equal(results.beforeLifetime.expired,true);
assert.ok(results.beforeLifetime.hitTime<results.beforeLifetime.cutoff,'an earlier hit remains valid even when the projectile expires later in the frame');
assert.equal(results.atLifetimeEnd,false,'the exact lifetime cutoff is excluded');
assert.equal(results.shortRange.ended,true);
assert.equal(results.shortRange.hit,false,'a target beyond the effective path end must not be hit');
assert.equal(results.beforeRangeEnd.ended,true);
assert.ok(results.beforeRangeEnd.hitTime<results.beforeRangeEnd.endTime,'a hit before the path end remains valid');
assert.equal(results.atRangeEnd,false,'the exact path endpoint is excluded');
assert.equal(results.wallBeforeTarget.absorbed,true);
assert.equal(results.wallBeforeTarget.hit,false,'an absorbed projectile cannot reach a later target');
assert.equal(results.targetBeforeWall.absorbed,true);
assert.ok(results.targetBeforeWall.hitTime<results.targetBeforeWall.wallTime,'a hit before wall absorption remains valid');
console.log('Projectile expiry: lifetime, path endpoints, and wall ordering passed.');
