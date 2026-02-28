const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

const BLAST_ZONE = {
  left: -220,
  right: GAME_WIDTH + 220,
  top: -260,
  bottom: GAME_HEIGHT + 220,
};

const PHYSICS = {
  gravityY: 1350,
  groundSpeed: 320,
  airSpeed: 250,
  groundAccel: 2600,
  airAccel: 1700,
  groundFriction: 2400,
  jumpVelocity: -620,
  fastFallVelocity: 850,
  maxFallVelocity: 1050,
  maxJumps: 2,
};

const COMBAT = {
  attackDamage: 8,
  baseKnockback: 260,
  knockbackScale: 4.3,
  hitstunBaseMs: 180,
  hitstunScaleMs: 2.3,
  attackCooldownMs: 260,
  attackActiveMs: 120,
  invulnRespawnMs: 1800,
};

const ROUND = {
  stocks: 3,
};

const STAGE = [
  { x: GAME_WIDTH / 2, y: 506, w: 560, h: 36, color: 0x5f4b32 },
  { x: GAME_WIDTH / 2 - 190, y: 380, w: 210, h: 20, color: 0x6f8b5e },
  { x: GAME_WIDTH / 2 + 190, y: 380, w: 210, h: 20, color: 0x6f8b5e },
  { x: GAME_WIDTH / 2, y: 300, w: 240, h: 20, color: 0x4c6a88 },
];

function approach(value, target, delta) {
  if (value < target) return Math.min(target, value + delta);
  if (value > target) return Math.max(target, value - delta);
  return value;
}

