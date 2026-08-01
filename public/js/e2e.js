// ── E2E Encryption (WebCrypto — zero deps, hardware-accelerated AES-GCM) ──
// Architecture: ECDH P-256 key exchange + AES-GCM-256 per-message encryption.
// The server only ever sees ciphertext and relays public keys — it cannot read DMs.
// Keys are ephemeral: a fresh keypair is generated on every connect/reconnect.
window.E2E = (() => {
  let myKeyPair  = null;
  const peerKeys = new Map(); // username.toLowerCase() -> CryptoKey (their public key)

  // Generate a new ECDH keypair; returns our public key as base64 for broadcast.
  async function init() {
    myKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      false,            // private key is non-extractable['deriveKey']
    );
    const pubRaw = await crypto.subtle.exportKey('raw', myKeyPair.publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(pubRaw)));
  }

  // Import a peer's raw P-256 public key from base64.
  async function importPeerKey(b64) {
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return crypto.subtle.importKey(
      'raw', raw,
      { name: 'ECDH', namedCurve: 'P-256' },
      false, ['deriveKey']
    );
  }

  // Derive a one-time AES-GCM-256 key from our private key and peer's public key.
  // ECDH is commutative: both sides arrive at the same secret.
  async function getSharedKey(username) {
    const peerKey = peerKeys.get(username.toLowerCase());
    if (!peerKey || !myKeyPair) return null;
    return crypto.subtle.deriveKey(
      { name: 'ECDH', public: peerKey },
      myKeyPair.privateKey,
      { name: 'AES-GCM', length: 256 },
      false, ['encrypt', 'decrypt']
    );
  }

  // Encrypt plaintext for `username`. Returns base64(iv[12] + ciphertext).
  async function encrypt(username, plaintext) {
    const sharedKey = await getSharedKey(username);
    if (!sharedKey) throw new Error('no key for ' + username);
    const iv  = crypto.getRandomValues(new Uint8Array(12)); // fresh random IV every message
    const enc = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      sharedKey,
      new TextEncoder().encode(plaintext)
    );
    const combined = new Uint8Array(12 + enc.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(enc), 12);
    return btoa(String.fromCharCode(...combined));
  }

  // Decrypt a base64(iv + ciphertext) payload from `username`.
  async function decrypt(username, b64) {
    const sharedKey = await getSharedKey(username);
    if (!sharedKey) throw new Error('no key for ' + username);
    const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const iv   = combined.slice(0, 12);
    const data = combined.slice(12);
    const dec  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, sharedKey, data);
    return new TextDecoder().decode(dec);
  }

  function hasPeerKey(username)      { return peerKeys.has(username.toLowerCase()); }
  function storePeerKey(username, k) { peerKeys.set(username.toLowerCase(), k); }
  function clearPeerKeys()           { peerKeys.clear(); }

  return { init, importPeerKey, encrypt, decrypt, hasPeerKey, storePeerKey, clearPeerKeys };
})();