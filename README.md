# Near Field

A 2D shooting demo for exploring movement inertia and curved trajectories. Move, aim, and choose where your bullets turn bright and become damaging. Each character carries a receiving field that slows and deflects incoming bright bullets and a separate control field that bends their own bright bullets without slowing them. Sideways movement at launch and by the field owner can reinforce or cancel the deflection.

Concept and gameplay design by czrorz. Code written by ChatGPT.

## Play

Open `index.html` in a browser. The page, styles, game logic, and synthesized sound effects are contained in this single file. No dependencies or build step are required to play.

Choose a map and mode at the top. **Instructions & settings** below the arena contains the controls and five groups of parameters. Opening settings pauses the game. Difficulty can change during combat without interrupting or resetting the round. Changing the map or switching into, out of, or between practice modes resets the round: it continues immediately only if the game was running; otherwise, it waits for you to start.

The nine maps explore open space, absorbing and reflecting walls, static force fields, and wrapping boundaries. Bullet loop wraps bullets across opposite edges. Klein bottle additionally mirrors bullets horizontally when they cross the top or bottom edge, reversing horizontal velocity and spin. Characters stay inside; translucent translated or mirrored images provide aiming references outside the arena.

Under **Bullet trajectory**, **Initial spin direction** selects whether launch spin bends bullets with or against sideways movement at firing. Positive preserves the original behavior. Both sides share the choice; it applies to newly fired bullets and is remembered with the other settings.

The browser uses `localStorage` to remember parameters, map, mode, and language. It does not change other computer settings. Clearing browser site data removes these preferences; moving the file or switching browsers may not preserve them. The game remains playable when storage is unavailable.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Complete game, distributed as a single standalone file |
| `tests/game-harness.cjs` | Offline test environment with mock DOM, Canvas, and storage interfaces |
| `tests/check-game.cjs` | Entry point for map, projectile, settings, round, and input regression checks |
| `tests/projectile-expiry.cjs` | Checks projectile lifetime, damaging-path endpoints, and the ordering of wall contacts and hits |

## Code guide

The script is divided into sections marked `// === number · name ===`. Search by section number or function name to find an area.

| Sections | Contents and entry points |
| --- | --- |
| 01–02 | World coordinates, `MAPS`, static fields, `DEFAULTS`, shared parameters, and runtime state |
| 03–04 | `ENGLISH`, language switching, deferred audio preparation, and sound concurrency limits |
| 05–06 | Character deformation, wall geometry, movement, input ownership, and round lifecycle |
| 07–08 | `integrateProjectile`, projectile phases, weapons, swept collisions, and hit resolution |
| 09–10 | AI perception, bounded forecasts and decisions, and incremental preparation while in the menu |
| 11–13 | Fixed-step `simulate` updates, HUD, Canvas drawing, frame loop, and input events |
| 14–16 | Validated settings and persistence, startup, and inspection hooks available only with `?test` |

Map definitions live in `MAPS`; their selector options live in the top-level `select#map`. When adding a map, include its Chinese option label, `ENGLISH` translation, and any necessary gameplay instructions. Static fields use `mapAcceleration`, `mapForceBound`, and `mapFieldTouchesSegment` for both live projectiles and AI forecasts.

## Development rules

- Most maps use a 1200 × 750 world; Bullet loop and Klein bottle use 840 × 525. The view remains 1200 × 750, centering smaller maps without changing display scale. Coordinates increase rightward and downward. Time is measured in seconds. Physics uses `STEP = 1/120`; rendering does not advance the simulation.
- Brightening and damaging-path limits depend on actual accumulated travel distance. Curves, reflections, and delayed brightening inside a character do not extend that path.
- Map fields affect every projectile phase. Character fields do not affect dim bullets. Fields do not move characters.
- Projectiles use swept collision checks against character ellipses. Character-to-character and character-to-wall collisions use enclosing circles. Health bars reserve space for the maximum deformation and stay steady as characters turn.
- Hits and dim-bullet interceptions within a step resolve in contact-time order. Contacts before expiry or absorption by a wall remain valid; contacts after a projectile becomes inactive must not damage characters.
- AI observes public state with a delay. Keep its candidate counts and computation budgets bounded; live projectiles must not be truncated by AI forecast budgets.
- Keep the five settings groups: character and movement, shooting, projectile trajectories, force fields, and hits and knockback. Both sides share the parameters. Unknown or invalid values in saved settings are ignored.

## Checks

With Node.js available in the development environment, run this command from the project directory:

```sh
node tests/check-game.cjs
```

The existing checks target the original seven maps, character-wall contacts, maze connectivity at maximum deformation, map-field effects across projectile phases, restored settings and storage failures, practice modes, clearing firing input on pause, controller range limits, and hit ordering around projectile expiry. The suite has not been updated or rerun for the newer Bullet loop and Klein bottle maps or the latest rendering and performance changes; it does not establish coverage of the current nine-map version.

These are offline logic checks with mock Canvas and audio interfaces. Visual appearance, touch and controller hardware, sound, and browser frame rate still need to be checked in a browser.
