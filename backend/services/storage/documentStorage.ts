import fs from "fs";
import path from "path";

export interface StoredFile {
  filePath: string;
  relativePath: string;
  sizeBytes: number;
  contentHash: string;
}

export interface DocumentStorage {
  save(buffer: Buffer, contentHash: string): Promise<StoredFile>;
  read(contentHash: string): Promise<Buffer>;
  exists(contentHash: string): Promise<boolean>;
  delete(contentHash: string): Promise<boolean>;
  getFilePath(contentHash: string): string;
}

export class LocalDocumentStorage implements DocumentStorage {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(process.cwd(), "storage/documents");
    this.ensureDirectory(this.baseDir);
  }

  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  getFilePath(contentHash: string): string {
    const cleanHash = contentHash.toLowerCase().replace(/[^a-f0-9]/g, "");
    const prefix = cleanHash.slice(0, 2) || "00";
    return path.join(this.baseDir, prefix, `${cleanHash}.pdf`);
  }

  getRelativePath(contentHash: string): string {
    const cleanHash = contentHash.toLowerCase().replace(/[^a-f0-9]/g, "");
    const prefix = cleanHash.slice(0, 2) || "00";
    return path.join("storage/documents", prefix, `${cleanHash}.pdf`);
  }

  async save(buffer: Buffer, contentHash: string): Promise<StoredFile> {
    const fullPath = this.getFilePath(contentHash);
    const parentDir = path.dirname(fullPath);
    this.ensureDirectory(parentDir);

    await fs.promises.writeFile(fullPath, buffer);

    return {
      filePath: fullPath,
      relativePath: this.getRelativePath(contentHash),
      sizeBytes: buffer.length,
      contentHash,
    };
  }

  async read(contentHash: string): Promise<Buffer> {
    const fullPath = this.getFilePath(contentHash);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Document file not found for hash: ${contentHash}`);
    }
    return fs.promises.readFile(fullPath);
  }

  async exists(contentHash: string): Promise<boolean> {
    const fullPath = this.getFilePath(contentHash);
    return fs.existsSync(fullPath);
  }

  async delete(contentHash: string): Promise<boolean> {
    const fullPath = this.getFilePath(contentHash);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      return true;
    }
    return false;
  }
}

export const defaultDocumentStorage = new LocalDocumentStorage();
