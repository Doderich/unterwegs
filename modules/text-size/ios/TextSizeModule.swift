import ExpoModulesCore
import UIKit

/// App-wide text size and bold text via scene trait overrides (iOS 17+). SwiftUI (`@expo/ui`) follows
/// them live; React Native `Text` doesn't, so JS scales that itself.
public class TextSizeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TextSize")

    /// `category`: a `UIContentSizeCategory` raw value, or nil to follow the system.
    AsyncFunction("apply") { (category: String?, bold: Bool) in
      guard #available(iOS 17.0, *) else { return }
      for case let scene as UIWindowScene in UIApplication.shared.connectedScenes {
        if let category {
          scene.traitOverrides.preferredContentSizeCategory = UIContentSizeCategory(rawValue: category)
        } else if scene.traitOverrides.contains(UITraitPreferredContentSizeCategory.self) {
          scene.traitOverrides.remove(UITraitPreferredContentSizeCategory.self)
        }
        if bold {
          scene.traitOverrides.legibilityWeight = .bold
        } else if scene.traitOverrides.contains(UITraitLegibilityWeight.self) {
          scene.traitOverrides.remove(UITraitLegibilityWeight.self)
        }
      }
    }.runOnQueue(.main)
  }
}
