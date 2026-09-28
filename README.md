# Near Field

Bullet-hell boxing: aim in direction and distance, then shape bullet groups through movement and fields.

Open `index.html` in a browser. No installation or build step is required.

## Controls

- WASD to move, mouse to aim, click for a burst, hold to keep firing; Space to pause, R to restart.
- Controller: left stick to move, right stick to aim, LB / RB to adjust range, RT to fire.
- Touch: left joystick to move, tap the arena to fire.

## Mechanics

Aim range sets travel before activation, with a minimum of 100. The range line marks the damaging path; bullets disappear at its end. Distance follows the actual trajectory. Activation is delayed inside an opponent without extending the path.

Dim bullets are harmless and ignore character fields. Opposing dim bullets may cancel on contact; bright bullets pass through other bullets. Bright-bullet damage = explosion damage + momentum damage. Explosion damage grows linearly with travel after activation, up to 100; interior brightness shows its strength. Momentum damage depends on relative inward contact speed, so glancing hits add less.

Receiving fields slow and deflect enemy bright bullets; control fields only deflect your own. Moving perpendicular to the firing direction gives new bullets spin: faster sideways movement gives more spin, fixed at launch. In character fields, bright bullets bend according to spin; the field owner’s movement transverse to the bullet direction can reinforce or cancel the deflection.

Settings apply to both sides and save automatically. Opening settings pauses play.

## Development

Code, styles and synthesized sound are contained in `index.html`. Run checks with:

```sh
node tests/check-game.cjs
```

Tests use a mock browser environment. Visuals, sound and input devices require browser verification.

Concept and gameplay design by czrorz. Code written by ChatGPT.
