import fs from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const FILE_ID = '16d5XNoSmIelR_58EH2YrcsIJksI2FDta';
const DEST_PATH = './public/catalog.pdf';

async function downloadFile() {
  console.log('Obteniendo token de confirmación de Google Drive...');
  let res = await fetch(`https://drive.google.com/uc?export=download&id=${FILE_ID}`);
  const text = await res.text();
  
  const match = text.match(/confirm=([a-zA-Z0-9_-]+)/);
  if (!match) {
    console.log('No se encontró token, intentando descarga directa o el archivo es pequeño...');
    res = await fetch(`https://drive.google.com/uc?export=download&id=${FILE_ID}`);
  } else {
    const confirmToken = match[1];
    console.log(`Token encontrado: ${confirmToken}`);
    const cookies = res.headers.get('set-cookie');
    
    console.log('Descargando archivo pesado...');
    res = await fetch(`https://drive.google.com/uc?export=download&id=${FILE_ID}&confirm=${confirmToken}`, {
      headers: {
        'Cookie': cookies || ''
      }
    });
  }

  if (!res.ok) throw new Error(`Respuesta inesperada: ${res.statusText}`);
  
  console.log('Guardando en disco...');
  const fileStream = fs.createWriteStream(DEST_PATH);
  await pipeline(Readable.fromWeb(res.body), fileStream);
  console.log('¡Descarga completada!');
}

downloadFile().catch(console.error);
