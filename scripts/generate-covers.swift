import AppKit

struct BookCoverConfig {
    let id: String
    let title: String
    let subtitle: String
    let author: String
    let genre: String
    let c1: (CGFloat, CGFloat, CGFloat)
    let c2: (CGFloat, CGFloat, CGFloat)
    let accent: (CGFloat, CGFloat, CGFloat)
}

let books: [BookCoverConfig] = [
    BookCoverConfig(
        id: "b0000000-0000-0000-0000-000000000001",
        title: "The Time Machine",
        subtitle: "An Invention",
        author: "H. G. Wells",
        genre: "SCIENCE FICTION",
        c1: (0.08, 0.12, 0.28),
        c2: (0.02, 0.04, 0.10),
        accent: (0.85, 0.65, 0.25)
    ),
    BookCoverConfig(
        id: "b0000000-0000-0000-0000-000000000002",
        title: "Sherlock Holmes",
        subtitle: "The Adventures",
        author: "Sir Arthur Conan Doyle",
        genre: "MYSTERY & DETECTIVE",
        c1: (0.04, 0.18, 0.14),
        c2: (0.01, 0.06, 0.05),
        accent: (0.30, 0.85, 0.65)
    ),
    BookCoverConfig(
        id: "b0000000-0000-0000-0000-000000000003",
        title: "Frankenstein",
        subtitle: "The Modern Prometheus",
        author: "Mary Wollstonecraft Shelley",
        genre: "GOTHIC CLASSIC",
        c1: (0.16, 0.08, 0.24),
        c2: (0.04, 0.02, 0.08),
        accent: (0.45, 0.75, 0.95)
    ),
    BookCoverConfig(
        id: "b0000000-0000-0000-0000-000000000004",
        title: "The Art of War",
        subtitle: "The Definitive Translation",
        author: "Sun Tzu",
        genre: "PHILOSOPHY & STRATEGY",
        c1: (0.28, 0.06, 0.08),
        c2: (0.10, 0.02, 0.03),
        accent: (0.95, 0.78, 0.35)
    )
]

let outputDir = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "/tmp"

for book in books {
    let size = NSSize(width: 800, height: 800)
    let image = NSImage(size: size)
    image.lockFocus()

    // 1. Background gradient
    let bg = NSGradient(
        starting: NSColor(red: book.c1.0, green: book.c1.1, blue: book.c1.2, alpha: 1.0),
        ending: NSColor(red: book.c2.0, green: book.c2.1, blue: book.c2.2, alpha: 1.0)
    )
    bg?.draw(in: NSRect(origin: .zero, size: size), angle: -55)

    // 2. Liquid Glass subtle grid / concentric circles
    let context = NSGraphicsContext.current?.cgContext
    context?.saveGState()
    context?.setStrokeColor(NSColor(red: book.accent.0, green: book.accent.1, blue: book.accent.2, alpha: 0.15).cgColor)
    context?.setLineWidth(2)
    context?.strokeEllipse(in: CGRect(x: 100, y: 100, width: 600, height: 600))
    context?.strokeEllipse(in: CGRect(x: 200, y: 200, width: 400, height: 400))
    context?.strokeEllipse(in: CGRect(x: 300, y: 300, width: 200, height: 200))

    // Inner subtle border
    let innerFrame = NSRect(x: 40, y: 40, width: 720, height: 720)
    let borderPath = NSBezierPath(roundedRect: innerFrame, xRadius: 24, yRadius: 24)
    borderPath.lineWidth = 1.5
    NSColor(red: book.accent.0, green: book.accent.1, blue: book.accent.2, alpha: 0.25).setStroke()
    borderPath.stroke()

    // 3. Genre Badge
    let badgeText = book.genre as NSString
    let badgeStyle = NSMutableParagraphStyle()
    badgeStyle.alignment = .center
    let badgeAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 14, weight: .bold),
        .foregroundColor: NSColor(red: book.accent.0, green: book.accent.1, blue: book.accent.2, alpha: 0.9),
        .paragraphStyle: badgeStyle,
        .kern: 3.0
    ]
    badgeText.draw(in: NSRect(x: 60, y: 670, width: 680, height: 30), withAttributes: badgeAttrs)

    // 4. Main Title
    let titleStyle = NSMutableParagraphStyle()
    titleStyle.alignment = .center
    titleStyle.lineBreakMode = .byWordWrapping
    let titleAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.boldSystemFont(ofSize: 48),
        .foregroundColor: NSColor.white,
        .paragraphStyle: titleStyle
    ]
    book.title.draw(in: NSRect(x: 80, y: 380, width: 640, height: 160), withAttributes: titleAttrs)

    // 5. Subtitle
    let subStyle = NSMutableParagraphStyle()
    subStyle.alignment = .center
    let subAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 22, weight: .light),
        .foregroundColor: NSColor(white: 0.85, alpha: 0.9),
        .paragraphStyle: subStyle
    ]
    book.subtitle.draw(in: NSRect(x: 80, y: 340, width: 640, height: 40), withAttributes: subAttrs)

    // Divider line
    context?.setStrokeColor(NSColor(red: book.accent.0, green: book.accent.1, blue: book.accent.2, alpha: 0.4).cgColor)
    context?.setLineWidth(2)
    context?.move(to: CGPoint(x: 320, y: 310))
    context?.addLine(to: CGPoint(x: 480, y: 310))
    context?.strokePath()

    // 6. Author
    let authorStyle = NSMutableParagraphStyle()
    authorStyle.alignment = .center
    let authorAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 28, weight: .medium),
        .foregroundColor: NSColor(red: book.accent.0, green: book.accent.1, blue: book.accent.2, alpha: 1.0),
        .paragraphStyle: authorStyle,
        .kern: 1.5
    ]
    book.author.draw(in: NSRect(x: 60, y: 160, width: 680, height: 50), withAttributes: authorAttrs)

    // 7. Footer - Public Domain Classics Edition
    let footerStyle = NSMutableParagraphStyle()
    footerStyle.alignment = .center
    let footerAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 13, weight: .regular),
        .foregroundColor: NSColor(white: 0.6, alpha: 0.7),
        .paragraphStyle: footerStyle,
        .kern: 2.0
    ]
    "AUDIOBOOKPHILE • PUBLIC DOMAIN CLASSICS".draw(in: NSRect(x: 60, y: 80, width: 680, height: 25), withAttributes: footerAttrs)

    context?.restoreGState()
    image.unlockFocus()

    if let tiff = image.tiffRepresentation,
       let bitmap = NSBitmapImageRep(data: tiff),
       let jpeg = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.92]) {
        let dest = "\(outputDir)/\(book.id).jpg"
        try? jpeg.write(to: URL(fileURLWithPath: dest))
        print("Generated cover for \(book.title) -> \(dest) (\(jpeg.count) bytes)")
    }
}
