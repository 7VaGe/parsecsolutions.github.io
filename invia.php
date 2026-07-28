<?php
/* =============================================================
   invia.php  —  Endpoint di invio dei form (Contatti + CV)
   Invio tramite MICROSOFT GRAPH (OAuth2 client credentials).
   - Nessuna password utente, nessun MFA, nessun SMTP Basic.
   - L'app ottiene un token da Entra e chiama Graph /sendMail.
   - Risponde in JSON: { ok: true|false, message: "..." }
   Richiede solo l'estensione cURL di PHP (attiva su Aruba).
   ============================================================= */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

/* --- Risposta JSON e uscita ---------------------------------- */
function reply(bool $ok, string $msg, int $code = 200): void {
    http_response_code($ok ? 200 : $code);
    echo json_encode(['ok' => $ok, 'message' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    reply(false, 'Metodo non consentito.', 405);
}

$cfg = require dirname(__DIR__) . '/config.php';  // config.php sta in / (fuori dalla web root)

/* --- Utilità ------------------------------------------------- */
function post(string $k): string { return trim((string)($_POST[$k] ?? '')); }

/* --- Anti-spam: honeypot ------------------------------------- */
if (post('website') !== '') {
    $d = !empty($cfg['debug']) ? ' [HONEYPOT attivato: il campo nascosto "website" risulta compilato — invio NON effettuato]' : '';
    reply(true, 'Grazie! Abbiamo ricevuto la tua richiesta.' . $d); // finge successo ai bot
}

/* --- Tipo di form -------------------------------------------- */
$tipo = post('form'); // 'contatti' | 'lavora'
if (!in_array($tipo, ['contatti', 'lavora'], true)) {
    reply(false, 'Modulo non riconosciuto.', 400);
}

/* --- Campi comuni + validazione ------------------------------ */
$nome  = post('nome');
$email = post('email');
$msg   = post('msg');

if ($nome === '' || $email === '') {
    reply(false, 'Compila i campi obbligatori (nome ed email).', 400);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    reply(false, "L'indirizzo email non è valido.", 400);
}

/* --- Gestione allegato CV (solo form "lavora") --------------- */
$attachment = null;
if ($tipo === 'lavora') {
    if (empty($_FILES['cv']) || $_FILES['cv']['error'] === UPLOAD_ERR_NO_FILE) {
        reply(false, 'Allega il tuo curriculum per completare la candidatura.', 400);
    }
    $f = $_FILES['cv'];
    if ($f['error'] !== UPLOAD_ERR_OK) {
        reply(false, 'Errore nel caricamento del file. Riprova.', 400);
    }
    if ($f['size'] > $cfg['max_file']) {
        reply(false, 'Il file supera i 2MB. Scegline uno più piccolo.', 400);
    }
    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $cfg['allowed_ext'], true)) {
        reply(false, 'Formato non consentito: usa .pdf, .doc o .docx.', 400);
    }
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime  = finfo_file($finfo, $f['tmp_name']);
    finfo_close($finfo);
    $mimeOk = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream',
        'application/zip',
    ];
    if (!in_array($mime, $mimeOk, true)) {
        reply(false, 'Il contenuto del file non corrisponde a un CV valido.', 400);
    }
    // Archivio del CV nella cartella protetta (fuori dalla web root)
    if (!is_dir($cfg['cv_dir'])) { @mkdir($cfg['cv_dir'], 0755, true); }
    $safe   = preg_replace('/[^A-Za-z0-9._-]/', '_', $f['name']);
    $cvPath = rtrim($cfg['cv_dir'], '/') . '/' . date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '-' . $safe;
    if (!move_uploaded_file($f['tmp_name'], $cvPath)) {
        reply(false, 'Impossibile salvare il file. Riprova.', 500);
    }
    // Allegato in formato Graph (base64)
    $attachment = [
        '@odata.type'  => '#microsoft.graph.fileAttachment',
        'name'         => $safe,
        'contentType'  => $mime,
        'contentBytes' => base64_encode((string)file_get_contents($cvPath)),
    ];
}

/* ============================================================
   1) TOKEN OAuth2 (client credentials) — con cache su file
   ============================================================ */
