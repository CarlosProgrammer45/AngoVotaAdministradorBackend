// Importações necessárias
const express = require('express');
require('dotenv').config();

const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const http = require('http');
const routes = require('./routes');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const pgSession = require('connect-pg-simple')(session);

const app = express();
app.set('trust proxy', 1);

// 🔹 Pool para sessões (pode usar a mesma connection string do Sequelize)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middleware necessários
app.use(cors({
  origin: process.env.CONEXAO,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Configurações da sessão
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'Sessoes'
  }),
  secret: process.env.KeySession, 
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: true,       // exige HTTPS em produção
    httpOnly: true,     // protege contra XSS
    sameSite: 'none',   // necessário se front/back têm domínios diferentes
    maxAge: 1000 * 60 * 60 // 1 hora
  }
}));

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(routes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CONEXAO,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

app.set('io', io);

module.exports = { server, io };
