const fs = require('fs');
const pdf = require('pdf-parse');

function render_page(pageData) {
    let render_options = {
        normalizeWhitespace: false,
        disableCombineTextItems: false
    };

    return pageData.getTextContent(render_options)
    .then(function(textContent) {
        let lastY, text = '';
        for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY) {
                text += item.str;
            } else {
                text += '\n' + item.str;
            }    
            lastY = item.transform[5];
        }
        return `\n___PAGE_${pageData.pageIndex + 1}___\n` + text;
    });
}

async function parseAll() {
  console.log("Cargando PDF y extrayendo metadatos de página...");
  const dataBuffer = fs.readFileSync('./public/catalog.pdf');
  
  let options = {
    pagerender: render_page
  }
  
  try {
    const data = await pdf(dataBuffer, options);
    console.log("Páginas analizadas:", data.numpages);
    
    let lines = data.text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    let products = [];
    let currentPage = 1;
    
    for (let i = 0; i < lines.length; i++) {
       if (lines[i].startsWith('___PAGE_')) {
           let match = lines[i].match(/___PAGE_(\d+)___/);
           if (match) {
               currentPage = parseInt(match[1]);
           }
           continue;
       }
        
       if (lines[i].startsWith('UNIDAD')) {
           let priceStr = lines[i].replace('UNIDAD', '').replace(/[$,]/g, '').trim();
           let price = parseInt(priceStr.replace(/\./g, ''));
           
           let nameParts = [];
           for(let j = i - 1; j >= Math.max(0, i - 4); j--) {
               let prevLine = lines[j];
               if (prevLine.startsWith('___PAGE_')) continue;
               if (prevLine.startsWith('MAYOR') || prevLine.startsWith('UNIDAD') || prevLine.includes('==')) break;
               if (prevLine.includes('**') || prevLine.toLowerCase().includes('agotado')) continue;
               
               if (prevLine.length > 80) break;
               
               nameParts.unshift(prevLine);
           }
           
           let name = nameParts.join(' ').trim();
           
           if (name && price && !isNaN(price) && price > 0 && price < 10000000) {
               products.push({
                   id: products.length + 1,
                   name: name,
                   price: price,
                   category: "Catálogo",
                   page: currentPage
               });
           }
       }
    }
    
    console.log(`¡Se encontraron ${products.length} productos con fotos reales mapeadas!`);
    
    const outputContent = `export const products = ${JSON.stringify(products, null, 2)};\n`;
    fs.writeFileSync('./src/data/mockData.js', outputContent);
    console.log("Datos guardados en src/data/mockData.js exitosamente.");
    
  } catch (err) {
    console.error("Error reading PDF:", err);
  }
}

parseAll();
