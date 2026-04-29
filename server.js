
require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors({
  origin: "*"
}));
app.use(express.json());
app.use(express.static('public'));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

const SECRET = process.env.JWT_SECRET || 'secret';

// LOGIN
app.post('/login', async (req,res)=>{
  const {username,password} = req.body;

  const result = await db.query('SELECT * FROM users WHERE username=$1',[username]);
  const user = result.rows[0];
  if(!user) return res.sendStatus(401);

const valid = password === user.password;
  if(!valid) return res.sendStatus(401);

  const token = jwt.sign(user, SECRET);
  res.json({token});
});

// AUTH middleware
function auth(req,res,next){
const token = req.headers.authorization?.replace("Bearer ", "");
  if(!token) return res.sendStatus(401);
  jwt.verify(token, SECRET,(err,user)=>{
    if(err) return res.sendStatus(403);
    req.user=user;
    next();
  });
}

// CREATE TICKET
app.post('/tickets', auth, async (req,res)=>{
  const {title,description,department,priority} = req.body;

  const result = await db.query(
    'INSERT INTO tickets(title,description,department,priority,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *',
    [title,description,department,priority,req.user.id]
  );

  res.json(result.rows[0]);
});

// GET TICKETS
app.get('/tickets', auth, async (req,res)=>{
  const result = await db.query('SELECT * FROM tickets ORDER BY id DESC');
  res.json(result.rows);
});

// UPDATE STATUS
app.put('/tickets/:id', auth, async (req,res)=>{
  const {status} = req.body;
  await db.query('UPDATE tickets SET status=$1 WHERE id=$2',[status,req.params.id]);
  res.json({ok:true});
});

// STATS DASHBOARD
app.get('/stats', auth, async (req,res)=>{
  const open = await db.query("SELECT COUNT(*) FROM tickets WHERE status='Open'");
  const closed = await db.query("SELECT COUNT(*) FROM tickets WHERE status='Closed'");
  res.json({
    open: open.rows[0].count,
    closed: closed.rows[0].count
  });
});

app.listen(process.env.PORT || 3000, ()=>{
  console.log("Server running");
});
