# Contributing to ROFLFaucet

Welcome to the ROFLFaucet project! This guide outlines our development practices and standards for all ClickForCharity ecosystem projects.

## Development Philosophy

Our development approach aligns with our core philosophy: create systems that work with human nature, not against it. This extends to our technical decisions.

## Web Development Standards

### CSS & Frontend Guidelines

**These standards apply to all ClickForCharity ecosystem websites (ROFLFaucet, ClickForCharity, DirectSponsor, etc.) but NOT to external client projects.**

#### 1. Accessibility-First Development

We prioritize accessibility for several critical reasons:

- **Global Reach**: Our primary users are often in regions with poor network infrastructure and expensive data plans
- **Inclusive Design**: People using lightweight browsers, older devices, or assistive technologies should have full access
- **Mission Alignment**: We serve communities that traditional tech often overlooks

#### 2. CSS Technology Choices

**Preferred Technologies:**
- **Flexbox** over CSS Grid for layouts
- **Simple selectors** over complex nested structures
- **Progressive enhancement** over cutting-edge features
- **Semantic HTML** with minimal CSS dependencies

**Rationale:**
- Flexbox has near-universal browser support (including lightweight browsers)
- Simpler CSS = smaller files = faster loading on slow connections
- Better compatibility with assistive technologies
- Graceful degradation on older browsers

#### 3. Layout Principles

**Three-Column Layout Example:**
```css
.content-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
}

.sidebar-left {
    flex: 1;
    min-width: 250px;
}

.main-content {
    flex: 2;
    min-width: 300px;
}

.sidebar-right {
    flex: 1;
    min-width: 250px;
}

/* Mobile-first responsive */
@media (max-width: 768px) {
    .content-grid {
        flex-direction: column;
    }
}
```

**Why This Works:**
- Automatically stacks on narrow screens
- Works without JavaScript
- Compatible with screen readers
- Degrades gracefully on old browsers

#### 4. Performance Standards

**File Size Targets:**
- CSS files: < 50KB uncompressed
- Critical CSS: < 15KB inline
- No unused CSS rules in production

**Loading Strategy:**
- Critical styles inline in `<head>`
- Non-critical styles loaded asynchronously
- No external font dependencies unless essential

#### 5. Browser Compatibility

**Minimum Support:**
- All major browsers from last 3 years
- Lightweight browsers (Epiphany, WebKit-based)
- Text-only browsers (functional, if not pretty)
- Screen readers and assistive technology

**Testing Requirements:**
- Test in at least one lightweight browser
- Verify with CSS disabled
- Check with slow connection simulation

#### 6. Code Style

**CSS Organization:**
```css
/* 1. Reset/normalize */
* { box-sizing: border-box; }

/* 2. CSS custom properties */
:root {
    --primary-color: #4A90E2;
    --font-size-base: 1rem;
}

/* 3. Base elements */
body { font-family: system-ui, sans-serif; }

/* 4. Layout components */
.content-grid { display: flex; }

/* 5. UI components */
.button { padding: 1rem; }

/* 6. Utilities */
.sr-only { position: absolute; left: -10000px; }

/* 7. Media queries at end */
@media (max-width: 768px) { ... }
```

**Naming Conventions:**
- Use semantic class names: `.faucet-card` not `.blue-box`
- Prefer single-word: `.header` over `.page-header`
- Use BEM for complex components: `.card__title--featured`

**CSS Units Policy:**
- **Use relative units (`em`, `rem`) instead of pixels (`px`) for:**
  - Font sizes
  - Padding and margins
  - Element dimensions that should scale with font size
- **Use `rem` for:**
  - Consistent spacing based on root font size
  - Container dimensions
  - Global layout measurements
- **Use `em` for:**
  - Component-specific spacing that should scale with local font size
  - Nested elements that need proportional sizing
- **Acceptable `px` usage:**
  - Border widths (1px, 2px)
  - Small decorative elements
  - Media queries breakpoints
  - Fixed-size icons

**Rationale:**
- Respects user font size preferences (critical for accessibility)
- Better scaling on different devices and zoom levels
- Supports users with visual impairments who need larger text
- More predictable responsive behavior

**Example:**
```css
/* ✅ Good - uses relative units */
.button {
    padding: 1rem 2rem;
    font-size: 1.1rem;
    margin-bottom: 1.5rem;
    border: 2px solid var(--primary-color); /* px acceptable for borders */
}

/* ❌ Avoid - fixed pixel sizes */
.button {
    padding: 16px 32px;
    font-size: 18px;
    margin-bottom: 24px;
}
```

## Content Philosophy: Function Over Flash

### The Burger Principle

When you're selling uninspiring products (like generic fast food), you need flashy presentation to hide the lack of substance. But when you have something genuinely valuable to offer, your job is different:

**Our Approach:**
- **Enable, don't distract**: Help users efficiently access the real value
- **Function over flash**: Users get pleasure from the product itself, not the packaging
- **Accessible presentation**: Remove barriers rather than add decoration
- **Efficient interaction**: Minimize friction between user and value

**In Practice:**
- Clean, readable typography over fancy fonts
- Fast loading over impressive animations
- Clear navigation over creative layouts
- Accessible forms over stylized interactions

### Target User Experience

**Primary Users:**
- People in regions with limited internet infrastructure
- Users on older devices or slower connections
- Communities where data costs are significant
- Anyone who values function over form

**Design Implications:**
- Every byte counts - no wasted resources
- Functionality must work on basic browsers
- Clear, simple interfaces reduce cognitive load
- Fast, reliable performance builds trust

## Development Workflow

### 1. Setup
```bash
git clone [repository]
cd roflfaucet
# No build process required - vanilla HTML/CSS/JS
```

### 2. Testing
- Test in multiple browsers including lightweight ones
- Verify mobile responsiveness
- Check with slow connection simulation
- Validate HTML and CSS

### 3. Code Review
- All changes reviewed for accessibility
- CSS checked for unnecessary complexity
- Performance impact evaluated
- Browser compatibility verified

## File Structure

```
/
├── index.html              # Main page
├── styles.css              # Primary stylesheet
├── script.js               # Core functionality
├── oauth-client.js         # Authentication
├── docs/                   # Documentation
└── README.md              # Project overview
```

## Security Guidelines

- No inline JavaScript in production
- CSP headers properly configured
- All external resources served over HTTPS
- User input properly sanitized

## Performance Monitoring

**Key Metrics:**
- Time to First Contentful Paint < 2s
- Largest Contentful Paint < 3s
- Cumulative Layout Shift < 0.1
- First Input Delay < 100ms

## Getting Help

- Check existing documentation first
- Test in multiple browsers before reporting issues
- Include browser/device info in bug reports
- Suggest improvements aligned with our philosophy

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue for any questions about these guidelines or the project in general.