class Fighter {
  constructor(scene, cfg) {
    this.scene = scene;
    this.id = cfg.id;
    this.name = cfg.name;
    this.color = cfg.color;
    this.spawn = { x: cfg.spawnX, y: cfg.spawnY };
    this.controls = cfg.controls;

    this.damage = 0;
    this.stocks = ROUND.stocks;
    this.jumpsUsed = 0;
    this.facing = cfg.facing;
    this.hitstunUntil = 0;
    this.invulnUntil = 0;
    this.lastAttackAt = -Infinity;
    this.attack = null;

    this.bodyObj = scene.add.rectangle(this.spawn.x, this.spawn.y, 38, 54, this.color, 1);
    scene.physics.add.existing(this.bodyObj);
    this.body = this.bodyObj.body;
    this.body.setCollideWorldBounds(false);
    this.body.setBounce(0);
    this.body.setDrag(0, 0);
    this.body.setMaxVelocity(PHYSICS.groundSpeed + 160, PHYSICS.maxFallVelocity);

    this.damageText = scene.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5, 1.4);
  }

  update(time, dtSec) {
    const move = this.controls;
    const left = move.left.isDown;
    const right = move.right.isDown;
    const jumpPressed = Phaser.Input.Keyboard.JustDown(move.jump);
    const down = move.down.isDown;
    const attackPressed = Phaser.Input.Keyboard.JustDown(move.attack);

    const grounded = this.body.blocked.down;
    if (grounded) this.jumpsUsed = 0;

    const inHitstun = time < this.hitstunUntil;
    const inputAxis = (right ? 1 : 0) - (left ? 1 : 0);

    if (!inHitstun) {
      if (inputAxis !== 0) this.facing = inputAxis;

      const targetSpeed = inputAxis * (grounded ? PHYSICS.groundSpeed : PHYSICS.airSpeed);
      const accel = grounded ? PHYSICS.groundAccel : PHYSICS.airAccel;
      const friction = grounded ? PHYSICS.groundFriction : PHYSICS.airAccel * 0.45;

      if (inputAxis !== 0) {
        this.body.setVelocityX(approach(this.body.velocity.x, targetSpeed, accel * dtSec));
      } else {
        this.body.setVelocityX(approach(this.body.velocity.x, 0, friction * dtSec));
      }

      if (jumpPressed && (grounded || this.jumpsUsed < PHYSICS.maxJumps)) {
        this.body.setVelocityY(PHYSICS.jumpVelocity);
        this.jumpsUsed += 1;
      }

      if (!grounded && down) {
        this.body.setVelocityY(Math.max(this.body.velocity.y, PHYSICS.fastFallVelocity));
      }

      if (attackPressed && time - this.lastAttackAt >= COMBAT.attackCooldownMs) {
        this.startAttack(time);
      }
    }

    if (this.body.velocity.y > PHYSICS.maxFallVelocity) {
      this.body.setVelocityY(PHYSICS.maxFallVelocity);
    }

    this.updateAttack(time);

    if (time < this.invulnUntil) {
      const pulse = 0.42 + Math.abs(Math.sin(time / 65)) * 0.48;
      this.bodyObj.setAlpha(pulse);
    } else {
      this.bodyObj.setAlpha(1);
    }

    this.damageText.setPosition(this.bodyObj.x, this.bodyObj.y - 28);
    this.damageText.setText(`${this.damage.toFixed(0)}%`);
  }

  startAttack(time) {
    this.lastAttackAt = time;
    if (this.attack) this.endAttack();

    const hitbox = this.scene.add.rectangle(this.bodyObj.x, this.bodyObj.y, 48, 30, 0xfff3b0, 0.35);
    this.scene.physics.add.existing(hitbox);
    hitbox.body.setAllowGravity(false);
    hitbox.body.setImmovable(true);
    hitbox.body.setVelocity(0, 0);

    this.attack = {
      hitbox,
      expiresAt: time + COMBAT.attackActiveMs,
      didHit: false,
    };

    this.positionAttackHitbox();
  }

  positionAttackHitbox() {
    if (!this.attack) return;
    const xOffset = this.facing * 40;
    this.attack.hitbox.setPosition(this.bodyObj.x + xOffset, this.bodyObj.y - 4);
  }

  updateAttack(time) {
    if (!this.attack) return;
    if (time > this.attack.expiresAt) {
      this.endAttack();
      return;
    }
    this.positionAttackHitbox();
  }

  tryHit(target, time) {
    if (!this.attack || this.attack.didHit) return;
    if (time < target.invulnUntil) return;

    if (this.scene.physics.overlap(this.attack.hitbox, target.bodyObj)) {
      this.attack.didHit = true;
      target.takeHit(this, time);
      this.scene.cameras.main.shake(80, 0.0025);
    }
  }

  takeHit(attacker, time) {
    this.damage += COMBAT.attackDamage;
    const kb = COMBAT.baseKnockback + this.damage * COMBAT.knockbackScale;
    const direction = attacker.facing === 0 ? 1 : attacker.facing;

    this.body.setVelocityX(direction * kb);
    this.body.setVelocityY(-Math.max(180, kb * 0.55));

    const hitstun = COMBAT.hitstunBaseMs + this.damage * COMBAT.hitstunScaleMs;
    this.hitstunUntil = time + hitstun;
  }

  isInBlastZone() {
    const x = this.bodyObj.x;
    const y = this.bodyObj.y;
    return x < BLAST_ZONE.left || x > BLAST_ZONE.right || y < BLAST_ZONE.top || y > BLAST_ZONE.bottom;
  }

  loseStockAndRespawn() {
    this.stocks -= 1;
    this.damage = 0;
    this.hitstunUntil = 0;
    this.endAttack();

    this.bodyObj.setPosition(this.spawn.x, this.spawn.y);
    this.body.setVelocity(0, 0);
    this.body.setAcceleration(0, 0);
    this.invulnUntil = this.scene.time.now + COMBAT.invulnRespawnMs;
  }

  endAttack() {
    if (!this.attack) return;
    this.attack.hitbox.destroy();
    this.attack = null;
  }

  destroy() {
    this.endAttack();
    this.damageText.destroy();
    this.bodyObj.destroy();
  }
}

class SmashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SmashScene' });
  }

  create() {
    this.roundOver = false;

    const g = this.add.graphics();
    g.fillGradientStyle(0x15202b, 0x1d3557, 0x2a9d8f, 0x264653, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.platforms = this.physics.add.staticGroup();
    STAGE.forEach((p) => {
      const r = this.add.rectangle(p.x, p.y, p.w, p.h, p.color, 1);
      this.platforms.add(r);
    });
    this.platforms.refresh();

    this.spawnPoints = {
      p1: { x: GAME_WIDTH / 2 - 120, y: 220 },
      p2: { x: GAME_WIDTH / 2 + 120, y: 220 },
    };

    const keys = this.input.keyboard.addKeys({
      p1Left: 'A',
      p1Right: 'D',
      p1Jump: 'W',
      p1Down: 'S',
      p1Attack: 'F',
      p2Left: 'LEFT',
      p2Right: 'RIGHT',
      p2Jump: 'UP',
      p2Down: 'DOWN',
      p2Attack: Phaser.Input.Keyboard.KeyCodes.SLASH,
      restart: 'R',
    });

    this.p1 = new Fighter(this, {
      id: 'p1',
      name: 'Player 1',
      color: 0xe63946,
      spawnX: this.spawnPoints.p1.x,
      spawnY: this.spawnPoints.p1.y,
      facing: 1,
      controls: {
        left: keys.p1Left,
        right: keys.p1Right,
        jump: keys.p1Jump,
        down: keys.p1Down,
        attack: keys.p1Attack,
      },
    });

    this.p2 = new Fighter(this, {
      id: 'p2',
      name: 'Player 2',
      color: 0x3a86ff,
      spawnX: this.spawnPoints.p2.x,
      spawnY: this.spawnPoints.p2.y,
      facing: -1,
      controls: {
        left: keys.p2Left,
        right: keys.p2Right,
        jump: keys.p2Jump,
        down: keys.p2Down,
        attack: keys.p2Attack,
      },
    });

    this.physics.add.collider(this.p1.bodyObj, this.platforms);
    this.physics.add.collider(this.p2.bodyObj, this.platforms);
    this.physics.add.collider(this.p1.bodyObj, this.p2.bodyObj);

    this.hud = {
      p1: this.add.text(20, 14, '', { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff' }),
      p2: this.add.text(GAME_WIDTH - 20, 14, '', { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff' }).setOrigin(1, 0),
      center: this.add.text(GAME_WIDTH / 2, 14, 'First to 3 KOs', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#f1faee',
      }).setOrigin(0.5, 0),
      controls: this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 12,
        'P1: A/D move, W jump, S fast-fall, F attack | P2: Arrow keys + / attack', {
          fontFamily: 'monospace',
          fontSize: '15px',
          color: '#f8f9fa',
        }
      ).setOrigin(0.5, 1),
    };

    this.winnerText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontFamily: 'monospace',
      fontSize: '40px',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5).setVisible(false);

    this.restartKey = keys.restart;
    this.updateHud();
  }

  update(time, delta) {
    if (this.roundOver) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.restart();
      }
      return;
    }

    const dtSec = delta / 1000;

    this.p1.update(time, dtSec);
    this.p2.update(time, dtSec);

    this.p1.tryHit(this.p2, time);
    this.p2.tryHit(this.p1, time);

    this.resolveKO(this.p1, this.p2);
    this.resolveKO(this.p2, this.p1);

    this.updateHud();
  }

  resolveKO(victim, opponent) {
    if (!victim.isInBlastZone()) return;

    victim.loseStockAndRespawn();
    this.cameras.main.flash(180, 255, 255, 255);

    if (victim.stocks <= 0) {
      this.roundOver = true;
      victim.destroy();
      opponent.endAttack();
      this.winnerText
        .setText(`${opponent.name} wins!\nPress R to restart`)
        .setVisible(true);
    }
  }

  updateHud() {
    if (!this.p1 || !this.p2) return;

    this.hud.p1.setText(`P1  ${this.p1.damage.toFixed(0)}%  Stocks: ${Math.max(0, this.p1.stocks)}`);
    this.hud.p2.setText(`P2  ${this.p2.damage.toFixed(0)}%  Stocks: ${Math.max(0, this.p2.stocks)}`);
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#111827',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: PHYSICS.gravityY },
      debug: false,
    },
  },
  scene: [SmashScene],
};

new Phaser.Game(config);
