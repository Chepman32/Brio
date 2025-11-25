import XCTest

@MainActor
final class BrioUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app = XCUIApplication()
        setupSnapshot(app)
        app.launchArguments += ["-ui_testing"]
        app.launch()
        handleSystemAlerts()
        waitForMainInterface()
    }

    func testTakeScreenshots() {
        snapshot("01-today")
        navigateToTab(index: 1)
        snapshot("02-planner")
        navigateToTab(index: 2)
        snapshot("03-achievements")
        navigateToTab(index: 3)
        snapshot("04-settings")
    }

    private func navigateToTab(index: Int) {
        let tabBarsQuery = app.tabBars
        guard tabBarsQuery.buttons.count > index else { return }
        let button = tabBarsQuery.buttons.element(boundBy: index)
        if button.waitForExistence(timeout: 5) {
            button.tap()
        }
    }

    private func waitForMainInterface() {
        _ = app.wait(for: .runningForeground, timeout: 10)
        _ = app.tabBars.buttons.element(boundBy: 0).waitForExistence(timeout: 10)
    }

    private func handleSystemAlerts() {
        addUIInterruptionMonitor(withDescription: "System Alerts") { alert in
            let allowButtons = ["Allow", "Разрешить"]
            let denyButtons = ["Don’t Allow", "Don't Allow", "Запретить", "Не разрешать"]
            for title in allowButtons where alert.buttons[title].exists {
                alert.buttons[title].tap()
                return true
            }
            for title in denyButtons where alert.buttons[title].exists {
                alert.buttons[title].tap()
                return true
            }
            return false
        }

        // Trigger the interruption handler if the alert is already shown.
        app.tap()
    }
}
