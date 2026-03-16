const { PDFParse } = require('pdf-parse');
const axios = require('axios');
const fs = require('fs');

async function extractTextFromFile(filePath) {
    const fileExtension = filePath.split('.').pop().toLowerCase();

    // If it's a URL (from Cloudinary)
    if (filePath.startsWith('http')) {
        const response = await axios.get(filePath, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        if (fileExtension === 'pdf') {
            const parser = new PDFParse({ data: buffer });
            try {
                const data = await parser.getText();
                return data.text;
            } finally {
                await parser.destroy();
            }
        } else {
            return buffer.toString('utf-8');
        }
    }

    // If it's a local file (fallback)
    const buffer = fs.readFileSync(filePath);
    if (fileExtension === 'pdf') {
        const parser = new PDFParse({ data: buffer });
        try {
            const data = await parser.getText();
            return data.text;
        } finally {
            await parser.destroy();
        }
    }
    return buffer.toString('utf-8');
}

module.exports = { extractTextFromFile };
