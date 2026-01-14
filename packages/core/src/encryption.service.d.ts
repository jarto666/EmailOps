export declare class EncryptionService {
    private key;
    constructor(secret: string);
    encrypt(text: string): string;
    decrypt(text: string): string;
}
