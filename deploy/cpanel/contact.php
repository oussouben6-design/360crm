<?php
/**
 * Excellence 360 CRM — Relais e-mail LWS pour le formulaire /contact
 * Envoie une notification directe à admin@excellence-services-sarl.com
 */
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'message' => 'Méthode non autorisée']);
  exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw ?: '{}', true);

$name = trim((string)($data['name'] ?? $_POST['name'] ?? ''));
$email = trim((string)($data['email'] ?? $_POST['email'] ?? ''));
$phone = trim((string)($data['phone'] ?? $_POST['phone'] ?? ''));
$company = trim((string)($data['company'] ?? $_POST['company'] ?? ''));
$subjectKey = trim((string)($data['subject'] ?? $_POST['subject'] ?? 'demo'));
$message = trim((string)($data['message'] ?? $_POST['message'] ?? ''));
$reference = trim((string)($data['reference'] ?? 'EXC360'));

if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $message === '') {
  http_response_code(400);
  echo json_encode(['ok' => false, 'message' => 'Champs obligatoires manquants']);
  exit;
}

$to = 'admin@excellence-services-sarl.com';
$mailSubject = '[Excellence 360 CRM] Nouvelle demande (' . $subjectKey . ') — ' . $name;
$body = "Nouvelle demande reçue depuis https://360crm.excellence-services-sarl.com/contact\n\n"
  . "Référence : #" . $reference . "\n"
  . "Nom : " . $name . "\n"
  . "E-mail : " . $email . "\n"
  . "Téléphone : " . ($phone !== '' ? $phone : 'Non renseigné') . "\n"
  . "Organisation : " . ($company !== '' ? $company : 'Non renseignée') . "\n\n"
  . "Message :\n" . $message . "\n";

$headers = "From: Excellence 360 CRM <admin@excellence-services-sarl.com>\r\n"
  . "Reply-To: " . $email . "\r\n"
  . "Content-Type: text/plain; charset=UTF-8\r\n";

@mail($to, $mailSubject, $body, $headers);

echo json_encode(['ok' => true, 'reference' => $reference]);
