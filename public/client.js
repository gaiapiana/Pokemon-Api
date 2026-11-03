const socket = io();

const statoConnessione = document.getElementById("stato-connessione");
const erroreEl = document.getElementById("errore");
const lobbyEl = document.getElementById("lobby");
const attesaEl = document.getElementById("attesa");
const partitaEl = document.getElementById("partita");
const codiceCondivisione = document.getElementById("codice-condivisione");
const partitaTesto = document.getElementById("partita-testo");
const nomeInput = document.getElementById("nome");
const codiceInput = document.getElementById("codice");

function mostraErrore(messaggio) {
  erroreEl.textContent = messaggio;
  erroreEl.hidden = false;
}

function nascondiErrore() {
  erroreEl.textContent = "";
  erroreEl.hidden = true;
}

function mostraSezione(sezione) {
  lobbyEl.hidden = sezione !== "lobby";
  attesaEl.hidden = sezione !== "attesa";
  partitaEl.hidden = sezione !== "partita";
}

socket.on("connect", () => {
  statoConnessione.textContent = "Connesso";
});

socket.on("disconnect", () => {
  statoConnessione.textContent = "Disconnesso";
});

socket.on("errore", ({ messaggio }) => {
  mostraErrore(messaggio);
});

socket.on("inAttesa", ({ codice }) => {
  nascondiErrore();
  codiceCondivisione.textContent = codice;
  mostraSezione("attesa");
});

socket.on("partitaPronta", ({ giocatori }) => {
  nascondiErrore();
  const [nome1, nome2] = giocatori;
  partitaTesto.textContent = `Partita pronta: ${nome1} vs ${nome2}`;
  mostraSezione("partita");
});

document.getElementById("crea-stanza").addEventListener("click", () => {
  nascondiErrore();
  socket.emit("creaStanza", { nome: nomeInput.value });
});

document.getElementById("entra-stanza").addEventListener("click", () => {
  nascondiErrore();
  socket.emit("entraStanza", {
    nome: nomeInput.value,
    codice: codiceInput.value,
  });
});
