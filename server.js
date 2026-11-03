const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();
const POKEAPI = "https://pokeapi.co/api/v2";

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

function nuovoGiocatore(id, nome) {
  return {
    id,
    nome,
    pokemon: null,
    sceltaInCorso: false,
    mossaScelta: null,
  };
}

function stat(stats, nome) {
  const trovata = stats.find((s) => s.stat.name === nome);
  return trovata ? trovata.base_stat : 0;
}

function mescola(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function etichetta(nome) {
  return String(nome)
    .split("-")
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}

async function scegliMosseValide(moves) {
  const nomi = mescola(moves.map((m) => m.move.name));
  const valide = [];
  const tentativi = Math.min(20, nomi.length);

  for (let i = 0; i < tentativi && valide.length < 4; i++) {
    const risposta = await fetch(`${POKEAPI}/move/${nomi[i]}`);
    if (!risposta.ok) continue;

    const mossa = await risposta.json();
    if (mossa.power == null) continue;

    valide.push({
      nome: mossa.name,
      potenza: mossa.power,
      tipo: mossa.type.name,
    });
  }

  return valide;
}

async function caricaPokemon(nome) {
  const risposta = await fetch(`${POKEAPI}/pokemon/${encodeURIComponent(nome)}`);
  if (risposta.status === 404) {
    return { errore: "Questo Pokémon non esiste." };
  }
  if (!risposta.ok) {
    return { errore: "Impossibile scaricare i dati del Pokémon." };
  }

  const dati = await risposta.json();
  const mosse = await scegliMosseValide(dati.moves);
  if (mosse.length < 4) {
    return { errore: "Impossibile trovare 4 mosse valide. Riprova." };
  }

  return {
    pokemon: {
      nome: dati.name,
      hp: stat(dati.stats, "hp"),
      attacco: stat(dati.stats, "attack"),
      difesa: stat(dati.stats, "defense"),
      velocita: stat(dati.stats, "speed"),
      sprite: dati.sprites.front_default,
      mosse,
    },
  };
}

function datiPokemon(giocatore, proprio) {
  return {
    giocatore: giocatore.nome,
    proprio,
    nome: giocatore.pokemon.nome,
    hp: giocatore.pokemon.hp,
    sprite: giocatore.pokemon.sprite,
    mosse: giocatore.pokemon.mosse,
  };
}

function hpAggiornati(stanza) {
  return stanza.giocatori.map((g) => ({
    giocatore: g.nome,
    hp: g.pokemon.hp,
  }));
}

function calcolaDanno(attaccante, difensore, mossa) {
  const base = Math.floor(
    (((2 * 50) / 5 + 2) * mossa.potenza * attaccante.pokemon.attacco) /
      Math.max(1, difensore.pokemon.difesa) /
      50 +
      2
  );
  const casuale = 0.85 + Math.random() * 0.15;
  return Math.floor(base * casuale);
}

function ordineAttacco(giocatori) {
  const [a, b] = giocatori;
  if (a.pokemon.velocita > b.pokemon.velocita) return [a, b];
  if (b.pokemon.velocita > a.pokemon.velocita) return [b, a];
  return Math.random() < 0.5 ? [a, b] : [b, a];
}

function eseguiAttacco(attaccante, difensore) {
  const mossa = attaccante.mossaScelta;
  const danno = calcolaDanno(attaccante, difensore, mossa);
  difensore.pokemon.hp = Math.max(0, difensore.pokemon.hp - danno);
  return `${etichetta(attaccante.pokemon.nome)} usa ${etichetta(mossa.nome)}! ${etichetta(difensore.pokemon.nome)} perde ${danno} HP.`;
}

function risolviTurno(codice, stanza) {
  const [primo, secondo] = ordineAttacco(stanza.giocatori);
  const messaggi = [eseguiAttacco(primo, secondo)];

  if (secondo.pokemon.hp > 0) {
    messaggi.push(eseguiAttacco(secondo, primo));
  }

  io.to(codice).emit("risultatoTurno", {
    hp: hpAggiornati(stanza),
    messaggi,
  });

  stanza.giocatori.forEach((g) => {
    g.mossaScelta = null;
  });

  const ko = stanza.giocatori.find((g) => g.pokemon.hp <= 0);
  if (!ko) return;

  stanza.battagliaFinita = true;
  const vincitore = stanza.giocatori.find((g) => g.pokemon.hp > 0);
  io.to(codice).emit("fineBattaglia", { vincitore: vincitore.nome });
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
  restante.pokemon = null;
  restante.sceltaInCorso = false;
  restante.mossaScelta = null;
  stanza.battagliaFinita = false;
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
      giocatori: [nuovoGiocatore(socket.id, nomePulito)],
      battagliaFinita: false,
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

    stanza.giocatori.push(nuovoGiocatore(socket.id, nomePulito));
    socket.join(codicePulito);

    const nomi = stanza.giocatori.map((g) => g.nome);
    io.to(codicePulito).emit("partitaPronta", { giocatori: nomi });
  });

  socket.on("scegliPokemon", async ({ nome }) => {
    const nomePulito =
      typeof nome === "string" ? nome.trim().toLowerCase() : "";
    if (!nomePulito) {
      socket.emit("errore", { messaggio: "Inserisci il nome di un Pokémon." });
      return;
    }

    const trovata = trovaStanzaDi(socket.id);
    if (!trovata || trovata.stanza.giocatori.length < 2) {
      socket.emit("errore", { messaggio: "La partita non è ancora pronta." });
      return;
    }

    const { codice, stanza } = trovata;
    const giocatore = stanza.giocatori.find((g) => g.id === socket.id);
    if (giocatore.pokemon || giocatore.sceltaInCorso) {
      return;
    }

    giocatore.sceltaInCorso = true;
    try {
      const risultato = await caricaPokemon(nomePulito);
      if (risultato.errore) {
        socket.emit("errore", { messaggio: risultato.errore });
        return;
      }

      giocatore.pokemon = risultato.pokemon;
      socket.emit("pokemonScelto");

      const entrambiPronti = stanza.giocatori.every((g) => g.pokemon);
      if (entrambiPronti) {
        stanza.battagliaFinita = false;
        stanza.giocatori.forEach((g) => {
          g.mossaScelta = null;
        });
        stanza.giocatori.forEach((g) => {
          io.to(g.id).emit("battagliaPronta", {
            pokemon: stanza.giocatori.map((altro) =>
              datiPokemon(altro, altro.id === g.id)
            ),
          });
        });
      }
    } catch (err) {
      socket.emit("errore", { messaggio: "Errore durante il download del Pokémon." });
    } finally {
      giocatore.sceltaInCorso = false;
    }
  });

  socket.on("sceltaMossa", ({ indice }) => {
    const trovata = trovaStanzaDi(socket.id);
    if (!trovata) return;

    const { codice, stanza } = trovata;
    if (stanza.battagliaFinita || stanza.giocatori.length < 2) return;

    const giocatore = stanza.giocatori.find((g) => g.id === socket.id);
    if (!giocatore.pokemon || giocatore.mossaScelta) return;

    if (!Number.isInteger(indice) || indice < 0 || indice > 3) return;
    const mossa = giocatore.pokemon.mosse[indice];
    if (!mossa) return;

    giocatore.mossaScelta = mossa;

    if (stanza.giocatori.every((g) => g.mossaScelta)) {
      risolviTurno(codice, stanza);
    }
  });

  socket.on("disconnect", () => {
    rimuoviDaStanza(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server in ascolto su http://localhost:${PORT}`);
});
