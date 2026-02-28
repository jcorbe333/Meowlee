import SpriteKit

final class CatNode: SKSpriteNode {
  private let atlas: TextureAtlasLoader
  private var currentAnimName: String?
  private let animKey = "anim"

  init(atlas: TextureAtlasLoader) {
    self.atlas = atlas
    let initial = atlas.texture(named: "idle_01")
    super.init(texture: initial, color: .clear, size: atlas.referenceSize)
    texture?.filteringMode = .nearest
  }

  required init?(coder aDecoder: NSCoder) {
    return nil
  }

  func playIdle() {
    play("idle", timePerFrame: 0.10, looping: true)
  }

  func playRun() {
    play("run", timePerFrame: 0.08, looping: true)
  }

  func playJump() {
    play("jump", timePerFrame: 0.08, looping: false)
  }

  func playPounce() {
    play("pounce", timePerFrame: 0.07, looping: false)
  }

  func playFall() {
    play("fall", timePerFrame: 0.10, looping: false)
  }

  func playLand() {
    play("land", timePerFrame: 0.08, looping: false)
  }

  func playCrouch() {
    play("crouch", timePerFrame: 0.10, looping: false)
  }

  private func play(_ prefix: String, timePerFrame: TimeInterval, looping: Bool) {
    guard currentAnimName != prefix else { return }
    let textures = atlas.textures(prefix: prefix)
    guard !textures.isEmpty else { return }
    textures.forEach { $0.filteringMode = .nearest }

    removeAction(forKey: animKey)
    currentAnimName = prefix

    let animate = SKAction.animate(with: textures, timePerFrame: timePerFrame, resize: false, restore: false)
    if looping {
      run(.repeatForever(animate), withKey: animKey)
    } else {
      run(animate, withKey: animKey)
    }
  }
}
