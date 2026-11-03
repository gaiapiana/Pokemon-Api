const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();

function generaCodice() {
  const lettere = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let codice;
  do {
    codice = "";
    for (let i = 0; i < 4; i++) {
      codice += lettere[Math.floor(Math.random() * lettere.length)];
    }
  } while (rooms.has(codice));
  return codice;
}

function trovaStanzaDi(socketId) {
  for (const [codice, stanza] of rooms) {
    if (stanza.giocatori.some((g) => g.id === socketId)) {
      return { codice, stanza };
    }
  }
  return null;
}

function rimuoviDaStanza(socketId) {
  const trovata = trovaStanzaDi(socketId);
  if (!trovata) return;

  const { codice, stanza } = trovata;
  stanza.giocatori = stanza.giocatori.filter((g) => g.id !== socketId);

  if (stanza.giocatori.length === 0) {
    rooms.delete(codice);
    return;
  }

  const restante = stanza.giocatori[0];
  io.to(restante.id).emit("inAttesa", { codice });
}

io.on("connection", (socket) => {
  socket.on("creaStanza", ({ nome }) => {
    const nomePulito = typeof nome === "string" ? nome.trim() : "";
    if (!nomePulito) {
      socket.emit("errore", { messaggio: "Inserisci il tuo nome." });
      return;
    }

    if (trovaStanzaDi(socket.id)) {
      socket.emit("errore", { messaggio: "Sei già in una stanza." });
      return;
    }

    const codice = generaCodice();
    rooms.set(codice, {
      giocatori: [{ id: socket.id, nome: nomePulito }],
    });
    socket.join(codice);
    socket.emit("inAttesa", { codice });
  });

  socket.on("entraStanza", ({ nome, codice }) => {
    const nomePulito = typeof nome === "string" ? nome.trim() : "";
    const codicePulito =
      typeof codice === "string" ? codice.trim().toUpperCase() : "";

    if (!nomePulito) {
      socket.emit("errore", { messaggio: "Inserisci il tuo nome." });
      return;
    }
    if (!codicePulito) {
      socket.emit("errore", { messaggio: "Inserisci il codice della stanza." });
      return;
    }
    if (trovaStanzaDi(socket.id)) {
      socket.emit("errore", { messaggio: "Sei già in una stanza." });
      return;
    }

    const stanza = rooms.get(codicePulito);
    if (!stanza) {
      socket.emit("errore", { messaggio: "La stanza non esiste." });
      return;
    }
    if (stanza.giocatori.length >= 2) {
      socket.emit("errore", { messaggio: "La stanza è piena." });
      return;
    }

    stanza.giocatori.push({ id: socket.id, nome: nomePulito });
    socket.join(codicePulito);

    const nomi = stanza.giocatori.map((g) => g.nome);
    io.to(codicePulito).emit("partitaPronta", { giocatori: nomi });
  });

  socket.on("disconnect", () => {
    rimuoviDaStanza(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server in ascolto su http://localhost:${PORT}`);
});
