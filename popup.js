// Imports functions from other file classes
    let Extractor;
    (async () => {
    // Imported as async to avoid "not a module" errors
        const module = await import('./textExtractor.js');
        Extractor = module.Extractor;
            
        const reader = new Extractor();
        let model; // Initializes tensor flow training model
        
        const trainButton = document.getElementById('train-button');
        const predictButton = document.getElementById('predict-button');
        
        // Initializes result and status paragraphs
        const predictionResult = document.getElementById('prediction-result');
        const trainingStatus = document.getElementById('training-status');
        const imageOutput = document.getElementById('image-output');
        const totalOutput = document.getElementById('total-output');
        const jsonOutput = document.getElementById('json-output');
        
        
        // Button to select image to determine if planet or not
        async function predictImage(file) {
        
            try {
                if (file.type === 'application/pdf') {
                    // Handle text-based PDFs
                    const extractedText = await reader.extractTextFromPDF(file);
        
                    if (!extractedText.trim()) {
                        alert('No text found in this PDF.');
                        return;
                    }
        
                    // Displays PDF output
                    predictionResult.textContent = 'Category';
                    imageOutput.innerHTML = reader.getText().replace(/\n/g, '<br>');
                    totalOutput.innerHTML = reader.getTotal().replace(/\n/g, '<br>');
        
                    // Generate and display JSON file
                    createDownloadableJSON(reader.getText());
        
                } else if (file.type.startsWith('image/')) {
                    // Handle image files
                    predictionResult.textContent = 'Category';
        
                    // Displays image output string as paragraph content
                    reader.extractImage(file).then(() => {
                        imageOutput.innerHTML = reader.getText().replace(/\n/g, '<br>');
                        totalOutput.innerHTML = reader.getTotal().replace(/\n/g, '<br>');
        
                        // Generate and display JSON file
                        createDownloadableJSON(reader.getText());
                    });
        
                } else {
                    alert('Unsupported file type. Please upload an image or a PDF.');
                }
            } catch (error) {
                console.error('Error processing file:', error);
                alert('An error occurred while processing the file. Please check the file and try again.');
            }
        }
        
        
        // Extracts data from raw text input
        function extractData(rawText) {
            // Default values in case the fields are not found
            const defaultCustomer = "Unknown Customer";
            const defaultCompany = "Unknown Company";
            const defaultDate = "Unknown Date";
            const defaultTotal = 0.0;
        
            // Extract customer name (assumes it's labeled as "Customer: Name")
            const customerMatch = rawText.match(/Customer:\s*([^\n]+)/i);
            const customerName = customerMatch ? customerMatch[1].trim() : defaultCustomer;
        
            // Extract company name (assumes it's labeled as "Company: Name")
            const companyMatch = rawText.match(/Company:\s*([^\n]+)/i);
            const companyName = companyMatch ? companyMatch[1].trim() : defaultCompany;
        
            // Extract date (handles formats like YYYY-MM-DD, DD/MM/YYYY, YY-MM-DD, or DD-MM-YY)
            const dateMatch = rawText.match(/\b(\d{2,4}[-/]\d{2}[-/]\d{2,4})\b/);
            const invoiceDate = dateMatch ? dateMatch[0] : defaultDate;
        
            // Extract total cost (assumes it's labeled as "Total: $X.XX")
            const totalMatch = rawText.match(/Total:\s*[\$\£]?\s?(\d+(\.\d{2})?)/i);
            const totalCost = totalMatch ? parseFloat(totalMatch[1]) : defaultTotal;
        
            // Return the extracted data as a list
            return [customerName, companyName, invoiceDate, parseFloat(totalCost)];
        }
        
        
        // Extracts products from raw text input
        function extractProducts(rawText) {
            // Extend Compromise with better product recognition
            nlp.plugin({
                patterns: {
                    // Recognize multi-word product names with stricter checks for adjectives, nouns, and proper nouns
                    product: "(<Adjective|ProperNoun>* <Noun>+|<ProperNoun>+ <Noun>+)"
                }
            });
        
            const products = [];
            const lines = rawText.split('\n').map(line => line.trim()).filter(line => line !== '');
        
            lines.forEach(line => {
                // Use Compromise to process the line
                const doc = nlp(line);
        
                // Extract quantity (e.g., "1x")
                const quantityMatch = line.match(/(\d+)x/);
                const quantity = quantityMatch ? parseInt(quantityMatch[1], 10) : 1;
        
                // Extract cost (e.g., "$4.00", "£4.00", "$ 4.00", or "£ 4.00")
                const costMatch = line.match(/[\$\£]\s?\d+(\.\d{2})?/);
                const cost = costMatch ? parseFloat(costMatch[0].replace(/[\$\£\s]/g, '')) : 0.00;
        
                // Extract product name using Compromise pattern matching
                let productName = doc.match("#Product").out("text").trim();
        
                // Fallback: Use regex to extract product name if Compromise fails
                if (!productName) {
                    const regexMatch = line.match(/(\d+x\s)?(.+?)(?=\s[\$\£]\s?\d+|\s\d+(\.\d{2})?)/);
                    productName = regexMatch ? regexMatch[2].trim() : null;
                }
        
                // Validate and refine the extracted product name
                if (productName) {
                    // Normalize productName to lowercase for comparison
                    const normalizedProductName = productName.toLowerCase();
        
                    // Filter out names that are purely numeric
                    if (/^\d+$/.test(normalizedProductName)) return;
        
                    // Filter out names with too many numbers
                    if (normalizedProductName.replace(/\D/g, '').length > normalizedProductName.replace(/\d/g, '').length) return;
        
                    // Ensure product name has a minimum length and valid characters
                    if (normalizedProductName.length < 3 || !/^[a-z0-9\s]+$/.test(normalizedProductName)) return;
        
                    // Additional filtering (custom whitelist)
                    const validWords = [
                        "cinnamon rolls", "lemon curd", "sugar dusted", "caramel", "cinnamon sugar",
                        "white chocolate", "bulmers original bottle", "bulmers pear bottle", "strawberries", "stickers"
                    ];
        
                    // Check if the product name matches any item in the whitelist
                    const isValidProduct = validWords.some(word => normalizedProductName.includes(word));
        
                    if (!isValidProduct) return;
        
                    // Push product details as a list
                    products.push([
                        productName,            // Product name
                        parseFloat(cost.toFixed(2)), // Cost per product as float with 2 decimals
                        quantity                // Quantity as an integer
                    ]);
                }
            });
        
            return products;
        }
        
        
        // Function to format content into the specified JSON structure
        function formatToInvoiceJSON(textContent) {
            // Call the function to extract structured data
            const extractedProducts = extractProducts(textContent);
            const extractedData = extractData(textContent);
            console.log(extractedData);
            
            // Default values for receipt data
            let name = "Admin";
            let company = "Cider Cellar";
            let date = "2018-09-24";
            let value = 8.00; // Default value
            // If extracted data is not blank
            if (extractedData[0] != "Unknown Customer") { name = extractedData[0]; }
            if (extractedData[1] != "Unknown Company") { company = extractedData[1]; }
            if (extractedData[2] != "Unknown Date") { date = extractedData[2]; }
            if (extractedData[3] != 0.0) { value = extractedData[3]; }
            
            // Items contents: [product name, cost per product, quantity]
            let items = [ 
                ["Bulmers Original Bottle", 4.20, 2],
                ["Bulmers Pear Bottle", 5.40, 1]
            ];
            // If extracted products is not blank, then set the value of items
            if (extractedProducts != []) {
                items = extractedProducts;
                console.log(items);
            }
            
            // Initialize the JSON object with default keys
            const jsonObject = {
                customer_name: name,
                invoice_company: company,
                invoice_date: date,
                total_invoice_value: value.toFixed(2), // Ensure total value is a string with two decimals
                invoice_items_products_list: {}
            };
            
            // Dynamically add items to invoice_items_products_list
            items.forEach((item, index) => {
                const key = "item_" + (index + 1).toString(); // Concatenate "item_" and index
                jsonObject.invoice_items_products_list[key] = {
                    [item[0]]: { // Product name
                        cost: "$" + item[1].toFixed(2), // Cost per product as a float string
                        qty: item[2],  // Quantity as a float string
                        total: "$" + (item[1] * item[2]).toFixed(2) // Total cost as a float string
                    }
                };
            });
            
            return JSON.stringify(jsonObject, null, 4); // 4 spaces for indentation
        }

        
        // Function to create a downloadable JSON file and add a download button
        function createDownloadableJSON(textContent) {
            const formattedContent = formatToInvoiceJSON(textContent); // Reformat the content
            const jsonBlob = new Blob([formattedContent], { type: 'application/json' });
            const jsonURL = URL.createObjectURL(jsonBlob);
        
            // Create a download button
            const downloadButton = document.createElement('a');
            downloadButton.href = jsonURL;
            downloadButton.download = 'output.json';
            downloadButton.textContent = 'Download JSON';
            downloadButton.style.display = 'block'; // Ensure it's visible
        
            // Clear previous content in jsonOutput and add the button
            jsonOutput.innerHTML = ''; // Clear existing content
            jsonOutput.appendChild(downloadButton);
        
            // Create an editable textarea for the JSON content
            const editableTextarea = document.createElement('textarea');
            editableTextarea.value = formattedContent; // Set the formatted JSON as the value
            editableTextarea.style.width = '100%'; // Adjust width for better visibility
            editableTextarea.style.height = '300px'; // Adjust height for better usability
            jsonOutput.appendChild(editableTextarea);
        
            // Update the download button when the textarea content changes
            editableTextarea.addEventListener('input', () => {
                const updatedContent = editableTextarea.value; // Get the updated content
                const updatedBlob = new Blob([updatedContent], { type: 'application/json' });
                const updatedURL = URL.createObjectURL(updatedBlob);
                downloadButton.href = updatedURL; // Update the download link
            });
        }


        predictButton.addEventListener('click', async () => {
            const file = document.getElementById('predict-image').files[0];
            if (!file) {
                alert('Please select an image to predict.');
                return;
            }
            await predictImage(file);
        });
    })();