function graph_token(array $cfg): string {
    $cacheFile = $cfg['token_cache'] ?? null;

    // Riuso il token se ancora valido (con margine di 5 minuti).
    // In modalità debug la cache viene ignorata: sempre token fresco.
    if ($cacheFile && empty($cfg['debug']) && is_readable($cacheFile)) {
        $c = json_decode((string)file_get_contents($cacheFile), true);
        if (isset($c['access_token'], $c['expires_at']) && $c['expires_at'] > time() + 300) {
            return $c['access_token'];
        }
    }

    $url  = 'https://login.microsoftonline.com/' . $cfg['tenant_id'] . '/oauth2/v2.0/token';
    $body = http_build_query([
        'client_id'     => $cfg['client_id'],
        'client_secret' => $cfg['client_secret'],
        'scope'         => 'https://graph.microsoft.com/.default',
        'grant_type'    => 'client_credentials',
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($resp === false || $code !== 200) {
        error_log('[invia.php] token error HTTP ' . $code . ' ' . $err . ' ' . (string)$resp);
        $d = !empty($cfg['debug']) ? " [TOKEN HTTP $code | cURL: $err | " . substr((string)$resp, 0, 400) . "]" : '';
        reply(false, "Si è verificato un problema nell'invio. Riprova più tardi." . $d, 502);
    }
    $data = json_decode((string)$resp, true);
    if (empty($data['access_token'])) {
        error_log('[invia.php] token: access_token mancante');
        $d = !empty($cfg['debug']) ? " [TOKEN OK ma access_token mancante: " . substr((string)$resp, 0, 400) . "]" : '';
        reply(false, "Si è verificato un problema nell'invio. Riprova più tardi." . $d, 502);
    }

    // Salvo in cache
    if ($cacheFile) {
        @file_put_contents($cacheFile, json_encode([
            'access_token' => $data['access_token'],
            'expires_at'   => time() + (int)($data['expires_in'] ?? 3600),
        ]), LOCK_EX);
        @chmod($cacheFile, 0600);
    }
    return $data['access_token'];
}

/* ============================================================
   2) Costruzione del messaggio
   ============================================================ */
if ($tipo === 'contatti') {
    $azienda   = post('azienda');
    $oggetto   = post('oggetto');
    $recipient = $cfg['to_contatti'];
    $subject   = 'Nuovo messaggio dal sito — ' . ($oggetto !== '' ? $oggetto : 'Contatti');
    $body  = "Nuovo messaggio dal form Contatti\n-----------------------------------\n";
    $body .= "Nome:     $nome\n";
    $body .= "Azienda:  " . ($azienda !== '' ? $azienda : '—') . "\n";
    $body .= "Email:    $email\n";
    $body .= "Oggetto:  " . ($oggetto !== '' ? $oggetto : '—') . "\n";
    $body .= "-----------------------------------\nMessaggio:\n" . ($msg !== '' ? $msg : '—') . "\n";
} else {
    $cognome   = post('cognome');
    $recipient = $cfg['to_lavora'];
    $subject   = 'Nuova candidatura — ' . trim("$nome $cognome");
    $body  = "Nuova candidatura dal form Lavora con noi\n-----------------------------------\n";
    $body .= "Nome:     $nome\n";
    $body .= "Cognome:  " . ($cognome !== '' ? $cognome : '—') . "\n";
    $body .= "Email:    $email\n";
    $body .= "-----------------------------------\nMessaggio:\n" . ($msg !== '' ? $msg : '—') . "\n";
}

$message = [
    'subject'      => $subject,
    'body'         => ['contentType' => 'Text', 'content' => $body],
    'toRecipients' => [['emailAddress' => ['address' => $recipient]]],
    'replyTo'      => [['emailAddress' => ['address' => $email, 'name' => $nome]]],
];
if ($attachment) { $message['attachments'] = [$attachment]; }

/* ============================================================
   3) Invio via Graph /sendMail
   ============================================================ */
$token  = graph_token($cfg);
$sender = rawurlencode($cfg['sender']);
$url    = "https://graph.microsoft.com/v1.0/users/$sender/sendMail";
$payload = json_encode(['message' => $message, 'saveToSentItems' => false], JSON_UNESCAPED_UNICODE);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
    ],
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);

// Graph /sendMail risponde 202 Accepted quando accetta il messaggio
if ($code === 202) {
    $d = !empty($cfg['debug']) ? ' [SENT HTTP 202 — mittente ' . $cfg['sender'] . ' → destinatario ' . $recipient . ']' : '';
    reply(true, 'Grazie! Abbiamo ricevuto la tua richiesta: ti ricontatteremo al più presto.' . $d);
}

error_log('[invia.php] sendMail error HTTP ' . $code . ' ' . $err . ' ' . (string)$resp);
$d = !empty($cfg['debug']) ? " [SENDMAIL HTTP $code | cURL: $err | " . substr((string)$resp, 0, 400) . "]" : '';
reply(false, "Si è verificato un problema nell'invio. Riprova più tardi." . $d, 502);
