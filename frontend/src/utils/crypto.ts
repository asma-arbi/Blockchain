/**
 * Utilitaire cryptographique côté client utilisant l'API Web Crypto native du navigateur.
 * Garantit que le contenu du fichier ne quitte JAMAIS la machine de l'utilisateur.
 */

export interface HashResult {
  /** Hash SHA-256 complet avec préfixe 0x, formaté en bytes32 pour Solidity */
  bytes32Hash: `0x${string}`;
  /** Hash SHA-256 hexadécimal sans préfixe 0x */
  rawHex: string;
  /** Taille du fichier en octets */
  fileSize: number;
  /** Nom du fichier */
  fileName: string;
  /** Type MIME du fichier */
  fileType: string;
  /** Date de dernière modification du fichier */
  lastModified: number;
}

/**
 * Calcule l'empreinte SHA-256 d'un fichier local via la Web Crypto API (crypto.subtle).
 * 
 * @param file Fichier sélectionné par l'utilisateur
 * @param onProgress Callback optionnel pour le suivi de lecture (utile pour gros fichiers)
 * @returns Promise<HashResult> Contenant le hash bytes32 et les métadonnées
 */
export async function hashFile(
  file: File,
  onProgress?: (progressPercent: number) => void
): Promise<HashResult> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error(
      "L'API Web Crypto n'est pas supportée par votre navigateur ou vous n'êtes pas dans un contexte sécurisé (HTTPS / localhost)."
    );
  }

  // Lecture du fichier en ArrayBuffer
  const buffer = await readFileAsArrayBuffer(file, onProgress);

  // Calcul du digest cryptographique SHA-256
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);

  // Conversion en hexadécimal
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const rawHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  const bytes32Hash = `0x${rawHex}` as `0x${string}`;

  return {
    bytes32Hash,
    rawHex,
    fileSize: file.size,
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    lastModified: file.lastModified,
  };
}

/**
 * Lit un fichier sous forme d'ArrayBuffer avec suivi de progression.
 */
function readFileAsArrayBuffer(
  file: File,
  onProgress?: (percent: number) => void
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("Échec de la lecture du fichier en ArrayBuffer"));
      }
    };

    reader.onerror = () => {
      reject(reader.error || new Error("Erreur inconnue lors de la lecture du fichier"));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Tronque un hash ou une adresse pour un affichage condensé et lisible.
 * Ex: 0x5FbDB2315678afecb367f032d93F642f64180aa3 -> 0x5FbD...0aa3
 */
export function shortenAddress(address: string, start = 6, end = 4): string {
  if (!address || address.length < start + end) return address || "";
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/**
 * Tronque une empreinte bytes32 pour l'affichage.
 */
export function shortenHash(hash: string, start = 10, end = 8): string {
  if (!hash || hash.length < start + end) return hash || "";
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

/**
 * Formate une taille en octets en chaîne lisible (Ko, Mo, Go).
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Octet";
  const k = 1024;
  const sizes = ["Octets", "Ko", "Mo", "Go", "To"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Formate un timestamp Unix (secondes) en date/heure lisible en français.
 */
export function formatTimestamp(timestamp: number | bigint): string {
  const tsNum = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  if (!tsNum || tsNum <= 0) return "Date inconnue";
  const date = new Date(tsNum * 1000);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

/**
 * Copie un texte dans le presse-papier avec retour visuel.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error("Échec de la copie :", err);
    return false;
  }
}
