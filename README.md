# Brain Trap — Virtual Fun Friday

A real-time, browser-based multiple-choice puzzle game for 15–30 people playing over Microsoft Teams. The host creates a room and shares a five-character code; players open the same website on their own devices and answer by clicking buttons. The server checks answers and keeps the leaderboard in sync.

## Included
- Host lobby and join-code flow
- Four rounds: Crack the Code, One Move Challenge, Who Stole the Friday Bonus, Decode the Picture
- Live countdowns (each question has its own duration)
- One submission per player per question
- Server-side answer validation and automatic points: 100 for correct plus up to 50 speed points
- Live leaderboard and answer explanations
- Finished-game scores saved to `data/results.json` on the server filesystem

## Run on your computer
1. Install **Node.js 18 or newer** from https://nodejs.org/.
2. Unzip this project and open a terminal in the `fun-friday-game` folder.
3. Run `npm install`.
4. Run `npm start`.
5. Open http://localhost:3000 in your browser.
6. Click **Create game room** on the host computer. Share the displayed room code with participants.
7. Participants must open the website from their own devices and enter the room code and their names.
8. Share the host browser tab/window in Microsoft Teams. Click **Start the game**, then **Reveal answer** and **Next question** as host.

### Important for remote participants
`http://localhost:3000` works only on the computer running the server. Participants in different locations cannot use your localhost address. To play across the internet, deploy the project to a Node.js host that supports persistent WebSocket connections (for example, Render or Railway), then share the public HTTPS URL. Use the host's start command `npm start`.

For a quick same-Wi-Fi test, participants may use `http://YOUR-COMPUTER-LAN-IP:3000` if the firewall allows port 3000. This is not appropriate for people joining from home.

## Deployment notes
- This app uses Socket.IO/WebSockets. Choose a host that supports them.
- Active game rooms live in server memory. Keep one server instance for a game; do not scale to multiple instances without adding a shared Socket.IO adapter and shared room state.
- Completed results are written to `data/results.json`. On cloud hosts with ephemeral filesystems, that file may reset on redeploy/restart. Attach a persistent disk or replace JSON persistence with a database if you need long-term records.
- Do not put private credentials in the frontend. This demo needs no API keys.

## Game flow
- Host creates a room and shares the code.
- Participants join during the lobby.
- Host starts the game. Each question opens with a timer.
- Participants choose one option; the server records the first answer only.
- Host reveals the answer. Correct answers receive 100 points plus up to 50 points for speed.
- Host advances to the next question. After the last question, the final leaderboard is shown.

## Editing questions
Edit the `questions` array near the top of `server.js`. Each question has `round`, `title`, `prompt`, `hint`, `options`, `answer` (zero-based option index), `explanation`, and `seconds`. Restart the server after editing.

## Limitations of this starter
- The host should keep the host browser tab open during the game. If the host disconnects, the room closes.
- Scores are persisted after a completed game, but the app does not yet have an admin page to browse historical results.
- The One Move Challenge uses a described matchstick move; if you replace it with a new matchstick puzzle, verify the exact visual and solution first.
