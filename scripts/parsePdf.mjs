import fs from 'fs';
import pdf from 'pdf-parse';

async function parse() {
  const dataBuffer = fs.readFileSync('./catalog.pdf');
  
  // Custom render page to extract only some pages for testing
  function render_page(pageData) {
    let render_options = {
        normalizeWhitespace: false,
        disableCombineTextItems: false
    };
    return pageData.getTextContent(render_options)
    .then(function(textContent) {
        let lastY, text = '';
        for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY){
                text += item.str;
            } else {
                text += '\n' + item.str;
            }    
            lastY = item.transform[5];
        }
        return text;
    });
  }

  // Parse total pages
  const options = {
    max: 15, // just extract 15 pages to understand format
  };
  
  try {
    const data = await pdf(dataBuffer, options);
    console.log("Número de páginas observadas:", data.numpages);
    console.log("============== EXTRACTED TEXT ==============");
    console.log(data.text);
    console.log("============================================");
  } catch (err) {
    console.error("Error reading PDF:", err);
  }
}

parse();
