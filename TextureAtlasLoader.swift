import Foundation
import SpriteKit

final class TextureAtlasLoader {
  enum LoaderError: Error {
    case missingJSON(String)
    case invalidJSON(String)
    case missingFrame(String)
    case rotatedFrameUnsupported(String)
  }

  struct Frame: Decodable {
    struct Rect: Decodable {
      let x: CGFloat
      let y: CGFloat
      let w: CGFloat
      let h: CGFloat
    }

    struct SourceSize: Decodable {
      let w: CGFloat
      let h: CGFloat
    }

    let frame: Rect
    let rotated: Bool
    let trimmed: Bool
    let sourceSize: SourceSize
  }

  private struct AtlasFile: Decodable {
    struct Meta: Decodable {
      struct Size: Decodable {
        let w: CGFloat
        let h: CGFloat
      }

      let size: Size
      let image: String
    }

    let frames: [String: Frame]
    let meta: Meta
  }

  private let atlasTexture: SKTexture
  private let atlasSize: CGSize
  private let frames: [String: Frame]
  private var textureCache: [String: SKTexture] = [:]

  let referenceSize: CGSize

  init(
    imageName: String = "cat",
    jsonName: String = "cat",
    bundle: Bundle = .main
  ) throws {
    let imageBase = TextureAtlasLoader.basename(imageName)
    let jsonBase = TextureAtlasLoader.basename(jsonName)

    atlasTexture = SKTexture(imageNamed: imageBase)
    atlasTexture.filteringMode = .nearest

    guard let jsonURL = bundle.url(forResource: jsonBase, withExtension: "json") else {
      throw LoaderError.missingJSON("\(jsonBase).json")
    }

    let data = try Data(contentsOf: jsonURL)
    let atlas: AtlasFile
    do {
      atlas = try JSONDecoder().decode(AtlasFile.self, from: data)
    } catch {
      throw LoaderError.invalidJSON(error.localizedDescription)
    }

    frames = atlas.frames
    atlasSize = CGSize(width: atlas.meta.size.w, height: atlas.meta.size.h)
    referenceSize = frames.values.reduce(CGSize(width: 0, height: 0)) { current, next in
      CGSize(
        width: max(current.width, next.sourceSize.w),
        height: max(current.height, next.sourceSize.h)
      )
    }
  }

  func texture(named: String) -> SKTexture {
    if let cached = textureCache[named] { return cached }
    guard let frame = frames[named] else {
      preconditionFailure("TextureAtlasLoader missing frame named '\(named)'")
    }
    if frame.rotated {
      preconditionFailure("Rotated frame '\(named)' is not supported")
    }

    let rect = normalizedRect(from: frame.frame)
    let texture = SKTexture(rect: rect, in: atlasTexture)
    texture.filteringMode = .nearest
    textureCache[named] = texture
    return texture
  }

  func textures(prefix: String) -> [SKTexture] {
    let names = frameNames(prefix: prefix)
    return names.map { texture(named: $0) }
  }

  func frameNames(prefix: String) -> [String] {
    let matched = frames.keys.filter {
      $0 == prefix || $0.hasPrefix(prefix + "_")
    }

    return matched.sorted {
      let a = TextureAtlasLoader.numericSuffix(of: $0)
      let b = TextureAtlasLoader.numericSuffix(of: $1)
      if a != b { return a < b }
      return $0 < $1
    }
  }

  private func normalizedRect(from px: Frame.Rect) -> CGRect {
    // TexturePacker JSON uses top-left origin.
    // SpriteKit's normalized rect uses bottom-left origin.
    let yFlipped = atlasSize.height - px.y - px.h
    return CGRect(
      x: px.x / atlasSize.width,
      y: yFlipped / atlasSize.height,
      width: px.w / atlasSize.width,
      height: px.h / atlasSize.height
    )
  }

  private static func numericSuffix(of name: String) -> Int {
    guard let last = name.split(separator: "_").last else { return Int.max }
    return Int(last) ?? Int.max
  }

  private static func basename(_ name: String) -> String {
    (name as NSString).deletingPathExtension
  }
}
