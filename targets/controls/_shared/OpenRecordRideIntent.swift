import AppIntents
import Foundation

/// Opens the app on the record sheet. Lives in `_shared` so it is compiled into the app as well:
/// an intent with `openAppWhenRun` must be in both targets to launch the app.
@available(iOS 18.0, *)
struct OpenRecordRideIntent: ControlConfigurationIntent {
  static let title = LocalizedStringResource("control.record.name", defaultValue: "Sürüş kaydet")
  static let description = IntentDescription(
    LocalizedStringResource(
      "control.record.description",
      defaultValue: "ROLT'u Kaydet ekranında açar."
    )
  )
  static let isDiscoverable = true
  static let openAppWhenRun = true

  @MainActor
  func perform() async throws -> some IntentResult & OpensIntent {
    .result(opensIntent: OpenURLIntent(URL(string: "rolt://record-ride")!))
  }
}
