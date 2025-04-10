const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Rcon } = require('rcon-client');
const os = require('os');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path'); // Added the missing path import

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const rconConfig = {
  host: '192.168.1.120',      // Update if Minecraft server is on another IP
  port: 25575,                // RCON port (match your server.properties)
  password: 'y&\#V%qrA?4'      // Replace with your RCON password
};

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true })); // Parse POST data
app.use(session({
  secret: 'minecraft-panel-secret',  // A secret key for session
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60000 } // Session expires after 1 minute of inactivity
}));

// Serve the static index.html if logged in
app.get('/index', (req, res) => {
    if (req.session.loggedIn || req.url === '/login') {
        return next();
      }
      res.sendFile(path.join(__dirname, 'public', 'index.html')); // Serve the actual index.html file
});

let commandHistory = [];
let uptimeStart = Date.now();

// Helper to send RCON command
async function sendRconCommand(command) {
  try {
    const rcon = await Rcon.connect(rconConfig);
    const res = await rcon.send(command);
    rcon.end();
    return res;
  } catch (err) {
    console.error('RCON error:', err);
    return 'RCON error or failed to connect.';
  }
}

// Login page route
app.get('/login', (req, res) => {
  if (req.session.loggedIn) {
    return res.redirect('/');  // If already logged in, redirect to main panel
  }
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>host.panel - Login</title>
      <style>
                :root {
          --bg: #1e1e1e;
          --panel: #2b2b2b;
          --accent: #00ff99;
          --accent-dark: #00cc7a;
          --text: #f0f0f0;
          --border: #333;
        }

        * {
          box-sizing: border-box;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: var(--bg);
          color: var(--text);
          margin: 0;
          padding: 2rem;
        }

        h1 {
          text-align: center;
          color: var(--accent);
          margin-bottom: 2rem;
          font-size: 2rem;
          text-shadow: 0 0 5px var(--accent-dark);
        }

        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }

        .login-panel {
          background-color: var(--panel);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          width: 100%;
          max-width: 400px;
        }

        .login-panel h2 {
          text-align: center;
          color: var(--accent);
          margin-bottom: 1.5rem;
        }

        input[type="text"],
        input[type="password"] {
          width: 100%;
          padding: 0.75rem;
          margin-bottom: 1rem;
          border: 1px solid var(--border);
          border-radius: 6px;
          background-color: #191919;
          color: var(--text);
        }

        button {
          width: 100%;
          padding: 0.75rem;
          background-color: var(--accent);
          border: none;
          color: #121212;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }

        button:hover {
          background-color: var(--accent-dark);
        }

        .login-panel p {
          text-align: center;
          color: var(--text);
        }

        @media (max-width: 600px) {
          .login-panel {
            padding: 1.5rem;
          }
        }
      </style>
    </head>
    <body>
      <h1>host.panel</h1>

      <div class="login-container">
        <div class="login-panel">
          <h2>Login</h2>
          <form action="/login" method="POST">
            <input type="text" id="username" name="username" placeholder="Username" required />
            <input type="password" id="password" name="password" placeholder="Password" required />
            <button type="submit">Login</button>
          </form>
          <p>Enter your credentials to access the panel.</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Handle login
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Simple hardcoded credentials (for demonstration purposes)
  if (username === 'admin' && password === 'admin') {
    req.session.loggedIn = true; // Mark the session as logged in
    return res.redirect('/index'); // Redirect to the main panel
  } else {
    return res.send('Invalid credentials');
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect('/index'); // If session destruction fails, redirect to home page
    }
    res.redirect('/login'); // Redirect to login after logging out
  });
});

// Middleware to check if the user is logged in
app.use((req, res, next) => {
  if (req.session.loggedIn || req.url === '/login') {
    return next();
  }
  res.redirect('/login'); // Redirect to login page if not logged in
});

// Poll server stats and emit
async function pollServerStats() {
  const [tpsRaw, listRaw] = await Promise.all([
    sendRconCommand('lagg tps'),  // TPS (from ClearLag plugin)
    sendRconCommand('list')       // Online players
  ]);

  const cleanTpsRaw = tpsRaw.replace(/§[0-9a-fk-or]/g, ''); // This removes color codes
  //console.log("TPS Raw Output:", tpsRaw);
  //console.log("Cleaned TPS Raw Output:", cleanTpsRaw);

  const tpsMatch = cleanTpsRaw.match(/(\d+\.\d+)/); // Matches any number with a decimal
  let tps = '--'; // Default value
  if (tpsMatch) {
    tps = parseFloat(tpsMatch[1]);
}


  let playerList = [];
  const listMatch = listRaw.match(/There are \d+ of a max of \d+ players online:?\s*(.*)/);

  if (listMatch && listMatch[1]) {
    const names = listMatch[1];
    if (names) {
      playerList = names.split(',').map(p => p.trim());
    }
  }

  const ramUsage = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;
  const uptime = formatUptime(Date.now() - uptimeStart);

  io.emit('server-info', { uptime, tps });
  io.emit('players', playerList);
  io.emit('server-stats', { cpu: getCpuLoad(), ram: ramUsage });
  io.emit('command-history', commandHistory.slice(-15));
}

// Uptime formatter
function formatUptime(ms) {
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / (1000 * 60)) % 60;
  const hrs = Math.floor(ms / (1000 * 60 * 60));
  return `${hrs}h ${min}m ${sec}s`;
}

// Get CPU load
function getCpuLoad() {
  const cpus = os.cpus();
  let idle = 0, total = 0;

  cpus.forEach(core => {
    for (type in core.times) {
      total += core.times[type];
    }
    idle += core.times.idle;
  });

  const avgIdle = idle / cpus.length;
  const avgTotal = total / cpus.length;
  return Math.round(100 - (100 * avgIdle / avgTotal));
}

// WebSocket logic
io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('command', async (cmd) => {
    const res = await sendRconCommand(cmd);
    commandHistory.push(cmd);
    socket.emit('command-response', res);
  });

  socket.on('player-action', async (action, name, message = null) => {
    if (!name) return;
    let command;

    switch (action) {
      case 'kick': command = `kick ${name}`; break;
      case 'ban': command = `ban ${name}`; break;
      case 'message': command = `tell ${name}` + ` ${message}` ||` Hello from the panel!`; break;
      default: return socket.emit('command-response', 'Unknown action.');
    }

    const res = await sendRconCommand(command);
    commandHistory.push(command);
    socket.emit('command-response', res);
  });

  socket.on('chat-message', async (msg) => {
    const res = await sendRconCommand(`say ${msg}`);
    commandHistory.push(`say ${msg}`);
    socket.emit('command-response', res);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Poll every 5 seconds
setInterval(pollServerStats, 5000);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Minecraft Panel server running at http://localhost:${PORT}`);
});
