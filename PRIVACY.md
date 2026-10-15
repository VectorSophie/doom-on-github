# Privacy Policy for Doom Contribution Graph

**Last Updated**: February 6, 2026

## 1. Overview
The **Doom Contribution Graph** extension is designed to run the Doom engine locally on your GitHub profile page. Privacy is a core principle of this project, and the extension is built to operate with zero data collection.

## 2. Data Collection
This extension:
- **Does NOT** collect or store any personally identifiable information (PII).
- **Does NOT** track your browsing history or website usage.
- **Does NOT** use any tracking cookies or analytics scripts.
- **Does NOT** communicate with any external servers or APIs.

## 3. Input Handling
When "Doom" mode is activated by the user:
- The extension intercepts specific keyboard inputs (Arrow keys, Space, Ctrl, Enter, W, A, S, D) to provide game controls.
- These inputs are processed entirely within the local memory of your browser (using WebAssembly and Web Workers).
- Keystrokes are never logged, saved, or transmitted.

## 4. Local Execution
All game logic and rendering are performed locally on your device using WebAssembly. The game assets (WAD files) are bundled within the extension and are never downloaded from or uploaded to third-party sources during execution.

## 5. Third-Party Access
Since no data is collected, no data is sold, traded, or transferred to any third parties.

## 6. Contact
If you have any questions about this Privacy Policy or the security of the extension, please open an issue on the official GitHub repository.
