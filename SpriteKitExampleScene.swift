import SpriteKit

final class SpriteKitExampleScene: SKScene {
  private var cat: CatNode!

  override func didMove(to view: SKView) {
    view.ignoresSiblingOrder = true

    do {
      let atlas = try TextureAtlasLoader(imageName: "cat.png", jsonName: "cat.json")
      cat = CatNode(atlas: atlas)
      cat.position = CGPoint(x: size.width * 0.5, y: size.height * 0.35)
      addChild(cat)
      cat.playIdle()
    } catch {
      print("Atlas load error: \(error)")
    }
  }

  // Example input mapping.
  func onRun() { cat?.playRun() }
  func onIdle() { cat?.playIdle() }
  func onJump() { cat?.playJump() }
  func onPounce() { cat?.playPounce() }
  func onCrouch() { cat?.playCrouch() }
}
