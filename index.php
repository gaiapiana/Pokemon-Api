<?php
$pokemon = trim($_GET['pokemon'] ?? '');
$errore = '';
$dati = null;

if (isset($_GET['pokemon'])) {
    if ($pokemon === '') {
        $errore = '⚠️ Inserisci il nome di un Pokémon.';
    } else {
        $url = "https://pokeapi.co/api/v2/pokemon/" . urlencode(strtolower($pokemon));
        $response = @file_get_contents($url);

        if ($response === false) {
            $errore = '⚠️ Impossibile contattare il servizio o Pokémon non trovato.';
        } else {
            $dati = json_decode($response, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $errore = '⚠️ Risposta non valida dal server.';
                $dati = null;
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>Pokédex PHP</title>
</head>
<body>
    <header>
        <h1>Pokédex PHP</h1>
    </header>

    <form method="GET">
        <input type="text" name="pokemon" value="<?= htmlspecialchars($pokemon) ?>" placeholder="Es: pikachu">
        <button type="submit">Cerca</button>
    </form>

    <?php if ($errore): ?>
        <p style="color:red;"><?= htmlspecialchars($errore) ?></p>
    <?php endif; ?>

    <?php if ($dati): ?>
        <h2><?= htmlspecialchars(ucfirst($dati['name'])) ?></h2>
        <img src="<?= htmlspecialchars($dati['sprites']['front_default']) ?>" alt="<?= htmlspecialchars($dati['name']) ?>">
        <p>Altezza: <?= (int)$dati['height'] ?></p>
        <p>Peso: <?= (int)$dati['weight'] ?></p>
        <p>Tipi:
            <?php
            $tipi = array_map(function ($t) {
                return htmlspecialchars($t['type']['name']);
            }, $dati['types']);
            echo implode(', ', $tipi);
            ?>
        </p>
    <?php endif; ?>

    <footer>
        <p>Pokédex PHP - Esercizio API</p>
    </footer>
</body>
</html>