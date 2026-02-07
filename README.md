# Capital K9: Career Royale 🐶💰

A 15KB Financial Battle Royale Game where you play as a dog navigating the ruthless world of careers, investments, and expenses.

**Winner of TartanHacks 2026?** (Or built for it!) - *Fits in < 15KB!*

## 🎮 How to Play

1.  **Select Your Dog:** Choose between Scotty (Safe), Husky (Risky), Golden (Compound interest), or Shiba (Emergency fund focus).
2.  **Choose Your Path:** Pick a career: **Tech** ⚡, **Creative** 🎨, or **Corporate** 💼.
3.  **Survive & Thrive:**
    *   **Click/Hold to Fly:** Avoid obstacles (debt traps, taxes, unexpected expenses).
    *   **Collect Coins:** Increase your net worth.
    *   **Dilemmas:** Make life choices (Cards) that affect your Income, Defense, and Passive Income.
    *   **Shop:** Buy health items (Apples, Gym Pass, Therapy) to stay alive.
    *   **Skill Tree:** Unlock career skills to boost your stats.
4.  **Battle Royale:** Outlast 99 other bot dogs on the leaderboard. Don't go bankrupt!

## 🛠️ Tech Stack

*   **Engine:** Custom Vanilla JS Game Engine (Canvas API).
*   **Audio:** Procedurally generated music and SFX using Web Audio API (No separate audio files!).
*   **Build System:** Custom Node.js builder using:
    *   `terser` (JS Minification)
    *   `html-minifier-terser` (HTML Minification)
    *   `roadroller` (JS Packing/Compression)
    *   `tar-stream` & `zlib` (Brotli compression for final 15KB target)

## 🚀 Installation & Build

1.  **Install Dependencies:**
    ```sh
    npm install
    ```

2.  **Develop (Live Reload):**
    ```sh
    npm run dev
    ```

3.  **Build (Production):**
    ```sh
    npm run build
    ```
    This will generate:
    *   `dist/index.html` (Minified game)
    *   `script/index.tar.br` (Brotli compressed archive subject to size limit)

## 🎨 Visuals & Audio

*   **Dynamic Skybox:** Day/night cycle with procedurally drawn stars and aurora.
*   **Procedural City:** Randomly generated skyline.
*   **Audio:** All sound effects and music are synthesized in real-time to save space.

## 👥 Authors

*   aayush
*   brian
*   dhruv
*   (and brian again according to package.json)
