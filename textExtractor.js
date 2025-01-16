export class Extractor {
    /**
     * Initializes the text Extractor class
     */
    constructor() {
        // Variable to store extracted text with newline separation
        this.imageText = '';
    }
    
    // Extracts the text from input image and returns a Promise
    extractImage(image) {
        return Tesseract.recognize(
            image, // Input image
            'eng',
            {
                // logger: (info) => console.log('Progress:', info), // Optional logger
            }
        )
        .then(({ data: { text } }) => {
            // Add '\n' after each line and save as a single string
            this.imageText = text.split('\n').map(line => line.trim() + '\n').join('');
        })
        .catch((err) => {
            console.error('Error during extraction:', err);
            throw err;
        });
    }
    
    
    // Gets the extracted text with newlines
    getText() {
        //console.log(this.imageText);
        return this.imageText;
    }
    
    // Extracts text from a PDF file using pdf-lib
    async extractTextFromPDF(file) {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        const pdfBytes = await file.arrayBuffer();
        const pdfDocument = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
    
        let extractedText = '';
    
        for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();
    
            // Group text items by their y-coordinate to separate lines
            const lines = [];
            let currentLineY = null;
            let currentLine = [];
    
            textContent.items.forEach(item => {
                const y = item.transform[5]; // y-coordinate of the text item
    
                // If this item's y-coordinate differs significantly from the current line's y, start a new line
                if (currentLineY === null || Math.abs(currentLineY - y) > 2) {
                    if (currentLine.length > 0) {
                        lines.push(currentLine.join(' '));
                    }
                    currentLineY = y;
                    currentLine = [];
                }
    
                currentLine.push(item.str);
            });
    
            // Add the last line
            if (currentLine.length > 0) {
                lines.push(currentLine.join(' '));
            }
    
            extractedText += lines.join('\n') + '\n\n'; // Separate pages with an extra newline
        }
    
        this.imageText = extractedText.trim(); // Trim trailing whitespace
        return this.imageText;
    }
    
    
    // Obtains total from the extracted image text
    getTotal() {
        let total = "";
    
        // Split the text into lines
        const lines = this.imageText.split('\n');
    
        // Iterate through each line
        for (const line of lines) {
            // Check if the line contains the word "Total"
            if (line.includes('Total')) {
                total = line; // Set the line as total
                //stops at the last occurrence of total
            }
        }
    
        return total;
    }

}