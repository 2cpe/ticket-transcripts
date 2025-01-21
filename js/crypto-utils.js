class CryptoUtils {
    static async decrypt(encryptedData) {
        const key = await this.getKey();
        const iv = new Uint8Array(Buffer.from(encryptedData.iv, 'hex'));
        const content = new Uint8Array(Buffer.from(encryptedData.content, 'hex'));
        const tag = new Uint8Array(Buffer.from(encryptedData.tag, 'hex'));

        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv,
                tagLength: 128
            },
            key,
            content
        );

        return new TextDecoder().decode(decrypted);
    }

    static async getKey() {
        try {
            // Get the encryption key from a secure endpoint
            const response = await fetch('https://api.github.com/repos/2cpe/ticket-transcripts/api/key', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('discord_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to retrieve encryption key');
            }

            const { key } = await response.json();
            
            // Convert the key to the correct format for Web Crypto API
            const rawKey = await window.crypto.subtle.importKey(
                'raw',
                Buffer.from(key, 'hex'),
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false, // not extractable
                ['decrypt']
            );

            return rawKey;
        } catch (error) {
            console.error('Error retrieving encryption key:', error);
            throw new Error('Failed to initialize encryption key');
        }
    }
} 