const socket = io();

const statoConnessione = document.getElementById("stato-connessione");
const erroreEl = document.getElementById("errore");
const lobbyEl = document.getElementById("lobby");
const attesaEl = document.getElementById("attesa");
const partitaEl = document.getElementById("partita");
const battagliaEl = document.getElementById("battaglia");
const codiceCondivisione = document.getElementById("codice-condivisione");
const partitaTesto = document.getElementById("partita-testo");
const sceltaPokemonEl = document.getElementById("scelta-pokemon");
const attesaAvversarioEl = document.getElementById("attesa-avversario");
const pokemonBattagliaEl = document.getElementById("pokemon-battaglia");
const nomeInput = document.getElementById("nome");
const codiceInput = document.getElementById("codice");
const nomePokemonInput = document.getElementById("nome-pokemon");
const scegliPokemonBtn = document.getElementById("scegli-pokemon");

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
  battagliaEl.hidden = sezione !== "battaglia";
}

function renderPokemon(dati) {
  const mosse = dati.mosse
    .map((mossa) => `${mossa.nome} (${mossa.tipo}, potenza ${mossa.potenza})`)
    .join(", ");

  return `
    <article>
      <h2>${dati.nome}</h2>
      <p>${dati.giocatore}</p>
      ${dati.sprite ? `<img src="${dati.sprite}" alt="${dati.nome}" />` : ""}
      <p>HP: ${dati.hp}</p>
      <p>Mosse: ${mosse}</p>
    </article>
  `;
}

socket.on("connect", () => {
  statoConnessione.textContent = "Connesso";
});

socket.on("disconnect", () => {
  statoConnessione.textContent = "Disconnesso";
});

socket.on("errore", ({ messaggio }) => {
  mostraErrore(messaggio);
  scegliPokemonBtn.disabled = false;
});

socket.on("inAttesa", ({ codice }) => {
  nascondiErrore();
  codiceCondivisione.textContent = codice;
  sceltaPokemonEl.hidden = false;
  attesaAvversarioEl.hidden = true;
  scegliPokemonBtn.disabled = false;
  mostraSezione("attesa");
});

socket.on("partitaPronta", ({ giocatori }) => {
  nascondiErrore();
  const [nome1, nome2] = giocatori;
  partitaTesto.textContent = `Partita pronta: ${nome1} vs ${nome2}`;
  sceltaPokemonEl.hidden = false;
  attesaAvversarioEl.hidden = true;
  scegliPokemonBtn.disabled = false;
  nomePokemonInput.value = "";
  mostraSezione("partita");
});

socket.on("pokemonScelto", () => {
  nascondiErrore();
  sceltaPokemonEl.hidden = true;
  attesaAvversarioEl.hidden = false;
});

socket.on("battagliaPronta", ({ pokemon }) => {
  nascondiErrore();
  pokemonBattagliaEl.innerHTML = pokemon.map(renderPokemon).join("");
  mostraSezione("battaglia");
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

scegliPokemonBtn.addEventListener("click", () => {
  nascondiErrore();
  scegliPokemonBtn.disabled = true;
  socket.emit("scegliPokemon", { nome: nomePokemonInput.value });
});
