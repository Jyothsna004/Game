const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const RESULTS_FILE = path.join(DATA_DIR, 'results.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(RESULTS_FILE)) fs.writeFileSync(RESULTS_FILE, '[]');
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ ok: true }));

const questions = [
  { round: 'Crack the Code', type: 'code', title: 'The Number Lock', prompt: 'Decode the word: 19 – 1 – 22 – 5', hint: 'A = 1, B = 2, C = 3 … Z = 26.', options: ['SAVE', 'SAFE', 'SAME', 'CAVE'], answer: 0, explanation: '19=S, 1=A, 22=V, 5=E. The word is SAVE.', seconds: 30 },
  { round: 'Crack the Code', type: 'code', title: 'One-Step Shift', prompt: 'Decode: UIF DBU', hint: 'Every letter was shifted one step forward. Move each letter back one step.', options: ['THE CAT', 'THE CAR', 'SHE CAT', 'THE CAP'], answer: 0, explanation: 'U→T, I→H, F→E; D→C, B→A, U→T. It reads THE CAT.', seconds: 30 },
  { round: 'Crack the Code', type: 'code', title: 'The Secret Instruction', prompt: 'Decode: 19 – 8 – 15 – 23 / 13 – 5', hint: 'A = 1, B = 2 … Z = 26.', options: ['SHOW ME', 'SAVE ME', 'SLOW ME', 'SHOW IT'], answer: 0, explanation: '19=S, 8=H, 15=O, 23=W; 13=M, 5=E. It says SHOW ME.', seconds: 30 },
  { round: 'One Move Challenge', type: 'move', title: 'Fix It in One Move', prompt: 'A matchstick equation is wrong: 6 + 4 = 4. Which single move makes it correct?', hint: 'Imagine standard matchstick-style digits and a plus sign made from two sticks.', options: ['Move the vertical stick from + onto the 6 to make 8 − 4 = 4', 'Move one stick from the first 4 to make 6 + 1 = 4', 'Move one stick from the 6 to make 5 + 4 = 4', 'Move one stick from = to make 6 + 4 ≠ 4'], answer: 0, explanation: 'Move the vertical match from + to the 6. The plus becomes minus and 6 becomes 8: 8 − 4 = 4.', seconds: 35 },
  { round: 'Who Stole the Friday Bonus?', type: 'mystery', title: 'The Missing Envelope', prompt: 'Four suspects speak. Asha: “Ravi took it.” Ravi: “Neha took it.” Neha: “I didn’t take it.” Vikram: “Ravi is lying.” Exactly ONE statement is false. Who took the envelope?', hint: 'Test each suspect. The statements must contain exactly one lie.', options: ['Asha', 'Ravi', 'Neha', 'Vikram'], answer: 1, explanation: 'Ravi took it: Asha is truthful, Ravi is lying, Neha is truthful, and Vikram is truthful. Exactly one statement is false.', seconds: 45 },
  { round: 'Who Stole the Friday Bonus?', type: 'mystery', title: 'The Three Lockers', prompt: 'One envelope is in locker A, B, or C. A says: “It is not in A.” B says: “It is in A.” C says: “It is not in B.” Exactly ONE statement is true. Where is the envelope?', hint: 'Try A, B, and C and count how many statements become true.', options: ['Locker A', 'Locker B', 'Locker C', 'Impossible to know'], answer: 1, explanation: 'If it is in B, A’s statement is true; B’s is false; C’s is false. Exactly one statement is true.', seconds: 45 },
  { round: 'Who Stole the Friday Bonus?', type: 'mystery', title: 'The Alibi Puzzle', prompt: 'Maya says “Arun took it.” Arun says “I did not take it.” Priya says “Maya is lying.” Exactly ONE person is telling the truth. Who took the envelope?', hint: 'Check the truth of all three statements for each possible suspect.', options: ['Maya', 'Arun', 'Priya', 'Not enough information'], answer: 1, explanation: 'If Arun took it, Maya is truthful, Arun is lying, and Priya is lying. Exactly one person tells the truth.', seconds: 45 },
  { round: 'Decode the Picture', type: 'picture', title: 'Picture Phrase #1', prompt: 'Read the word layout:\n\nHEAD\nHEELS', hint: 'The position of the words is part of the clue.', options: ['Head over heels', 'Keep your head up', 'Heel of the story', 'From head to toe'], answer: 0, explanation: 'HEAD is placed over HEELS: “head over heels.”', seconds: 25 },
  { round: 'Decode the Picture', type: 'picture', title: 'Picture Phrase #2', prompt: 'Read the repeated word:\n\nCYCLE  CYCLE  CYCLE', hint: 'Look at how many times the word CYCLE appears.', options: ['Bicycle', 'Tricycle', 'Recycle', 'Cycle path'], answer: 1, explanation: 'Three cycles make a tricycle.', seconds: 25 },
  { round: 'Decode the Picture', type: 'picture', title: 'Picture Phrase #3', prompt: 'Read the layout:\n\nMIND\n────────\nMATTER', hint: 'What familiar phrase connects these two words?', options: ['Mind your business', 'Matter of time', 'Mind over matter', 'State of mind'], answer: 2, explanation: 'MIND appears over MATTER: “mind over matter.”', seconds: 25 },
  { round: 'Decode the Picture', type: 'picture', title: 'Picture Phrase #4', prompt: 'Read the layout:\n\nMAN\nBOARD', hint: 'Imagine the MAN is literally above the BOARD.', options: ['Board meeting', 'Man overboard', 'Board member', 'Man on a mission'], answer: 1, explanation: 'MAN over BOARD gives “man overboard.”', seconds: 25 }
];

