# Contributing to MoonTranslator

First off, thank you so much for taking the time to contribute! Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

This document is a set of guidelines for contributing to MoonTranslator. These are mostly guidelines, not hard rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## ✨ Getting Started

Before you begin, make sure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (v18 or newer)
- [`pnpm`](https://pnpm.io/installation) (for lightning-fast frontend dependencies)
- [Rust](https://rustup.rs/) (Cargo)
- The required [Tauri OS Dependencies](https://tauri.app/v1/guides/getting-started/prerequisites) (like WebView2 on Windows)

### Local Development Setup

1. Fork the Project by clicking the "Fork" button in the top right corner of this repository.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/MoonTranslator.git
   cd MoonTranslator
   ```
3. Install the dependencies:
   ```bash
   pnpm install
   ```
4. Start the development server (which spins up both Next.js and the Tauri Rust backend):
   ```bash
   pnpm tauri dev
   ```

## 🐛 Reporting Bugs & Requesting Features

If you encounter a bug or have an awesome idea for a new feature, please [open an issue](https://github.com/noxygalaxy/MoonTranslator/issues) on GitHub.

Before opening a new issue, please **check existing issues** to see if someone else has already reported it. If you do find an existing issue, feel free to add a comment or a thumbs-up reaction!

**When reporting a bug, please include:**

- Your operating system (Windows 10/11, macOS, Linux, etc.)
- Steps to reproduce the bug
- What you expected to happen vs what actually happened
- Any relevant terminal logs or error messages (if applicable)

## 🛠️ Submitting a Pull Request (PR)

Ready to write some code? Awesome! Here's the workflow:

1. **Create a Branch:**

   ```bash
   git checkout -b feature/AmazingFeature
   # or
   git checkout -b fix/BugFix
   ```

2. **Make your changes:**
   - Keep your code clean, readable, and consistent with the existing codebase (we use Material Design 3 logic for CSS, and Zustand for state).
   - If you're adding UI components or changing the Translation APIs, ensure everything is thoroughly tested on your machine.

3. **Commit your changes:**

   ```bash
   git commit -m "Add some AmazingFeature"
   ```

4. **Push to the Branch:**

   ```bash
   git push origin feature/AmazingFeature
   ```

5. **Open a Pull Request:**
   Go to your fork on GitHub and click the "Compare & pull request" button. Make sure you describe your changes clearly in the PR description so we know what to test!

## ⚖️ License Note

As a reminder, this project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.
By contributing to MoonTranslator, you agree that your contributions will be licensed under its GPL-3.0 license. This ensures this project will remain completely free and open source forever!

---

Once again, thank you for being a part of this project. Every fix, every typo correction, and every new feature makes MoonTranslator better for everyone. Happy coding! 💜
