import Cocoa
import WebKit

// Googly Seek for Mac: the online game in its own window, with native mouse capture for looking around.
let defaultURL = "https://googly-seek.onrender.com"
var gameURL: URL { URL(string: ProcessInfo.processInfo.environment["GS_URL"] ?? UserDefaults.standard.string(forKey: "serverURL") ?? defaultURL) ?? URL(string: defaultURL)! }

final class GameWebView: WKWebView {
    var captured = false
    override var acceptsFirstResponder: Bool { true }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var web: GameWebView!
    let cover = NSView()
    let status = NSTextField(labelWithString: "Tiptoeing to the giant room…")
    let retry = NSButton(title: "Try again", target: nil, action: nil)
    let setAddr = NSButton(title: "Set server address…", target: nil, action: nil)
    var dots = 0, timer: Timer?
    var monitor: Any?

    func applicationDidFinishLaunching(_ n: Notification) {
        buildMenu()
        let frame = NSRect(x: 0, y: 0, width: 1400, height: 880)
        window = NSWindow(contentRect: frame, styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView], backing: .buffered, defer: false)
        window.title = "Googly Seek"
        window.titlebarAppearsTransparent = true
        window.minSize = NSSize(width: 900, height: 600)
        window.collectionBehavior = [.fullScreenPrimary]
        window.backgroundColor = NSColor(srgbRed: 0.1, green: 0.06, blue: 0.19, alpha: 1)
        window.center()

        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()                 // keeps your name, coins, skins and pets between launches
        cfg.mediaTypesRequiringUserActionForPlayback = []
        cfg.preferences.isElementFullscreenEnabled = true
        cfg.userContentController.add(self, name: "gp")
        web = GameWebView(frame: frame, configuration: cfg)
        web.navigationDelegate = self
        web.uiDelegate = self
        web.setValue(false, forKey: "drawsBackground")
        web.autoresizingMask = [.width, .height]
        let root = NSView(frame: frame)
        root.wantsLayer = true
        root.layer?.backgroundColor = window.backgroundColor.cgColor
        root.addSubview(web)
        cover.frame = frame
        cover.autoresizingMask = [.width, .height]
        cover.wantsLayer = true
        cover.layer?.backgroundColor = window.backgroundColor.cgColor
        let title = NSTextField(labelWithString: "GOOGLY SEEK")
        title.font = NSFont(name: "Futura-CondensedExtraBold", size: 76) ?? .boldSystemFont(ofSize: 64)
        title.textColor = NSColor(srgbRed: 0.69, green: 0.47, blue: 1.0, alpha: 1)
        status.font = .systemFont(ofSize: 20, weight: .semibold)
        status.textColor = .white
        retry.target = self; retry.action = #selector(load); retry.isHidden = true; retry.bezelStyle = .rounded
        setAddr.target = self; setAddr.action = #selector(askAddress); setAddr.isHidden = true; setAddr.bezelStyle = .rounded
        status.alignment = .center; status.maximumNumberOfLines = 3
        for v in [title, status, retry, setAddr] as [NSView] { v.translatesAutoresizingMaskIntoConstraints = false; cover.addSubview(v) }
        NSLayoutConstraint.activate([
            title.centerXAnchor.constraint(equalTo: cover.centerXAnchor), title.centerYAnchor.constraint(equalTo: cover.centerYAnchor, constant: -40),
            status.centerXAnchor.constraint(equalTo: cover.centerXAnchor), status.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 18),
            retry.centerXAnchor.constraint(equalTo: cover.centerXAnchor), retry.topAnchor.constraint(equalTo: status.bottomAnchor, constant: 16),
            setAddr.centerXAnchor.constraint(equalTo: cover.centerXAnchor), setAddr.topAnchor.constraint(equalTo: retry.bottomAnchor, constant: 10),
        ])
        root.addSubview(cover)
        window.contentView = root
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        NotificationCenter.default.addObserver(forName: NSWindow.didResignKeyNotification, object: window, queue: .main) { [weak self] _ in self?.release(tellPage: true) }
        load()
        if !CommandLine.arguments.contains("--windowed") { window.toggleFullScreen(nil) }
    }

    @objc func load() {
        retry.isHidden = true; setAddr.isHidden = true
        cover.isHidden = false
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            self.dots = (self.dots + 1) % 4
            self.status.stringValue = "Tiptoeing to the giant room" + String(repeating: ".", count: self.dots) + "  (the server can take ~30 seconds to wake up)"
        }
        var req = URLRequest(url: gameURL)
        req.timeoutInterval = 90
        web.load(req)
    }

    // ---------------------------------------------------------------- mouse capture for looking around
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let s = message.body as? String else { return }
        if s == "lock" { capture() } else if s == "unlock" { release(tellPage: false) }
    }
    func capture() {
        guard !web.captured else { return }
        web.captured = true
        window.makeFirstResponder(web)
        // park the cursor in the middle of the window and freeze it there
        if let screen = window.screen {
            let f = window.frame, mid = NSPoint(x: f.midX, y: f.midY)
            CGWarpMouseCursorPosition(CGPoint(x: mid.x, y: screen.frame.maxY - mid.y))
        }
        CGAssociateMouseAndMouseCursorPosition(0)
        NSCursor.hide()
        monitor = NSEvent.addLocalMonitorForEvents(matching: [.mouseMoved, .leftMouseDragged, .rightMouseDragged, .otherMouseDragged, .leftMouseDown, .leftMouseUp, .rightMouseDown, .rightMouseUp]) { [weak self] e in
            guard let self = self, self.web.captured else { return e }
            switch e.type {
            case .mouseMoved, .leftMouseDragged, .rightMouseDragged, .otherMouseDragged:
                if e.deltaX != 0 || e.deltaY != 0 { self.web.evaluateJavaScript("window.__look&&__look(\(e.deltaX),\(e.deltaY))") }
                return e
            case .leftMouseDown: self.web.evaluateJavaScript("window.__mouse&&__mouse(0,true)"); return nil
            case .leftMouseUp: self.web.evaluateJavaScript("window.__mouse&&__mouse(0,false)"); return nil
            case .rightMouseDown: self.web.evaluateJavaScript("window.__mouse&&__mouse(2,true)"); return nil
            case .rightMouseUp: self.web.evaluateJavaScript("window.__mouse&&__mouse(2,false)"); return nil
            default: return e
            }
        }
    }
    func release(tellPage: Bool) {
        guard web.captured else { return }
        web.captured = false
        if let m = monitor { NSEvent.removeMonitor(m); monitor = nil }
        CGAssociateMouseAndMouseCursorPosition(1)
        NSCursor.unhide()
        if tellPage { web.evaluateJavaScript("window.__unlocked&&__unlocked()") }
    }

    // ---------------------------------------------------------------- page loading
    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        if navigationResponse.isForMainFrame, let r = navigationResponse.response as? HTTPURLResponse, r.statusCode >= 400 {
            decisionHandler(.cancel)
            timer?.invalidate()
            cover.isHidden = false
            status.stringValue = r.statusCode == 404
                ? "No game server at \(gameURL.host ?? "that address") yet.\nDeploy it on Render first, or set the address Render gave you."
                : "The server answered with an error (\(r.statusCode)). It may still be starting — try again in a minute."
            retry.isHidden = false; setAddr.isHidden = false
            return
        }
        decisionHandler(.allow)
    }
    @objc func askAddress() {
        let a = NSAlert(); a.messageText = "Game server address"; a.informativeText = "Paste the address from your Render dashboard (like https://googly-seek-xxxx.onrender.com):"
        let f = NSTextField(frame: NSRect(x: 0, y: 0, width: 380, height: 24)); f.stringValue = gameURL.absoluteString; a.accessoryView = f
        a.addButton(withTitle: "Save"); a.addButton(withTitle: "Cancel"); a.addButton(withTitle: "Reset to default")
        a.window.initialFirstResponder = f
        let res = a.runModal()
        if res == .alertFirstButtonReturn {
            var t = f.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
            if !t.hasPrefix("http") { t = "https://" + t }
            if let u = URL(string: t), u.host != nil { UserDefaults.standard.set(u.absoluteString.hasSuffix("/") ? String(u.absoluteString.dropLast()) : u.absoluteString, forKey: "serverURL") }
            load()
        } else if res == .alertThirdButtonReturn { UserDefaults.standard.removeObject(forKey: "serverURL"); load() }
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        timer?.invalidate()
        NSAnimationContext.runAnimationGroup { $0.duration = 0.4; cover.animator().alphaValue = 0 } completionHandler: { self.cover.isHidden = true; self.cover.alphaValue = 1 }
        window.makeFirstResponder(web)
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { failed() }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { failed() }
    private func failed() {
        timer?.invalidate()
        cover.isHidden = false
        status.stringValue = "Can't reach the Googly Seek server at \(gameURL.host ?? "?") — check your internet connection."
        retry.isHidden = false; setAddr.isHidden = false
    }
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        release(tellPage: false)
        let a = NSAlert(); a.messageText = message; a.runModal(); completionHandler()
    }
    // invite links: the page asks via prompt(); copy it for the player
    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        release(tellPage: false)
        NSPasteboard.general.clearContents(); NSPasteboard.general.setString(defaultText ?? "", forType: .string)
        let a = NSAlert(); a.messageText = prompt; a.informativeText = "\(defaultText ?? "")\n\n(Copied to your clipboard.)"; a.runModal(); completionHandler(defaultText)
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let u = action.request.url { NSWorkspace.shared.open(u) }
        return nil
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ n: Notification) { release(tellPage: false) }

    @objc func joinLobby() {
        release(tellPage: true)
        let a = NSAlert(); a.messageText = "Join a lobby"; a.informativeText = "Type the 4-letter lobby code your friend sent you:"
        let f = NSTextField(frame: NSRect(x: 0, y: 0, width: 200, height: 24)); a.accessoryView = f
        a.addButton(withTitle: "Join"); a.addButton(withTitle: "Cancel")
        a.window.initialFirstResponder = f
        if a.runModal() == .alertFirstButtonReturn {
            let code = f.stringValue.uppercased().filter { $0.isLetter }.prefix(4)
            if code.count == 4, var c = URLComponents(url: gameURL, resolvingAgainstBaseURL: false) { c.queryItems = [URLQueryItem(name: "room", value: String(code))]; if let u = c.url { web.load(URLRequest(url: u)) } }
        }
    }

    private func buildMenu() {
        let main = NSMenu()
        let appItem = NSMenuItem(); main.addItem(appItem)
        let m = NSMenu()
        m.addItem(withTitle: "About Googly Seek", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        m.addItem(.separator())
        m.addItem(withTitle: "Join Lobby by Code…", action: #selector(joinLobby), keyEquivalent: "j").target = self
        m.addItem(withTitle: "Reload", action: #selector(load), keyEquivalent: "r").target = self
        m.addItem(withTitle: "Server Address…", action: #selector(askAddress), keyEquivalent: "").target = self
        m.addItem(.separator())
        m.addItem(withTitle: "Hide Googly Seek", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        m.addItem(withTitle: "Quit Googly Seek", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = m
        let editItem = NSMenuItem(); main.addItem(editItem)
        let e = NSMenu(title: "Edit")   // so ⌘C / ⌘V work in the name, code and chat boxes
        e.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        e.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        e.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        e.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = e
        let viewItem = NSMenuItem(); main.addItem(viewItem)
        let v = NSMenu(title: "View")
        v.addItem(NSMenuItem(title: "Toggle Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f"))
        viewItem.submenu = v
        NSApp.mainMenu = main
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