const rooms = new Map();
const timers = new Map();
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function roomCode() { let code = ''; do { code = Array.from({length:5}, () => alphabet[crypto.randomInt(alphabet.length)]).join(''); } while (rooms.has(code)); return code; }
function safeName(value) { return String(value || '').trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, 24); }
function publicQuestion(q) { return { round: q.round, type: q.type, title: q.title, prompt: q.prompt, hint: q.hint, options: q.options, seconds: q.seconds }; }
function leaderboard(room) { return [...room.players.values()].map(p => ({ id: p.id, name: p.name, score: p.score, answered: Boolean(p.answer) })).sort((a,b) => b.score-a.score || a.name.localeCompare(b.name)); }
function snapshot(room, includeAnswer = false) {
  const q = room.questions[room.questionIndex];
  return { code: room.code, status: room.status, hostName: room.hostName, players: [...room.players.values()].map(p => ({id:p.id,name:p.name,score:p.score})), leaderboard: leaderboard(room), questionIndex: room.questionIndex, totalQuestions: room.questions.length, question: q ? publicQuestion(q) : null, deadline: room.deadline || null, answeredCount: q ? [...room.players.values()].filter(p => p.answer).length : 0, answer: includeAnswer && q ? q.answer : null, explanation: includeAnswer && q ? q.explanation : null };
}
function broadcast(room, event = 'state') { io.to(room.code).emit(event, snapshot(room, room.status === 'revealed' || room.status === 'finished')); }
function clearRoomTimer(code) { const t = timers.get(code); if (t) clearTimeout(t); timers.delete(code); }
function persistResult(room) {
  const record = { code: room.code, finishedAt: new Date().toISOString(), hostName: room.hostName, questions: room.questions.length, leaderboard: leaderboard(room) };
  try { const all = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8')); all.push(record); fs.writeFileSync(RESULTS_FILE, JSON.stringify(all.slice(-100), null, 2)); } catch (err) { console.error('Could not save results:', err.message); }
}
function reveal(room) { clearRoomTimer(room.code); if (room.status !== 'question') return; room.status = 'revealed'; const q = room.questions[room.questionIndex]; for (const p of room.players.values()) { if (p.answer && p.answer.index === q.answer && !p.answer.scored) { const elapsed = Math.max(0, (Date.now() - p.answer.at) / 1000); const speedBonus = Math.max(0, Math.ceil((q.seconds - elapsed) / q.seconds * 50)); p.score += 100 + speedBonus; p.answer.scored = true; p.lastPoints = 100 + speedBonus; } else { p.lastPoints = 0; } } broadcast(room); }
function startQuestion(room, index) {
  clearRoomTimer(room.code);
  if (index >= room.questions.length) { room.status = 'finished'; room.questionIndex = room.questions.length; room.deadline = null; persistResult(room); broadcast(room); return; }
  room.questionIndex = index; room.status = 'question'; room.deadline = Date.now() + room.questions[index].seconds * 1000;
  for (const p of room.players.values()) { p.answer = null; p.lastPoints = 0; }
  broadcast(room);
  timers.set(room.code, setTimeout(() => { if (room.status === 'question') reveal(room); }, room.questions[index].seconds * 1000));
}
function emitError(socket, message) { socket.emit('notice', { type: 'error', message }); }

io.on('connection', socket => {
  socket.on('host:create', ({ hostName } = {}) => {
    const name = safeName(hostName) || 'Fun Friday Host'; const code = roomCode();
    const room = { code, hostId: socket.id, hostName: name, players: new Map(), status: 'lobby', questionIndex: -1, questions: questions.map(q => ({...q})), deadline: null, createdAt: Date.now() };
    rooms.set(code, room); socket.join(code); socket.data.role = 'host'; socket.data.roomCode = code;
    socket.emit('host:created', { code, state: snapshot(room) });
  });
  socket.on('player:join', ({ code, name } = {}) => {
    code = String(code || '').trim().toUpperCase(); name = safeName(name);
    const room = rooms.get(code);
    if (!room) return emitError(socket, 'Room code not found. Check the code with your host.');
    if (room.status !== 'lobby') return emitError(socket, 'This game has already started. Ask your host to create a new room.');
    if (!name) return emitError(socket, 'Please enter your name.');
    if (room.players.size >= 30) return emitError(socket, 'This room is full (maximum 30 players).');
    if ([...room.players.values()].some(p => p.name.toLowerCase() === name.toLowerCase())) return emitError(socket, 'That name is already in use. Add an initial or team name.');
    room.players.set(socket.id, { id: socket.id, name, score: 0, answer: null, lastPoints: 0 }); socket.join(code); socket.data.role = 'player'; socket.data.roomCode = code;
    socket.emit('player:joined', { code, name, state: snapshot(room) }); broadcast(room);
  });
  socket.on('host:start', () => { const room = rooms.get(socket.data.roomCode); if (!room || room.hostId !== socket.id) return; if (room.status !== 'lobby') return; if (!room.players.size) return emitError(socket, 'Wait for at least one participant to join.'); startQuestion(room, 0); });
  socket.on('player:answer', ({ index } = {}) => {
    const room = rooms.get(socket.data.roomCode); if (!room || socket.data.role !== 'player' || room.status !== 'question') return;
    const player = room.players.get(socket.id); const q = room.questions[room.questionIndex];
    if (!player || player.answer) return emitError(socket, 'Your answer has already been submitted.');
    if (!Number.isInteger(index) || index < 0 || index >= q.options.length) return;
    if (Date.now() > room.deadline) return emitError(socket, 'Time is up!');
    player.answer = { index, at: Date.now(), scored: false }; socket.emit('answer:received', { index });
    io.to(room.code).emit('progress', { answeredCount: [...room.players.values()].filter(p => p.answer).length, totalPlayers: room.players.size });
    broadcast(room);
  });
  socket.on('host:reveal', () => { const room = rooms.get(socket.data.roomCode); if (!room || room.hostId !== socket.id) return; reveal(room); });
  socket.on('host:next', () => { const room = rooms.get(socket.data.roomCode); if (!room || room.hostId !== socket.id) return; if (room.status === 'revealed') startQuestion(room, room.questionIndex + 1); });
  socket.on('host:reset', () => { const room = rooms.get(socket.data.roomCode); if (!room || room.hostId !== socket.id) return; clearRoomTimer(room.code); rooms.delete(room.code); socket.leave(room.code); socket.data.roomCode = null; socket.emit('host:resetDone'); });
  socket.on('disconnect', () => {
    const code = socket.data.roomCode; const room = code && rooms.get(code); if (!room) return;
    if (room.hostId === socket.id) { clearRoomTimer(code); io.to(code).emit('room:closed'); rooms.delete(code); return; }
    if (room.players.delete(socket.id)) broadcast(room);
  });
});

server.listen(PORT, () => console.log(`Fun Friday game running on http://localhost:${PORT}`));
