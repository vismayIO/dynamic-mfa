import path from "node:path";
import JSZip from "jszip";

const EXTENSION_CONTENT_TYPES = new Map<string, string>([
  [".css", "text/css"],
  [".gif", "image/gif"],
  [".html", "text/html"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "application/javascript"],
  [".json", "application/json"],
  [".map", "application/json"],
  [".mjs", "application/javascript"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function trimLeadingRelativePrefix(value: string): string {
  return value.replace(/^\.\/+/, "").replace(/^\/+/, "");
}

export interface ExtractedModuleArchiveFile {
  path: string;
  data: Uint8Array;
  contentType: string;
}

export function normalizeArchivePath(rawPath: string): string {
  const trimmed = trimLeadingRelativePrefix(rawPath.trim().replace(/\\/g, "/"));
  const normalized = path.posix.normalize(trimmed);

  if (normalized.length === 0 || normalized === ".") {
    throw new Error("Archive path cannot be empty.");
  }

  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error(`Archive path "${rawPath}" is invalid.`);
  }

  return normalized;
}

function resolveContentType(filePath: string): string {
  const extension = path.posix.extname(filePath).toLowerCase();
  return EXTENSION_CONTENT_TYPES.get(extension) ?? "application/octet-stream";
}

export async function extractModuleArchive(
  archiveBuffer: Uint8Array,
): Promise<ExtractedModuleArchiveFile[]> {
  const zip = await JSZip.loadAsync(archiveBuffer);

  const extractedFiles: ExtractedModuleArchiveFile[] = [];
  const seenPaths = new Set<string>();

  for (const file of Object.values(zip.files)) {
    if (file.dir) {
      continue;
    }

    const normalizedPath = normalizeArchivePath(file.name);
    if (seenPaths.has(normalizedPath)) {
      throw new Error(`Archive contains duplicate file "${normalizedPath}".`);
    }

    const data = await file.async("uint8array");
    extractedFiles.push({
      path: normalizedPath,
      data,
      contentType: resolveContentType(normalizedPath),
    });
    seenPaths.add(normalizedPath);
  }

  if (extractedFiles.length === 0) {
    throw new Error("Archive must contain at least one file.");
  }

  return extractedFiles;
}
