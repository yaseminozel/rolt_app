import AppIntents
import SwiftUI
import WidgetKit

/// "Sürüş kaydet" in Control Center and on the Lock Screen: opens ROLT on the Kaydet sheet,
/// where a ride in progress is shown or a new one starts with "Başlat".
struct RecordRideControl: ControlWidget {
  static let kind = "com.roltapp.rolt.controls.record"

  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: Self.kind) {
      ControlWidgetButton(action: OpenRecordRideIntent()) {
        // The Kaydet tab's gauge, as an SF Symbol (controls only take SF Symbols).
        Label("control.record.label", systemImage: "gauge.with.dots.needle.67percent")
      }
    }
    .displayName("control.record.name")
    .description("control.record.description")
  }
}
