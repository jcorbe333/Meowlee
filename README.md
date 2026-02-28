# meowlee

A scratch-built platform fighter prototype inspired by Super Smash Bros.

## What is implemented
- 2 local players on one keyboard
- Stage with multiple platforms
- Movement: run, jump, double-jump, fast-fall
- Basic attack hitboxes
- Damage % system (higher % = stronger knockback)
- Stocks (3 each), blast zones, KO + respawn invulnerability
- Win condition + quick restart

## Run locally
Serve the project directory with any static file server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) in a browser.

## Controls
- Player 1: `A`/`D` move, `W` jump, `S` fast-fall, `F` attack
- Player 2: `←`/`→` move, `↑` jump, `↓` fast-fall, `/` attack
- Restart round: `R`

## Next build targets
- Shield, grab, dodge/roll
- Multiple attack types (tilts, aerials, specials)
- Better hitstun/launch formulas
- Character select + unique move sets
- Gamepad support + online rollback netcode
